import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Mock workspace storage
const workspaces = new Map();

// Apply authentication to all routes
router.use(authenticateToken);

// Get user workspaces
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const userWorkspaces = Array.from(workspaces.values()).filter(
      (workspace: any) => workspace.userId === userId
    );

    res.json({ workspaces: userWorkspaces });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to get workspaces' });
  }
});

// Create new workspace
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, language, description } = req.body;
    const userId = req.user.userId;

    if (!name || !language) {
      res.status(400).json({ error: 'Name and language are required' });
      return;
    }

    const workspaceId = uuidv4();
    
    // Create default files based on language
    const defaultFiles = createDefaultFiles(language);
    
    const workspace = {
      id: workspaceId,
      name,
      language,
      description: description || '',
      userId,
      files: defaultFiles,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    workspaces.set(workspaceId, workspace);

    res.status(201).json({ workspace });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get specific workspace
router.get('/:workspaceId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.userId;

    const workspace = workspaces.get(workspaceId);
    if (!workspace || workspace.userId !== userId) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Update last accessed time
    workspace.lastAccessedAt = new Date().toISOString();

    res.json({ workspace });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
});

// Update workspace
router.put('/:workspaceId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.userId;

    const workspace = workspaces.get(workspaceId);
    if (!workspace || workspace.userId !== userId) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    workspace.lastAccessedAt = new Date().toISOString();

    res.json({ workspace });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Delete workspace
router.delete('/:workspaceId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.userId;

    const workspace = workspaces.get(workspaceId);
    if (!workspace || workspace.userId !== userId) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    workspaces.delete(workspaceId);

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Get workspace files
router.get('/:workspaceId/files', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.userId;

    const workspace = workspaces.get(workspaceId);
    if (!workspace || workspace.userId !== userId) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Return files in the expected format
    res.json(workspace.files || []);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Create or update file
router.put('/:workspaceId/files/:filePath(*)', (req: AuthRequest, res: Response): void => {
  const { workspaceId, filePath } = req.params;
  const { content } = req.body;
  const userId = req.user.userId;

  const workspace = workspaces.get(workspaceId);
  if (!workspace || workspace.userId !== userId) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const existingFileIndex = workspace.files.findIndex((f: any) => f.path === filePath);
  const fileData = {
    id: existingFileIndex >= 0 ? workspace.files[existingFileIndex].id : uuidv4(),
    path: filePath,
    content: content || '',
    language: getLanguageFromPath(filePath),
    isModified: false,
    createdAt: existingFileIndex >= 0 ? workspace.files[existingFileIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingFileIndex >= 0) {
    workspace.files[existingFileIndex] = fileData;
  } else {
    workspace.files.push(fileData);
  }

  workspace.lastAccessedAt = new Date().toISOString();

  res.json({ file: fileData });
});

// Get specific file content
router.get('/:workspaceId/files/:filePath(*)', (req: AuthRequest, res: Response): void => {
  const { workspaceId, filePath } = req.params;
  const userId = req.user.userId;

  const workspace = workspaces.get(workspaceId);
  if (!workspace || workspace.userId !== userId) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const file = workspace.files.find((f: any) => f.path === filePath);
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.json(file.content);
});

// Delete file
router.delete('/:workspaceId/files/:filePath(*)', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, filePath } = req.params;
    const userId = req.user.userId;

    const workspace = workspaces.get(workspaceId);
    if (!workspace || workspace.userId !== userId) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    workspace.files = workspace.files.filter((f: any) => f.path !== filePath);
    workspace.lastAccessedAt = new Date().toISOString();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    // Web Technologies
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    
    // Systems Programming
    'py': 'python',
    'cpp': 'cpp',
    'c': 'c',
    'rs': 'rust',
    'go': 'go',
    
    // JVM Languages
    'java': 'java',
    'kt': 'kotlin',
    'scala': 'scala',
    
    // .NET Languages
    'cs': 'csharp',
    'fs': 'fsharp',
    'vb': 'vb',
    
    // Scripting Languages
    'php': 'php',
    'rb': 'ruby',
    'pl': 'perl',
    'lua': 'lua',
    'sh': 'shell',
    'ps1': 'powershell',
    
    // Functional Languages
    'hs': 'haskell',
    'ml': 'ocaml',
    'clj': 'clojure',
    
    // Data & Config
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    
    // Documentation
    'md': 'markdown',
    'txt': 'plaintext',
    'rst': 'restructuredtext',
    
    // Database
    'sql': 'sql',
    
    // Mobile Development
    'swift': 'swift',
    'm': 'objective-c',
    'dart': 'dart',
    
    // Other Languages
    'r': 'r',
    'jl': 'julia',
    'nim': 'nim',
    'zig': 'zig',
    'v': 'v'
  };
  return languageMap[ext || ''] || 'plaintext';
}

function createDefaultFiles(language: string) {
  const templates = {
    // Web Technologies
    javascript: [
      {
        id: uuidv4(),
        path: 'index.js',
        content: `// Welcome to AI Compiler IDE!
// This is a JavaScript workspace with AI assistance

function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

function main() {
    console.log("Hello, World!");
    console.log("Fibonacci sequence:");
    for (let i = 0; i < 10; i++) {
        console.log(\`F(\${i}) = \${fibonacci(i)}\`);
    }
}

main();
`,
        language: 'javascript',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    typescript: [
      {
        id: uuidv4(),
        path: 'index.ts',
        content: `// Welcome to AI Compiler IDE!
// This is a TypeScript workspace with AI assistance

function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

function main(): void {
    console.log("Hello, World!");
    console.log("Fibonacci sequence:");
    for (let i = 0; i < 10; i++) {
        console.log(\`F(\${i}) = \${fibonacci(i)}\`);
    }
}

main();
`,
        language: 'typescript',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    // Systems Programming
    python: [
      {
        id: uuidv4(),
        path: 'main.py',
        content: `# Welcome to AI Compiler IDE!
# This is a Python workspace with AI assistance

def fibonacci(n):
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def main():
    print("Hello, World!")
    print("Fibonacci sequence:")
    for i in range(10):
        print(f"F({i}) = {fibonacci(i)}")

if __name__ == "__main__":
    main()
`,
        language: 'python',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    cpp: [
      {
        id: uuidv4(),
        path: 'main.cpp',
        content: `// Welcome to AI Compiler IDE!
// This is a C++ workspace with AI assistance

#include <iostream>
using namespace std;

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    cout << "Hello, World!" << endl;
    cout << "Fibonacci sequence:" << endl;
    
    for (int i = 0; i < 10; i++) {
        cout << "F(" << i << ") = " << fibonacci(i) << endl;
    }
    
    return 0;
}
`,
        language: 'cpp',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    c: [
      {
        id: uuidv4(),
        path: 'main.c',
        content: `// Welcome to AI Compiler IDE!
// This is a C workspace with AI assistance

#include <stdio.h>

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    printf("Hello, World!\\n");
    printf("Fibonacci sequence:\\n");
    
    for (int i = 0; i < 10; i++) {
        printf("F(%d) = %d\\n", i, fibonacci(i));
    }
    
    return 0;
}
`,
        language: 'c',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    // JVM Languages
    java: [
      {
        id: uuidv4(),
        path: 'Main.java',
        content: `// Welcome to AI Compiler IDE!
// This is a Java workspace with AI assistance

public class Main {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        System.out.println("Fibonacci sequence:");
        
        for (int i = 0; i < 10; i++) {
            System.out.println("F(" + i + ") = " + fibonacci(i));
        }
    }
}
`,
        language: 'java',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    // Scripting Languages
    php: [
      {
        id: uuidv4(),
        path: 'index.php',
        content: `<?php
// Welcome to AI Compiler IDE!
// This is a PHP workspace with AI assistance

function fibonacci($n) {
    if ($n <= 1) return $n;
    return fibonacci($n - 1) + fibonacci($n - 2);
}

function main() {
    echo "Hello, World!\\n";
    echo "Fibonacci sequence:\\n";
    
    for ($i = 0; $i < 10; $i++) {
        echo "F($i) = " . fibonacci($i) . "\\n";
    }
}

main();
?>
`,
        language: 'php',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    ruby: [
      {
        id: uuidv4(),
        path: 'main.rb',
        content: `# Welcome to AI Compiler IDE!
# This is a Ruby workspace with AI assistance

def fibonacci(n)
  return n if n <= 1
  fibonacci(n - 1) + fibonacci(n - 2)
end

def main
  puts "Hello, World!"
  puts "Fibonacci sequence:"
  
  (0...10).each do |i|
    puts "F(#{i}) = #{fibonacci(i)}"
  end
end

main
`,
        language: 'ruby',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    // Add more language templates as needed
    rust: [
      {
        id: uuidv4(),
        path: 'main.rs',
        content: `// Welcome to AI Compiler IDE!
// This is a Rust workspace with AI assistance

fn fibonacci(n: u32) -> u32 {
    match n {
        0 | 1 => n,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn main() {
    println!("Hello, World!");
    println!("Fibonacci sequence:");
    
    for i in 0..10 {
        println!("F({}) = {}", i, fibonacci(i));
    }
}
`,
        language: 'rust',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    
    go: [
      {
        id: uuidv4(),
        path: 'main.go',
        content: `// Welcome to AI Compiler IDE!
// This is a Go workspace with AI assistance

package main

import "fmt"

func fibonacci(n int) int {
    if n <= 1 {
        return n
    }
    return fibonacci(n-1) + fibonacci(n-2)
}

func main() {
    fmt.Println("Hello, World!")
    fmt.Println("Fibonacci sequence:")
    
    for i := 0; i < 10; i++ {
        fmt.Printf("F(%d) = %d\\n", i, fibonacci(i))
    }
}
`,
        language: 'go',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  };

  return templates[language as keyof typeof templates] || templates.python;
}

export { router as workspaceRoutes };