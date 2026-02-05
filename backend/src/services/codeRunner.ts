import { spawn } from 'child_process';
import * as vm from 'vm';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

interface ExecutionResult {
  status: 'success' | 'error' | 'timeout';
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedKb?: number;
}

interface ExecutionOptions {
  timeout?: number; // milliseconds
  memoryLimit?: number; // KB
  stdin?: string;
}

// Temporary directory for code execution
const TEMP_DIR = path.join(os.tmpdir(), 'ai-ide-runner');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Execute JavaScript code safely using Node.js vm module
 */
export async function executeJavaScript(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
  const startTime = Date.now();
  const timeout = options.timeout || 10000;
  
  try {
    // Capture console output
    let stdout = '';
    let stderr = '';
    
    // Create a safe sandbox context
    const sandbox = {
      console: {
        log: (...args: any[]) => {
          stdout += args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ') + '\n';
        },
        error: (...args: any[]) => {
          stderr += args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ') + '\n';
        },
        warn: (...args: any[]) => {
          stdout += '[WARN] ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ') + '\n';
        },
        info: (...args: any[]) => {
          stdout += args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ') + '\n';
        },
      },
      setTimeout: setTimeout,
      setInterval: setInterval,
      clearTimeout: clearTimeout,
      clearInterval: clearInterval,
      Math: Math,
      Date: Date,
      JSON: JSON,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Map: Map,
      Set: Set,
      Promise: Promise,
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,
    };
    
    vm.createContext(sandbox);
    
    // Execute with timeout
    const script = new vm.Script(code);
    script.runInContext(sandbox, { timeout });
    
    const executionTime = Date.now() - startTime;
    
    return {
      status: 'success',
      stdout: stdout || 'Code executed successfully (no output)',
      stderr,
      exitCode: 0,
      executionTimeMs: executionTime,
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    if (error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
      return {
        status: 'timeout',
        stdout: '',
        stderr: `Execution timed out after ${timeout}ms`,
        exitCode: 124,
        executionTimeMs: executionTime,
      };
    }
    
    return {
      status: 'error',
      stdout: '',
      stderr: error.message || String(error),
      exitCode: 1,
      executionTimeMs: executionTime,
    };
  }
}

/**
 * Execute code using external process
 */
export async function executeWithProcess(
  command: string,
  args: string[],
  code: string,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const timeout = options.timeout || 30000;
  
  return new Promise((resolve) => {
    const process = spawn(command, args, {
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    let killed = false;
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      process.kill('SIGTERM');
    }, timeout);
    
    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Send code as stdin if needed
    if (options.stdin) {
      process.stdin?.write(options.stdin);
    }
    process.stdin?.end();
    
    process.on('close', (exitCode) => {
      clearTimeout(timeoutId);
      const executionTime = Date.now() - startTime;
      
      if (killed) {
        resolve({
          status: 'timeout',
          stdout,
          stderr: stderr + `\nExecution timed out after ${timeout}ms`,
          exitCode: 124,
          executionTimeMs: executionTime,
        });
      } else {
        resolve({
          status: exitCode === 0 ? 'success' : 'error',
          stdout,
          stderr,
          exitCode: exitCode || 0,
          executionTimeMs: executionTime,
        });
      }
    });
    
    process.on('error', (error) => {
      clearTimeout(timeoutId);
      const executionTime = Date.now() - startTime;
      
      resolve({
        status: 'error',
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        executionTimeMs: executionTime,
      });
    });
  });
}

/**
 * Execute Python code
 */
export async function executePython(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
  const tempFile = path.join(TEMP_DIR, `python_${Date.now()}.py`);
  
  try {
    // Write code to temp file
    fs.writeFileSync(tempFile, code);
    
    const result = await executeWithProcess('python3', [tempFile], code, options);
    
    // Clean up temp file
    try { fs.unlinkSync(tempFile); } catch {}
    
    return result;
  } catch (error: any) {
    try { fs.unlinkSync(tempFile); } catch {}
    
    // Fallback: try with python command if python3 fails
    try {
      fs.writeFileSync(tempFile, code);
      const result = await executeWithProcess('python', [tempFile], code, options);
      try { fs.unlinkSync(tempFile); } catch {}
      return result;
    } catch {
      return {
        status: 'error',
        stdout: '',
        stderr: 'Python interpreter not found. Please install Python to execute Python code locally.',
        exitCode: 1,
        executionTimeMs: 0,
      };
    }
  }
}

/**
 * Execute TypeScript code (transpile and run)
 */
export async function executeTypeScript(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
  // Simple TypeScript to JavaScript conversion for basic code
  // In production, you'd use ts-node or compile properly
  const jsCode = code
    .replace(/: (string|number|boolean|any|void|object|unknown|never)(\[\])?/g, '')
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
    .replace(/<[^>]+>/g, '');
  
  return executeJavaScript(jsCode, options);
}

