# Frontend Architecture & Components

## Component Structure

```
src/
├── components/
│   ├── Layout/
│   │   ├── AppLayout.tsx          # Main application layout
│   │   ├── TopBar.tsx             # Navigation and user menu
│   │   ├── Sidebar.tsx            # Collapsible sidebar container
│   │   └── StatusBar.tsx          # Bottom status information
│   ├── Editor/
│   │   ├── MonacoEditor.tsx       # Monaco editor wrapper
│   │   ├── EditorTabs.tsx         # File tab management
│   │   ├── EditorSplitView.tsx    # Split editor functionality
│   │   └── EditorSettings.tsx     # Editor configuration
│   ├── FileExplorer/
│   │   ├── FileTree.tsx           # File tree component
│   │   ├── FileNode.tsx           # Individual file/folder node
│   │   ├── ContextMenu.tsx        # Right-click context menu
│   │   └── FileUpload.tsx         # File upload handling
│   ├── Terminal/
│   │   ├── Terminal.tsx           # Integrated terminal
│   │   ├── CompileOutput.tsx      # Compilation results
│   │   └── DebugConsole.tsx       # Debug output panel
│   ├── AIAssistant/
│   │   ├── AIChat.tsx             # Chat interface
│   │   ├── CodeCompletion.tsx     # Inline completions
│   │   ├── AISettings.tsx         # AI provider configuration
│   │   └── ConversationHistory.tsx # Chat history
│   ├── Workspace/
│   │   ├── WorkspaceSelector.tsx  # Workspace switcher
│   │   ├── ProjectSettings.tsx    # Project configuration
│   │   └── ShareDialog.tsx        # Sharing functionality
│   └── Common/
│       ├── Button.tsx             # Reusable button component
│       ├── Modal.tsx              # Modal dialog
│       ├── LoadingSpinner.tsx     # Loading indicator
│       └── ErrorBoundary.tsx      # Error handling
├── hooks/
│   ├── useAuth.ts                 # Authentication logic
│   ├── useWorkspace.ts            # Workspace management
│   ├── useCompiler.ts             # Compilation handling
│   ├── useAI.ts                   # AI integration
│   ├── useWebSocket.ts            # Real-time communication
│   └── useExtensions.ts           # Extension system
├── services/
│   ├── api.ts                     # API client
│   ├── auth.ts                    # Authentication service
│   ├── compiler.ts                # Compilation service
│   ├── ai.ts                      # AI service
│   ├── websocket.ts               # WebSocket service
│   └── storage.ts                 # Local storage utilities
├── stores/
│   ├── authStore.ts               # User authentication state
│   ├── workspaceStore.ts          # Workspace and files state
│   ├── editorStore.ts             # Editor configuration state
│   ├── aiStore.ts                 # AI conversation state
│   └── uiStore.ts                 # UI state (panels, themes)
├── types/
│   ├── api.ts                     # API response types
│   ├── workspace.ts               # Workspace-related types
│   ├── editor.ts                  # Editor-related types
│   └── ai.ts                      # AI-related types
└── utils/
    ├── constants.ts               # Application constants
    ├── helpers.ts                 # Utility functions
    └── validation.ts              # Input validation
```

## Main Layout Component

```tsx
// src/components/Layout/AppLayout.tsx
import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { MonacoEditor } from '../Editor/MonacoEditor';
import { Terminal } from '../Terminal/Terminal';
import { AIChat } from '../AIAssistant/AIChat';
import { FileExplorer } from '../FileExplorer/FileTree';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../../hooks/useWorkspace';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { currentWorkspace, activeFile } = useWorkspace();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [aiChatVisible, setAiChatVisible] = useState(false);

  if (!isAuthenticated) {
    return <div>Please sign in to continue</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Top Navigation */}
      <TopBar 
        user={user}
        workspace={currentWorkspace}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onToggleAI={() => setAiChatVisible(!aiChatVisible)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar collapsed={sidebarCollapsed}>
          <FileExplorer />
        </Sidebar>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          <div 
            className="flex-1 overflow-hidden"
            style={{ height: `calc(100% - ${terminalHeight}px)` }}
          >
            <MonacoEditor file={activeFile} />
          </div>

          {/* Bottom Terminal Panel */}
          <div 
            className="border-t border-gray-700 bg-gray-800"
            style={{ height: `${terminalHeight}px` }}
          >
            <Terminal />
          </div>
        </div>

        {/* Right AI Chat Panel */}
        {aiChatVisible && (
          <div className="w-80 border-l border-gray-700 bg-gray-800">
            <AIChat />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};
```

## Monaco Editor Integration

