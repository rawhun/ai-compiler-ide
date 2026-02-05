import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { MonacoEditor } from '../Editor/MonacoEditor';
import { Terminal } from '../Terminal/Terminal';
import { AIChat } from '../AIAssistant/AIChat';
import { FileExplorer } from '../FileExplorer/FileTree';
import { APIKeyManager } from '../Settings/APIKeyManager';
import { FileSearchModal } from '../Common/FileSearchModal';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';
import { useKeyboardShortcuts, DEFAULT_SHORTCUTS, getModifierKey } from '../../hooks/useKeyboardShortcuts';

export const IDELayout: React.FC = () => {
  const {
    user,
    sidebarCollapsed,
    aiChatVisible,
    terminalHeight,
    currentWorkspace,
    workspaces,
    setWorkspaces,
    setCurrentWorkspace,
    logout,
    theme
  } = useStore();

  // Theme-based class names
  const themeClasses = {
    bg: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100',
    bgSecondary: theme === 'dark' ? 'bg-gray-800' : 'bg-white',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    border: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
  };

  const [showAPIKeyManager, setShowAPIKeyManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const terminalResizeRef = useRef<number | null>(null);

  // Handle save action
  const handleSave = useCallback(async () => {
    if (!currentWorkspace) return;
    
    // Get the active file from the store
    const { activeFile, setActiveFile } = useStore.getState();
    if (!activeFile) return;
    
    try {
      await apiService.updateFile(currentWorkspace.id, activeFile.path, activeFile.content);
      setActiveFile({ ...activeFile, isModified: false });
      console.log('File saved:', activeFile.path);
    } catch (error) {
      console.error('Save failed:', error);
    }
  }, [currentWorkspace]);

  // Handle run action
  const handleRun = useCallback(async () => {
    // Trigger the run button click
    const runButton = document.querySelector('[data-action="run"]') as HTMLButtonElement;
    if (runButton && !runButton.disabled) {
      runButton.click();
    }
  }, []);

  // Handle file search
  const handleFileSearch = useCallback(() => {
    setShowFileSearch(true);
  }, []);

  // Handle terminal resize
  const handleTerminalResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTerminal(true);
    terminalResizeRef.current = e.clientY;
  }, []);

  useEffect(() => {
    if (!isResizingTerminal) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (terminalResizeRef.current === null) return;
      const delta = terminalResizeRef.current - e.clientY;
      const { terminalHeight, setTerminalHeight } = useStore.getState();
      const newHeight = Math.max(100, Math.min(500, terminalHeight + delta));
      setTerminalHeight(newHeight);
      terminalResizeRef.current = e.clientY;
    };

    const handleMouseUp = () => {
      setIsResizingTerminal(false);
      terminalResizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTerminal]);

  // Handle file selection from search modal
  const handleFileSelect = useCallback(async (file: any) => {
    if (!currentWorkspace) return;
    try {
      const response = await apiService.getFile(currentWorkspace.id, file.path);
      const content = typeof response === 'string' ? response : (response.content || response.data || '');
      
      const { setActiveFile } = useStore.getState();
      setActiveFile({
        id: file.id,
        path: file.path,
        content,
        language: getLanguageFromPath(file.path),
        isModified: false,
      });
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [currentWorkspace]);

  // Get language from file path
  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript', 'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript',
      'py': 'python', 'cpp': 'cpp', 'c': 'c', 'java': 'java',
      'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown',
      'rs': 'rust', 'go': 'go', 'rb': 'ruby', 'php': 'php',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  // Keyboard shortcuts configuration
  const shortcuts = useMemo(() => [
    {
      ...DEFAULT_SHORTCUTS.save,
      action: handleSave,
    },
    {
      ...DEFAULT_SHORTCUTS.run,
      action: handleRun,
    },
    {
      ...DEFAULT_SHORTCUTS.toggleSidebar,
      action: () => useStore.getState().toggleSidebar(),
    },
    {
      ...DEFAULT_SHORTCUTS.toggleAI,
      action: () => useStore.getState().toggleAIChat(),
    },
    {
      key: '?',
      ctrlKey: false,
      shiftKey: true,
      action: () => setShowShortcutsHelp(true),
      description: 'Show keyboard shortcuts',
    },
    {
      key: 'p',
      ctrlKey: true,
      action: handleFileSearch,
      description: 'Quick file open',
    },
    {
      key: 'Escape',
      ctrlKey: false,
      action: () => {
        setShowShortcutsHelp(false);
        setShowFileSearch(false);
      },
      description: 'Close dialogs',
    },
  ], [handleSave, handleRun, handleFileSearch]);

  // Register keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    // Load user workspaces on mount
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await apiService.getWorkspaces();
      
      // If no workspaces exist, create a default one
      if (response.workspaces.length === 0) {
        console.log('No workspaces found, creating default workspace...');
        try {
          const defaultWorkspace = await apiService.createWorkspace({
            name: 'My First Workspace',
            language: 'python',
            template: 'blank'
          });
          
          setWorkspaces([defaultWorkspace.workspace]);
          setCurrentWorkspace(defaultWorkspace.workspace);
        } catch (createError) {
          console.error('Failed to create default workspace:', createError);
          setWorkspaces([]);
        }
      } else {
        setWorkspaces(response.workspaces);
        
        // Set the first workspace as current if none selected
        if (!currentWorkspace) {
          setCurrentWorkspace(response.workspaces[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      // Create a fallback workspace if API fails
      const fallbackWorkspace = {
        id: 'fallback-workspace',
        name: 'Default Workspace',
        language: 'python',
        description: 'Default workspace for getting started',
        files: [],
        lastAccessedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setWorkspaces([fallbackWorkspace]);
      setCurrentWorkspace(fallbackWorkspace);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      logout();
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${themeClasses.bg} ${themeClasses.text}`}>
      {/* Top Navigation */}
      <TopBar 
        user={user}
        workspace={currentWorkspace}
        onShowAPIKeys={() => setShowAPIKeyManager(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar>
          <FileExplorer />
        </Sidebar>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          <div 
            className="flex-1 overflow-hidden"
            style={{ height: `calc(100% - ${terminalHeight}px)` }}
          >
            <MonacoEditor />
          </div>

          {/* Terminal Resize Handle */}
          <div
            className={`h-1 bg-gray-700 cursor-ns-resize hover:bg-blue-500 transition-colors ${isResizingTerminal ? 'bg-blue-500' : ''}`}
            onMouseDown={handleTerminalResizeStart}
          />

          {/* Bottom Terminal Panel */}
          <div 
            className="bg-gray-800"
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

      {/* API Key Manager Modal */}
      <APIKeyManager 
        isOpen={showAPIKeyManager}
        onClose={() => setShowAPIKeyManager(false)}
      />

      {/* File Search Modal */}
      <FileSearchModal
        isOpen={showFileSearch}
        onClose={() => setShowFileSearch(false)}
        onSelectFile={handleFileSelect}
      />

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">File Operations</h3>
                  <div className="space-y-1">
                    <ShortcutItem label="Save file" shortcut={`${getModifierKey()} + S`} />
                    <ShortcutItem label="New file" shortcut={`${getModifierKey()} + N`} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Code Execution</h3>
                  <div className="space-y-1">
                    <ShortcutItem label="Run code" shortcut={`${getModifierKey()} + Enter`} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">View</h3>
                  <div className="space-y-1">
                    <ShortcutItem label="Toggle sidebar" shortcut={`${getModifierKey()} + B`} />
                    <ShortcutItem label="Toggle AI assistant" shortcut={`${getModifierKey()} + Shift + I`} />
                    <ShortcutItem label="Show shortcuts" shortcut="Shift + ?" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Search</h3>
                  <div className="space-y-1">
                    <ShortcutItem label="Quick file open" shortcut={`${getModifierKey()} + P`} />
                    <ShortcutItem label="Find" shortcut={`${getModifierKey()} + F`} />
                    <ShortcutItem label="Find and Replace" shortcut={`${getModifierKey()} + H`} />
                    <ShortcutItem label="Go to line" shortcut={`${getModifierKey()} + G`} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Editing</h3>
                  <div className="space-y-1">
                    <ShortcutItem label="Undo" shortcut={`${getModifierKey()} + Z`} />
                    <ShortcutItem label="Redo" shortcut={`${getModifierKey()} + Y`} />
                    <ShortcutItem label="Toggle comment" shortcut={`${getModifierKey()} + /`} />
                    <ShortcutItem label="Format code" shortcut={`${getModifierKey()} + Shift + F`} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 text-center">
              <span className="text-gray-400 text-sm">Press Escape to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for displaying shortcuts
const ShortcutItem: React.FC<{ label: string; shortcut: string }> = ({ label, shortcut }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-300">{label}</span>
    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 font-mono">
      {shortcut}
    </kbd>
  </div>
);
