import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';

// Monaco Editor will be loaded dynamically
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

// Event types for editor markers (problems)
export interface EditorMarker {
  severity: number;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export const MonacoEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const { activeFile, updateFileContent, currentWorkspace, theme, setCursorPosition, setEditorSelection } = useStore();
  const [isEditorReady, setIsEditorReady] = useState<boolean | null>(null);

  // Dispatch markers to the Problems panel
  const dispatchMarkers = useCallback((markers: EditorMarker[]) => {
    window.dispatchEvent(new CustomEvent('editor-markers-changed', {
      detail: { markers, file: activeFile?.path }
    }));
  }, [activeFile?.path]);

  useEffect(() => {
    // Load Monaco Editor only once
    if (!window.monaco && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
      script.onload = () => {
        try {
          window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
          window.require(['vs/editor/editor.main'], () => {
            console.log('Monaco Editor loaded successfully');
            setIsEditorReady(true);
          });
        } catch (error) {
          console.error('Error loading Monaco Editor:', error);
          setIsEditorReady(false);
        }
      };
      script.onerror = (error) => {
        console.error('Failed to load Monaco Editor script:', error);
        setIsEditorReady(false);
      };
      document.head.appendChild(script);
    } else if (window.monaco) {
      setIsEditorReady(true);
    }
  }, []);

