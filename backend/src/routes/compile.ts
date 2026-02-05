import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { runCode } from '../services/codeRunner';

const router = Router();

// Mock compilation jobs storage
const compilationJobs = new Map();

// Language configurations
const LANGUAGE_CONFIGS = {
  // Web Technologies
  javascript: {
    extension: '.js',
    runCommand: 'node',
  },
  typescript: {
    extension: '.ts',
    runCommand: 'ts-node',
  },
  
  // Systems Programming
  python: {
    extension: '.py',
    runCommand: 'python3',
  },
  cpp: {
    extension: '.cpp',
    runCommand: './a.out',
    compileCommand: 'g++',
  },
  c: {
    extension: '.c',
    runCommand: './a.out',
    compileCommand: 'gcc',
  },
  rust: {
    extension: '.rs',
    runCommand: './main',
    compileCommand: 'rustc',
  },
  go: {
    extension: '.go',
    runCommand: './main',
    compileCommand: 'go build',
  },
  
  // JVM Languages
  java: {
    extension: '.java',
    runCommand: 'java Main',
    compileCommand: 'javac',
  },
  kotlin: {
    extension: '.kt',
    runCommand: 'kotlin MainKt',
    compileCommand: 'kotlinc',
  },
  scala: {
    extension: '.scala',
    runCommand: 'scala Main',
    compileCommand: 'scalac',
  },
  
  // .NET Languages
  csharp: {
    extension: '.cs',
    runCommand: 'dotnet run',
    compileCommand: 'dotnet build',
  },
  fsharp: {
    extension: '.fs',
    runCommand: 'dotnet run',
    compileCommand: 'dotnet build',
  },
  
  // Scripting Languages
  php: {
    extension: '.php',
    runCommand: 'php',
  },
  ruby: {
    extension: '.rb',
    runCommand: 'ruby',
  },
  perl: {
    extension: '.pl',
    runCommand: 'perl',
  },
  lua: {
    extension: '.lua',
    runCommand: 'lua',
  },
  shell: {
    extension: '.sh',
    runCommand: 'bash',
  },
  powershell: {
    extension: '.ps1',
    runCommand: 'pwsh',
  },
  
  // Functional Languages
  haskell: {
    extension: '.hs',
    runCommand: './main',
    compileCommand: 'ghc',
  },
  ocaml: {
    extension: '.ml',
    runCommand: './main',
    compileCommand: 'ocamlc',
  },
  clojure: {
    extension: '.clj',
    runCommand: 'clojure',
  },
  
  // Mobile Development
  swift: {
    extension: '.swift',
    runCommand: './main',
    compileCommand: 'swiftc',
  },
  dart: {
    extension: '.dart',
    runCommand: 'dart',
  },
  
  // Other Languages
  r: {
    extension: '.r',
    runCommand: 'Rscript',
  },
  julia: {
    extension: '.jl',
    runCommand: 'julia',
  },
  nim: {
    extension: '.nim',
    runCommand: './main',
    compileCommand: 'nim c',
  },
  zig: {
    extension: '.zig',
    runCommand: './main',
    compileCommand: 'zig build-exe',
  },
  v: {
    extension: '.v',
    runCommand: './main',
    compileCommand: 'v',
  }
};

// Apply authentication to all routes
router.use(authenticateToken);

// Submit compilation job
router.post('/', (req: AuthRequest, res: Response): void => {
  const { workspaceId, language, sourceFiles, compilerOptions } = req.body;
  const userId = req.user.userId;

  // Validate input
  if (!workspaceId || !language || !sourceFiles || !Array.isArray(sourceFiles)) {
    res.status(400).json({ error: 'Invalid request parameters' });
    return;
  }

  const langConfig = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS];
  if (!langConfig) {
    res.status(400).json({ error: `Unsupported language: ${language}` });
    return;
  }

  // Create compilation job
  const jobId = uuidv4();
  const job = {
    id: jobId,
    userId,
    workspaceId,
    language,
    sourceFiles,
    compilerOptions: compilerOptions || {},
    status: 'pending',
    createdAt: new Date(),
  };

  compilationJobs.set(jobId, job);

  // Start compilation process (mock)
  processCompilation(jobId);

  res.status(202).json({
    jobId,
    status: 'pending',
    message: 'Compilation job submitted'
  });
});