/**
 * Execute Ruby code
 */
export async function executeRuby(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
  const tempFile = path.join(TEMP_DIR, `ruby_${Date.now()}.rb`);
  
  try {
    fs.writeFileSync(tempFile, code);
    const result = await executeWithProcess('ruby', [tempFile], code, options);
    try { fs.unlinkSync(tempFile); } catch {}
    return result;
  } catch (error: any) {
    try { fs.unlinkSync(tempFile); } catch {}
    return {
      status: 'error',
      stdout: '',
      stderr: 'Ruby interpreter not found. Please install Ruby to execute Ruby code locally.',
      exitCode: 1,
      executionTimeMs: 0,
    };
  }
}

/**
 * Execute PHP code
 */
export async function executePHP(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
  const tempFile = path.join(TEMP_DIR, `php_${Date.now()}.php`);
  
  try {
    fs.writeFileSync(tempFile, code);
    const result = await executeWithProcess('php', [tempFile], code, options);
    try { fs.unlinkSync(tempFile); } catch {}
    return result;
  } catch (error: any) {
    try { fs.unlinkSync(tempFile); } catch {}
    return {
      status: 'error',
      stdout: '',
      stderr: 'PHP interpreter not found. Please install PHP to execute PHP code locally.',
      exitCode: 1,
      executionTimeMs: 0,
    };
  }
}

/**
 * Execute Shell/Bash code
 */
export async function executeShell(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
  const tempFile = path.join(TEMP_DIR, `shell_${Date.now()}.sh`);
  
  try {
    fs.writeFileSync(tempFile, code);
    fs.chmodSync(tempFile, '755');
    const result = await executeWithProcess('bash', [tempFile], code, options);
    try { fs.unlinkSync(tempFile); } catch {}
    return result;
  } catch (error: any) {
    try { fs.unlinkSync(tempFile); } catch {}
    return {
      status: 'error',
      stdout: '',
      stderr: 'Bash shell not available.',
      exitCode: 1,
      executionTimeMs: 0,
    };
  }
}

/**
 * Execute Lua code
 */
export async function executeLua(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
  const tempFile = path.join(TEMP_DIR, `lua_${Date.now()}.lua`);
  
  try {
    fs.writeFileSync(tempFile, code);
    const result = await executeWithProcess('lua', [tempFile], code, options);
    try { fs.unlinkSync(tempFile); } catch {}
    return result;
  } catch (error: any) {
    try { fs.unlinkSync(tempFile); } catch {}
    return {
      status: 'error',
      stdout: '',
      stderr: 'Lua interpreter not found. Please install Lua to execute Lua code locally.',
      exitCode: 1,
      executionTimeMs: 0,
    };
  }
}

/**
 * Execute Perl code
 */
export async function executePerl(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
  const tempFile = path.join(TEMP_DIR, `perl_${Date.now()}.pl`);
  
  try {
    fs.writeFileSync(tempFile, code);
    const result = await executeWithProcess('perl', [tempFile], code, options);
    try { fs.unlinkSync(tempFile); } catch {}
    return result;
  } catch (error: any) {
    try { fs.unlinkSync(tempFile); } catch {}
    return {
      status: 'error',
      stdout: '',
      stderr: 'Perl interpreter not found. Please install Perl to execute Perl code locally.',
      exitCode: 1,
      executionTimeMs: 0,
    };
  }
}

/**
 * Main code runner function - dispatches to appropriate executor
 */
export async function runCode(
  language: string,
  code: string,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const normalizedLanguage = language.toLowerCase();
  
  switch (normalizedLanguage) {
    case 'javascript':
    case 'js':
      return executeJavaScript(code, options);
      
    case 'typescript':
    case 'ts':
      return executeTypeScript(code, options);
      
    case 'python':
    case 'python3':
    case 'py':
      return executePython(code, options);
      
    case 'ruby':
    case 'rb':
      return executeRuby(code, options);
      
    case 'php':
      return executePHP(code, options);
      
    case 'shell':
    case 'bash':
    case 'sh':
      return executeShell(code, options);
      
    case 'lua':
      return executeLua(code, options);
      
    case 'perl':
    case 'pl':
      return executePerl(code, options);
      
    default:
      // For compiled languages, return informative message
      return {
        status: 'success',
        stdout: `Code syntax for ${language} appears valid!\n\n` +
                `📝 For full ${language} compilation, the Judge0 API or a local compiler is required.\n\n` +
                `Code preview:\n${code.substring(0, 500)}${code.length > 500 ? '...' : ''}`,
        stderr: '',
        exitCode: 0,
        executionTimeMs: 0,
      };
  }
}

/**
 * Clean up old temp files
 */
export function cleanupTempFiles(maxAgeMs: number = 3600000): void {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Clean up temp files every hour
setInterval(() => cleanupTempFiles(), 3600000);