```tsx
// src/components/Editor/MonacoEditor.tsx
import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import { useCompiler } from '../../hooks/useCompiler';
import { useAI } from '../../hooks/useAI';
import { WorkspaceFile } from '../../types/workspace';

interface MonacoEditorProps {
  file: WorkspaceFile | null;
  onContentChange?: (content: string) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ 
  file, 
  onContentChange 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { compileFile } = useCompiler();
  const { getCodeCompletion } = useAI();

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialize Monaco Editor
    const editorInstance = monaco.editor.create(editorRef.current, {
      value: file?.content || '',
      language: getLanguageFromFile(file?.path || ''),
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      cursorStyle: 'line',
      wordWrap: 'on',
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      multiCursorModifier: 'ctrlCmd',
      formatOnPaste: true,
      formatOnType: true,
    });

    // Setup AI-powered code completion
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: async (model, position) => {
        const code = model.getValue();
        const completions = await getCodeCompletion(code, position);
        
        return {
          suggestions: completions.map(completion => ({
            label: completion.text,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: completion.insertText,
            detail: completion.detail,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column,
            },
          })),
        };
      },
    });

    // Handle content changes
    editorInstance.onDidChangeModelContent(() => {
      const content = editorInstance.getValue();
      onContentChange?.(content);
    });

    // Keyboard shortcuts
    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        // Save file
        const content = editorInstance.getValue();
        // Trigger save logic
      }
    );

    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        // Compile and run
        compileFile(file);
      }
    );

    setEditor(editorInstance);

    return () => {
      editorInstance.dispose();
    };
  }, []);

  // Update editor content when file changes
  useEffect(() => {
    if (editor && file) {
      const currentContent = editor.getValue();
      if (currentContent !== file.content) {
        editor.setValue(file.content);
        editor.setModelLanguage(
          editor.getModel()!,
          getLanguageFromFile(file.path)
        );
      }
    }
  }, [editor, file]);

  return (
    <div className="h-full w-full">
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
};

function getLanguageFromFile(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'cpp': 'cpp',
    'c': 'c',
    'java': 'java',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'md': 'markdown',
  };
  return languageMap[ext || ''] || 'plaintext';
}
```

## AI Chat Component

```tsx
// src/components/AIAssistant/AIChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../../hooks/useAI';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Button } from '../Common/Button';
import { LoadingSpinner } from '../Common/LoadingSpinner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { sendChatMessage, aiProvider, setAiProvider } = useAI();
  const { currentWorkspace } = useWorkspace();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        inputValue,
        currentWorkspace?.id,
        aiProvider
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as any)}
            className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
          >
            <option value="shared">Shared (Free)</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p>Ask me anything about your code!</p>
            <p className="text-sm mt-2">
              Try: "Explain this function" or "How can I optimize this?"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your code..."
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
```

## Compilation Hook

```tsx
// src/hooks/useCompiler.ts
import { useState, useCallback } from 'react';
import { compilerService } from '../services/compiler';
import { WorkspaceFile } from '../types/workspace';

interface CompilationResult {
  jobId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout';
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTimeMs?: number;
  memoryUsedKb?: number;
}

export const useCompiler = () => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);

  const compileFile = useCallback(async (file: WorkspaceFile | null) => {
    if (!file) return;

    setIsCompiling(true);
    setCompilationResult(null);

    try {
      // Submit compilation job
      const job = await compilerService.compile({
        workspaceId: file.workspaceId,
        language: getLanguageFromPath(file.path),
        sourceFiles: [
          {
            path: file.path,
            content: file.content,
          },
        ],
        compilerOptions: {},
      });

      setCompilationResult(job);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await compilerService.getJobStatus(job.jobId);
          setCompilationResult(status);

          if (['success', 'error', 'timeout'].includes(status.status)) {
            clearInterval(pollInterval);
            setIsCompiling(false);
          }
        } catch (error) {
          console.error('Error polling compilation status:', error);
          clearInterval(pollInterval);
          setIsCompiling(false);
        }
      }, 1000);

      // Cleanup after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsCompiling(false);
      }, 30000);

    } catch (error) {
      console.error('Compilation error:', error);
      setIsCompiling(false);
    }
  }, []);

  const compileWorkspace = useCallback(async (workspaceId: string, files: WorkspaceFile[]) => {
    setIsCompiling(true);
    setCompilationResult(null);

    try {
      const sourceFiles = files.map(file => ({
        path: file.path,
        content: file.content,
      }));

      const job = await compilerService.compile({
        workspaceId,
        language: getLanguageFromPath(files[0]?.path || ''),
        sourceFiles,
        compilerOptions: {},
      });

      setCompilationResult(job);

      // Similar polling logic as compileFile
      // ... (polling implementation)

    } catch (error) {
      console.error('Workspace compilation error:', error);
      setIsCompiling(false);
    }
  }, []);

  return {
    isCompiling,
    compilationResult,
    compileFile,
    compileWorkspace,
  };
};

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'cpp': 'cpp',
    'c': 'c',
    'java': 'java',
  };
  return languageMap[ext || ''] || 'javascript';
}
```

## Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#1f2937',
          950: '#0f172a',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

This frontend architecture provides:

1. **Clean, minimalist UI** with dark theme optimized for coding
2. **Monaco Editor integration** with AI-powered completions
3. **Modular component structure** for maintainability
4. **Real-time compilation feedback** with status polling
5. **AI chat interface** with provider selection
6. **Responsive layout** with collapsible panels
7. **TypeScript throughout** for type safety
8. **Custom hooks** for business logic separation
9. **Tailwind CSS** for consistent styling
10. **Extensible architecture** ready for plugins