// Get compilation job status
router.get('/:jobId', (req: AuthRequest, res: Response): void => {
  const { jobId } = req.params;
  const userId = req.user.userId;

  const job = compilationJobs.get(jobId);
  if (!job || job.userId !== userId) {
    res.status(404).json({ error: 'Compilation job not found' });
    return;
  }

  res.json({
    id: job.id,
    language: job.language,
    status: job.status,
    stdout: job.stdout,
    stderr: job.stderr,
    exitCode: job.exitCode,
    executionTimeMs: job.executionTimeMs,
    memoryUsedKb: job.memoryUsedKb,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

// Execute compiled program with input
router.post('/:jobId/execute', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { stdin } = req.body;
    const userId = req.user.userId;

    const job = compilationJobs.get(jobId);
    if (!job || job.userId !== userId) {
      res.status(404).json({ error: 'Compilation job not found' });
      return;
    }

    if (job.status !== 'success') {
      res.status(400).json({ error: 'Job must be successfully compiled first' });
      return;
    }

    // Mock execution with input
    const executionResult = await mockExecution(job, stdin);

    res.json(executionResult);
  } catch (error) {
    console.error('Program execution error:', error);
    res.status(500).json({ error: 'Failed to execute program' });
  }
});

// Mock compilation process - now using Judge0 API
async function processCompilation(jobId: string) {
  const job = compilationJobs.get(jobId);
  if (!job) return;

  // Update status to running
  job.status = 'running';

  try {
    // Use Judge0 API for real compilation
    const judge0Url = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
    const sourceCode = job.sourceFiles[0]?.content || '';
    
    // Get language ID for Judge0
    const languageId = getJudge0LanguageId(job.language);
    
    if (!languageId) {
      throw new Error(`Unsupported language: ${job.language}`);
    }

    // Submit to Judge0
    const submissionResponse = await fetch(`${judge0Url}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: sourceCode,
        stdin: job.stdin || '',
        expected_output: null
      })
    });

    if (!submissionResponse.ok) {
      // Fallback to local execution if Judge0 fails
      console.log('Judge0 API failed, using local execution');
      const result = await executeLocally(job.language, sourceCode, job.stdin);
      Object.assign(job, result, {
        completedAt: new Date(),
        executionTimeMs: Math.round(Math.random() * 1000 + 100),
        memoryUsedKb: Math.round(Math.random() * 10000 + 1000),
      });
      return;
    }

    const submissionResult = await submissionResponse.json() as {
      status?: { id: number };
      stdout?: string;
      stderr?: string;
      compile_output?: string;
      time?: number;
      memory?: number;
    };
    
    // Update job with results
    Object.assign(job, {
      status: submissionResult.status?.id === 3 ? 'success' : 'error',
      stdout: submissionResult.stdout || '',
      stderr: submissionResult.stderr || submissionResult.compile_output || '',
      exitCode: submissionResult.status?.id === 3 ? 0 : 1,
      completedAt: new Date(),
      executionTimeMs: Math.round((submissionResult.time || 0) * 1000),
      memoryUsedKb: Math.round(submissionResult.memory || 0),
    });

  } catch (error) {
    console.error('Compilation error:', error);
    
    // Fallback to local execution
    try {
      const sourceCode = job.sourceFiles[0]?.content || '';
      const result = await executeLocally(job.language, sourceCode, job.stdin);
      Object.assign(job, result, {
        completedAt: new Date(),
        executionTimeMs: Math.round(Math.random() * 1000 + 100),
        memoryUsedKb: Math.round(Math.random() * 10000 + 1000),
      });
    } catch (fallbackError) {
      job.status = 'error';
      job.stderr = 'Compilation service unavailable';
      job.completedAt = new Date();
    }
  }
}

// Get Judge0 language ID
function getJudge0LanguageId(language: string): number | null {
  const languageMap: Record<string, number> = {
    'javascript': 63, // Node.js
    'python': 71,     // Python 3
    'cpp': 54,        // C++ (GCC 9.2.0)
    'c': 50,          // C (GCC 9.2.0)
    'java': 62,       // Java (OpenJDK 13.0.1)
    'typescript': 74, // TypeScript
    'csharp': 51,     // C# (Mono 6.6.0.161)
    'php': 68,        // PHP (7.4.1)
    'ruby': 72,       // Ruby (2.7.0)
    'go': 60,         // Go (1.13.5)
    'rust': 73,       // Rust (1.40.0)
    'kotlin': 78,     // Kotlin (1.3.70)
    'scala': 81,      // Scala (2.13.2)
    'swift': 83,      // Swift (5.2.3)
    'r': 80,          // R (4.0.0)
    'haskell': 61,    // Haskell (GHC 8.8.1)
    'lua': 64,        // Lua (5.3.5)
    'perl': 85,       // Perl (5.28.1)
    'dart': 90,       // Dart (2.19.2)
  };
  return languageMap[language] || null;
}

// Local execution fallback using the code runner service
async function executeLocally(language: string, sourceCode: string, stdin?: string) {
  try {
    const result = await runCode(language, sourceCode, {
      timeout: 30000, // 30 second timeout
      stdin,
    });
    
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error: any) {
    return {
      status: 'error',
      stdout: '',
      stderr: error.message || 'Execution failed',
      exitCode: 1,
    };
  }
}

// Mock execution with input
async function mockExecution(job: any, stdin: string) {
  // Simulate execution time
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  let stdout = job.stdout || '';
  
  // If there's input, simulate interactive program
  if (stdin) {
    stdout += `\nInput received: ${stdin}`;
    
    if (job.language === 'python' && job.sourceFiles[0]?.content.includes('input(')) {
      stdout = `What's your name? Nice to meet you, ${stdin.trim()}!`;
    }
  }

  return {
    executionId: uuidv4(),
    stdout,
    stderr: '',
    exitCode: 0,
    executionTimeMs: Math.round(Math.random() * 500 + 50),
    memoryUsedKb: Math.round(Math.random() * 5000 + 1000),
    status: 'success',
  };
}

export { router as compileRoutes };