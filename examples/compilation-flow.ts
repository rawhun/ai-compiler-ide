// Compilation Flow Examples using Judge0 API

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { redis } from '../cache/redis';
import { logger } from '../utils/logger';

// Judge0 API Configuration
const JUDGE0_CONFIG = {
  baseURL: process.env.JUDGE0_URL || 'http://judge0:2358',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Language configurations for Judge0
const LANGUAGE_CONFIGS = {
  javascript: {
    id: 63, // Node.js 12.14.0
    extension: '.js',
    template: `// JavaScript Template
console.log("Hello, World!");`,
    compileCommand: null, // Interpreted language
    runCommand: 'node',
  },
  typescript: {
    id: 74, // TypeScript 3.7.4
    extension: '.ts',
    template: `// TypeScript Template
const message: string = "Hello, World!";
console.log(message);`,
    compileCommand: 'tsc',
    runCommand: 'node',
  },
  python: {
    id: 71, // Python 3.8.1
    extension: '.py',
    template: `# Python Template
print("Hello, World!")`,
    compileCommand: null, // Interpreted language
    runCommand: 'python3',
  },
  cpp: {
    id: 54, // C++ (GCC 9.2.0)
    extension: '.cpp',
    template: `// C++ Template
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
    compileCommand: 'g++',
    runCommand: './a.out',
  },
  c: {
    id: 50, // C (GCC 9.2.0)
    extension: '.c',
    template: `// C Template
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
    compileCommand: 'gcc',
    runCommand: './a.out',
  },
  java: {
    id: 62, // Java (OpenJDK 13.0.1)
    extension: '.java',
    template: `// Java Template
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
    compileCommand: 'javac',
    runCommand: 'java Main',
  },
};

export interface CompilationRequest {
  workspaceId: string;
  language: string;
  sourceFiles: Array<{
    path: string;
    content: string;
  }>;
  compilerOptions?: {
    flags?: string;
    optimizationLevel?: string;
    debugInfo?: boolean;
  };
  input?: string; // stdin for program execution
}

export interface CompilationResult {
  jobId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout';
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  exitCode?: number;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  createdAt: Date;
  completedAt?: Date;
}

export class CompilationService {
  /**
   * Submit a compilation job
   */
  static async submitCompilation(
    userId: string,
    request: CompilationRequest
  ): Promise<CompilationResult> {
    const jobId = uuidv4();
    
    try {
      // Validate request
      await this.validateCompilationRequest(request);
      
      // Check user permissions for workspace
      await this.checkWorkspacePermissions(userId, request.workspaceId);
      
      // Get language configuration
      const langConfig = LANGUAGE_CONFIGS[request.language as keyof typeof LANGUAGE_CONFIGS];
      if (!langConfig) {
        throw new Error(`Unsupported language: ${request.language}`);
      }

      // Create compilation job record
      const compilationJob = await this.createCompilationJob(jobId, userId, request);
      
      // Prepare source code for Judge0
      const sourceCode = this.prepareSourceCode(request.sourceFiles, request.language);
      
      // Submit to Judge0
      const judge0Token = await this.submitToJudge0(
        langConfig,
        sourceCode,
        request.compilerOptions,
        request.input
      );
      
      // Update job with Judge0 token
      await this.updateJobMetadata(jobId, { judge0_token: judge0Token });
      
      // Start background polling for results
      this.pollJudge0Results(jobId, judge0Token);
      
      return {
        jobId,
        status: 'pending',
        createdAt: compilationJob.created_at,
      };
      
    } catch (error) {
      logger.error('Compilation submission failed:', error);
      
      // Update job status to error
      await this.updateJobStatus(jobId, 'error', {
        stderr: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }

  /**
   * Get compilation job status
   */
  static async getCompilationStatus(
    userId: string,
    jobId: string
  ): Promise<CompilationResult | null> {
    try {
      // Try cache first
      const cached = await redis.get(`compilation:${jobId}`);
      if (cached) {
        const result = JSON.parse(cached);
        // Verify user owns this job
        if (result.user_id === userId) {
          return this.formatCompilationResult(result);
        }
      }

      // Get from database
      const job = await db('compilation_jobs')
        .where({ id: jobId, user_id: userId })
        .first();

      if (!job) {
        return null;
      }

      // Cache the result
      await redis.setex(`compilation:${jobId}`, 3600, JSON.stringify(job));

      return this.formatCompilationResult(job);
      
    } catch (error) {
      logger.error('Failed to get compilation status:', error);
      return null;
    }
  }

  /**
   * Execute a compiled program with different input
   */
  static async executeProgram(
    userId: string,
    jobId: string,
    input: string
  ): Promise<any> {
    try {
      // Get successful compilation job
      const job = await db('compilation_jobs')
        .where({ 
          id: jobId, 
          user_id: userId, 
          status: 'success' 
        })
        .first();

      if (!job) {
        throw new Error('Successful compilation job not found');
      }

      const metadata = JSON.parse(job.metadata || '{}');
      const sourceFiles = JSON.parse(job.source_files);
      const langConfig = LANGUAGE_CONFIGS[job.language as keyof typeof LANGUAGE_CONFIGS];

      // For interpreted languages, we can re-run with different input
      const sourceCode = this.prepareSourceCode(sourceFiles, job.language);
      
      // Submit execution to Judge0
      const response = await axios.post(`${JUDGE0_CONFIG.baseURL}/submissions`, {
        language_id: langConfig.id,
        source_code: sourceCode,
        stdin: input,
        cpu_time_limit: 5, // 5 seconds
        memory_limit: 128000, // 128MB in KB
        wall_time_limit: 10, // 10 seconds
      }, {
        ...JUDGE0_CONFIG,
        params: { base64_encoded: false, wait: true }
      });

      const result = response.data;

      // Create execution job record
      const executionJob = await db('execution_jobs').insert({
        compilation_job_id: jobId,
        stdin: input,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exit_code: result.status?.id === 3 ? 0 : result.status?.id || -1,
        execution_time_ms: Math.round((result.time || 0) * 1000),
        memory_used_kb: result.memory || 0,
        status: result.status?.id === 3 ? 'success' : 'error',
        completed_at: new Date(),
      }).returning('*');

      return {
        executionId: executionJob[0].id,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.status?.id === 3 ? 0 : result.status?.id || -1,
        executionTimeMs: Math.round((result.time || 0) * 1000),
        memoryUsedKb: result.memory || 0,
        status: result.status?.id === 3 ? 'success' : 'error',
      };

    } catch (error) {
      logger.error('Program execution failed:', error);
      throw error;
    }
  }

  /**
   * Get user's compilation history
   */
  static async getCompilationHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<CompilationResult[]> {
    try {
      const jobs = await db('compilation_jobs')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return jobs.map(this.formatCompilationResult);
      
    } catch (error) {
      logger.error('Failed to get compilation history:', error);
      return [];
    }
  }

  // Private helper methods

  private static async validateCompilationRequest(request: CompilationRequest): Promise<void> {
    if (!request.workspaceId) {
      throw new Error('Workspace ID is required');
    }

    if (!request.language) {
      throw new Error('Language is required');
    }

    if (!request.sourceFiles || request.sourceFiles.length === 0) {
      throw new Error('At least one source file is required');
    }

    // Check file size limits
    const totalSize = request.sourceFiles.reduce(
      (sum, file) => sum + file.content.length,
      0
    );

    if (totalSize > 1024 * 1024) { // 1MB limit
      throw new Error('Source code size exceeds 1MB limit');
    }

    // Check for potentially malicious code patterns
    await this.scanForMaliciousCode(request.sourceFiles);
  }

  private static async checkWorkspacePermissions(
    userId: string,
    workspaceId: string
  ): Promise<void> {
    const workspace = await db('workspaces')
      .where({ id: workspaceId })
      .first();

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Check if user owns workspace or has access
    const hasAccess = workspace.user_id === userId ||
      await db('workspace_shares')
        .where({
          workspace_id: workspaceId,
          shared_with_user_id: userId,
          permission_level: 'write'
        })
        .first();

    if (!hasAccess) {
      throw new Error('Access denied to workspace');
    }
  }

  private static async createCompilationJob(
    jobId: string,
    userId: string,
    request: CompilationRequest
  ): Promise<any> {
    const [job] = await db('compilation_jobs')
      .insert({
        id: jobId,
        user_id: userId,
        workspace_id: request.workspaceId,
        language: request.language,
        source_files: JSON.stringify(request.sourceFiles),
        compiler_options: JSON.stringify(request.compilerOptions || {}),
        status: 'pending',
      })
      .returning('*');

    return job;
  }

  private static prepareSourceCode(
    sourceFiles: Array<{ path: string; content: string }>,
    language: string
  ): string {
    if (sourceFiles.length === 1) {
      return sourceFiles[0].content;
    }

    // For multiple files, handle based on language
    switch (language) {
      case 'cpp':
      case 'c':
        // Concatenate C/C++ files with include guards
        return sourceFiles
          .map(file => `// File: ${file.path}\n${file.content}`)
          .join('\n\n');

      case 'java':
        // For Java, find the main class
        const mainFile = sourceFiles.find(f => 
          f.content.includes('public static void main') ||
          f.path.toLowerCase().includes('main')
        );
        return mainFile ? mainFile.content : sourceFiles[0].content;

      case 'python':
        // Concatenate Python files
        return sourceFiles
          .map(file => `# File: ${file.path}\n${file.content}`)
          .join('\n\n');

      default:
        // Default: concatenate all files
        return sourceFiles
          .map(file => `// File: ${file.path}\n${file.content}`)
          .join('\n\n');
    }
  }

  private static async submitToJudge0(
    langConfig: any,
    sourceCode: string,
    compilerOptions?: any,
    input?: string
  ): Promise<string> {
    try {
      const response = await axios.post(`${JUDGE0_CONFIG.baseURL}/submissions`, {
        language_id: langConfig.id,
        source_code: sourceCode,
        stdin: input || '',
        expected_output: null,
        cpu_time_limit: 5, // 5 seconds
        memory_limit: 128000, // 128MB in KB
        wall_time_limit: 10, // 10 seconds
        compiler_options: compilerOptions?.flags || '',
      }, {
        ...JUDGE0_CONFIG,
        params: { base64_encoded: false, wait: false }
      });

      return response.data.token;
      
    } catch (error) {
      logger.error('Judge0 submission failed:', error);
      throw new Error('Failed to submit compilation job');
    }
  }

  private static async pollJudge0Results(jobId: string, judge0Token: string): Promise<void> {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;

        const response = await axios.get(
          `${JUDGE0_CONFIG.baseURL}/submissions/${judge0Token}`,
          {
            ...JUDGE0_CONFIG,
            params: { base64_encoded: false }
          }
        );

        const result = response.data;

        // Check if processing is complete
        if (result.status?.id <= 2) {
          // Still processing (In Queue = 1, Processing = 2)
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000); // Poll again in 1 second
            return;
          } else {
            // Timeout
            await this.updateJobStatus(jobId, 'timeout', {
              stderr: 'Compilation timed out after 30 seconds',
            });
            return;
          }
        }

        // Processing complete
        const status = result.status?.id === 3 ? 'success' : 'error';
        
        await this.updateJobStatus(jobId, status, {
          stdout: result.stdout || '',
          stderr: result.stderr || result.compile_output || '',
          exit_code: result.status?.id === 3 ? 0 : result.status?.id || -1,
          execution_time_ms: Math.round((result.time || 0) * 1000),
          memory_used_kb: result.memory || 0,
        });

      } catch (error) {
        logger.error('Judge0 polling error:', error);
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          await this.updateJobStatus(jobId, 'error', {
            stderr: 'Failed to get compilation results',
          });
        }
      }
    };

    // Start polling after 1 second
    setTimeout(poll, 1000);
  }

  private static async updateJobStatus(
    jobId: string,
    status: string,
    updates: any
  ): Promise<void> {
    try {
      const updateData = {
        status,
        ...updates,
        completed_at: new Date(),
      };

      await db('compilation_jobs')
        .where({ id: jobId })
        .update(updateData);

      // Update cache
      const job = await db('compilation_jobs')
        .where({ id: jobId })
        .first();

      if (job) {
        await redis.setex(`compilation:${jobId}`, 3600, JSON.stringify(job));
      }

    } catch (error) {
      logger.error('Failed to update job status:', error);
    }
  }

  private static async updateJobMetadata(jobId: string, metadata: any): Promise<void> {
    try {
      await db('compilation_jobs')
        .where({ id: jobId })
        .update({
          metadata: JSON.stringify(metadata),
        });
    } catch (error) {
      logger.error('Failed to update job metadata:', error);
    }
  }

  private static formatCompilationResult(job: any): CompilationResult {
    return {
      jobId: job.id,
      status: job.status,
      stdout: job.stdout,
      stderr: job.stderr,
      exitCode: job.exit_code,
      executionTimeMs: job.execution_time_ms,
      memoryUsedKb: job.memory_used_kb,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    };
  }

  private static async scanForMaliciousCode(
    sourceFiles: Array<{ path: string; content: string }>
  ): Promise<void> {
    // Basic malicious code patterns to detect
    const maliciousPatterns = [
      /system\s*\(/i,           // System calls
      /exec\s*\(/i,             // Exec calls
      /eval\s*\(/i,             // Eval calls
      /import\s+os/i,           // OS imports
      /subprocess/i,            // Subprocess
      /__import__/i,            // Dynamic imports
      /file\s*\(/i,             // File operations
      /open\s*\(/i,             // File open
      /socket/i,                // Network operations
      /urllib/i,                // URL operations
      /requests/i,              // HTTP requests
    ];

    for (const file of sourceFiles) {
      for (const pattern of maliciousPatterns) {
        if (pattern.test(file.content)) {
          logger.warn(`Potentially malicious code detected in ${file.path}`);
          // In production, you might want to block or flag for review
          // For now, we'll just log it
        }
      }
    }
  }
}

// Usage Examples:

// Submit compilation
/*
const result = await CompilationService.submitCompilation('user-123', {
  workspaceId: 'workspace-456',
  language: 'python',
  sourceFiles: [
    {
      path: 'main.py',
      content: 'print("Hello, World!")'
    }
  ],
  compilerOptions: {
    flags: '-O2',
    debugInfo: false
  }
});

console.log('Compilation submitted:', result.jobId);
*/

// Check compilation status
/*
const status = await CompilationService.getCompilationStatus('user-123', 'job-789');
console.log('Compilation status:', status);
*/

// Execute with different input
/*
const execution = await CompilationService.executeProgram(
  'user-123',
  'job-789',
  'Alice\nBob\nCharlie'
);
console.log('Execution result:', execution);
*/

// Get compilation history
/*
const history = await CompilationService.getCompilationHistory('user-123', 10, 0);
console.log('Recent compilations:', history);
*/