  // Create editor instance (separate effect to avoid recreation)
  useEffect(() => {
    if (isEditorReady && editorRef.current && !editorInstanceRef.current) {
      try {
        const editorTheme = theme === 'light' ? 'vs' : 'vs-dark';
        
        // Create Monaco Editor instance
        editorInstanceRef.current = window.monaco.editor.create(editorRef.current, {
          value: activeFile?.content || getDefaultContent(),
          language: activeFile?.language || 'python',
          theme: editorTheme,
          automaticLayout: true,
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          minimap: { enabled: true },
          wordWrap: 'on',
          tabSize: 4,
          insertSpaces: true,
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          quickSuggestions: true,
          parameterHints: { enabled: true },
          hover: { enabled: true },
          contextmenu: true,
          mouseWheelZoom: true,
          cursorBlinking: 'blink',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          folding: true,
          foldingHighlight: true,
          showFoldingControls: 'always',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        });

        // Listen for content changes
        editorInstanceRef.current.onDidChangeModelContent(() => {
          try {
            const content = editorInstanceRef.current.getValue();
            const { activeFile: currentFile } = useStore.getState();
            if (currentFile) {
              updateFileContent(currentFile.id, content);
            }
            
            // Get and dispatch markers (problems)
            const model = editorInstanceRef.current.getModel();
            if (model) {
              const markers = window.monaco.editor.getModelMarkers({ resource: model.uri });
              dispatchMarkers(markers.map((m: any) => ({
                severity: m.severity,
                message: m.message,
                startLineNumber: m.startLineNumber,
                startColumn: m.startColumn,
                endLineNumber: m.endLineNumber,
                endColumn: m.endColumn,
              })));
            }
          } catch (error) {
            console.error('Error handling content change:', error);
          }
        });

        // Listen for cursor position changes
        editorInstanceRef.current.onDidChangeCursorPosition((e: any) => {
          try {
            setCursorPosition(e.position.lineNumber, e.position.column);
          } catch (error) {
            console.error('Error handling cursor position change:', error);
          }
        });

        // Listen for selection changes
        editorInstanceRef.current.onDidChangeCursorSelection((e: any) => {
          try {
            const selection = e.selection;
            if (selection.isEmpty()) {
              setEditorSelection(null);
            } else {
              setEditorSelection({
                startLine: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLine: selection.endLineNumber,
                endColumn: selection.endColumn,
              });
            }
          } catch (error) {
            console.error('Error handling selection change:', error);
          }
        });

        // Listen for marker changes
        window.monaco.editor.onDidChangeMarkers((uris: any[]) => {
          const model = editorInstanceRef.current?.getModel();
          if (model && uris.some((uri: any) => uri.toString() === model.uri.toString())) {
            const markers = window.monaco.editor.getModelMarkers({ resource: model.uri });
            dispatchMarkers(markers.map((m: any) => ({
              severity: m.severity,
              message: m.message,
              startLineNumber: m.startLineNumber,
              startColumn: m.startColumn,
              endLineNumber: m.endLineNumber,
              endColumn: m.endColumn,
            })));
          }
        });

        console.log('Monaco Editor instance created successfully');
      } catch (error) {
        console.error('Error creating Monaco Editor instance:', error);
        setIsEditorReady(false);
      }
    }

    // Cleanup only on unmount
    return () => {
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.dispose();
          editorInstanceRef.current = null;
        } catch (error) {
          console.error('Error disposing Monaco Editor:', error);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorReady]);

  useEffect(() => {
    if (editorInstanceRef.current && activeFile) {
      try {
        // Update editor content when active file changes
        const currentContent = editorInstanceRef.current.getValue();
        if (currentContent !== activeFile.content) {
          editorInstanceRef.current.setValue(activeFile.content);
        }
        
        // Update language
        const model = editorInstanceRef.current.getModel();
        if (model) {
          window.monaco.editor.setModelLanguage(model, getMonacoLanguage(activeFile.language));
        }
      } catch (error) {
        console.error('Error updating editor content:', error);
      }
    }
  }, [activeFile]);

  // Handle theme changes
  useEffect(() => {
    if (editorInstanceRef.current && window.monaco) {
      const editorTheme = theme === 'light' ? 'vs' : 'vs-dark';
      window.monaco.editor.setTheme(editorTheme);
    }
  }, [theme]);

  // Auto-save functionality
  useEffect(() => {
    if (!editorInstanceRef.current || !activeFile || !currentWorkspace) return;

    const saveInterval = setInterval(async () => {
      try {
        const currentContent = editorInstanceRef.current.getValue();
        if (currentContent !== activeFile.content && activeFile.isModified) {
          try {
            await apiService.updateFile(currentWorkspace.id, activeFile.path, currentContent);
            console.log('Auto-saved file:', activeFile.path);
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }
      } catch (error) {
        console.error('Error in auto-save interval:', error);
      }
    }, 5000); // Auto-save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [activeFile, currentWorkspace]);

  const getDefaultContent = () => {
    if (!currentWorkspace) return '// Welcome to AI Compiler IDE\n// Create a workspace to get started';

    const templates = {
      python: `# Welcome to AI Compiler IDE!
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
      javascript: `// Welcome to AI Compiler IDE!
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
      cpp: `// Welcome to AI Compiler IDE!
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
      java: `// Welcome to AI Compiler IDE!
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
`
    };

    return templates[currentWorkspace.language as keyof typeof templates] || templates.python;
  };

  const getMonacoLanguage = (language: string): string => {
    const languageMap: Record<string, string> = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'python': 'python',
      'cpp': 'cpp',
      'c': 'c',
      'java': 'java',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'markdown': 'markdown',
      'xml': 'xml',
      'yaml': 'yaml',
      'shell': 'shell',
      'powershell': 'powershell',
      'sql': 'sql',
      'php': 'php',
      'ruby': 'ruby',
      'go': 'go',
      'rust': 'rust',
      'kotlin': 'kotlin',
      'swift': 'swift',
      'dart': 'dart',
      'csharp': 'csharp',
      'fsharp': 'fsharp',
      'r': 'r',
      'lua': 'lua',
      'perl': 'perl',
      'scala': 'scala',
      'haskell': 'haskell',
      'clojure': 'clojure',
      'objective-c': 'objective-c',
    };
    return languageMap[language] || 'plaintext';
  };

  if (isEditorReady === null) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>Loading Editor...</div>
        </div>
      </div>
    );
  }

  // Fallback to textarea if Monaco Editor fails
  if (isEditorReady === false) {
    return (
      <div className="h-full w-full bg-gray-900">
        <textarea
          className="w-full h-full bg-gray-900 text-white p-4 font-mono text-sm resize-none border-none outline-none"
          value={activeFile?.content || getDefaultContent()}
          onChange={(e) => {
            if (activeFile) {
              updateFileContent(activeFile.id, e.target.value);
            }
          }}
          placeholder="Start coding here..."
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-900">
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
};