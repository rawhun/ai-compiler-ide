import React, { useState } from 'react';
import { Menu, Bot, Play, Save, Settings, LogOut, Key, Plus, Sun, Moon, Download, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';

interface TopBarProps {
  user: any;
  workspace: any;
  onShowAPIKeys: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ user, workspace, onShowAPIKeys, onLogout }) => {
  const { 
    toggleSidebar, 
    toggleAIChat, 
    activeFile, 
    updateFileContent,
    currentWorkspace,
    setCurrentWorkspace,
    setActiveFile,
    workspaces,
    theme,
    toggleTheme
  } = useStore();
  
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleRun = async () => {
    if (!activeFile || !currentWorkspace || isRunning) return;

    setIsRunning(true);
    try {
      // First save the file
      await apiService.updateFile(currentWorkspace.id, activeFile.path, activeFile.content);
      
      const response = await apiService.submitCompilation({
        workspaceId: currentWorkspace.id,
        language: activeFile.language,
        sourceFiles: [
          {
            path: activeFile.path,
            content: activeFile.content
          }
        ]
      });

      console.log('Compilation submitted:', response);

      // Dispatch custom event to notify Terminal component
      window.dispatchEvent(new CustomEvent('compilation-started', {
        detail: { jobId: response.jobId, language: activeFile.language }
      }));

    } catch (error: any) {
      console.error('Compilation failed:', error);
      // Show error in terminal
      window.dispatchEvent(new CustomEvent('compilation-error', {
        detail: { 
          error: error.response?.data?.error || error.message || 'Compilation failed',
          language: activeFile.language 
        }
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = async () => {
    if (!activeFile || !currentWorkspace || isSaving) return;

    setIsSaving(true);
    try {
      // Get the current content from the editor
      const currentContent = activeFile.content;
      
      const response = await apiService.updateFile(
        currentWorkspace.id,
        activeFile.path,
        currentContent
      );

      // Mark file as saved
      const updatedFile = { ...activeFile, isModified: false };
      setActiveFile(updatedFile);
      
      console.log('File saved successfully:', activeFile.path);

    } catch (error: any) {
      console.error('Save failed:', error);
      alert('Failed to save file: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateWorkspace = async () => {
    const name = window.prompt('Workspace name:');
    if (!name) return;

    // Show language selection dialog
    const languages = [
      'python', 'javascript', 'typescript', 'java', 'cpp', 'c',
      'php', 'ruby', 'go', 'rust', 'csharp', 'kotlin', 'swift',
      'dart', 'r', 'julia', 'haskell', 'scala', 'lua', 'perl'
    ];
    
    const language = window.prompt(`Language (${languages.slice(0, 10).join(', ')}, etc.):\n\nSupported: ${languages.join(', ')}`);
    if (!language) return;

    if (!languages.includes(language.toLowerCase())) {
      alert(`Language "${language}" is not supported yet. Supported languages: ${languages.join(', ')}`);
      return;
    }
    
    try {
      const newWorkspace = await apiService.createWorkspace({
        name,
        language: language.toLowerCase(),
        template: 'blank'
      });
      
      // Set the new workspace as current
      setCurrentWorkspace(newWorkspace.workspace);
      
      // Reload the page to refresh workspaces
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to create workspace:', error);
      alert('Failed to create workspace: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSwitchWorkspace = (ws: any) => {
    setCurrentWorkspace(ws);
    setActiveFile(null);
    setShowWorkspaceMenu(false);
  };

  const handleDownloadWorkspace = async () => {
    if (!currentWorkspace || isDownloading) return;
    
    setIsDownloading(true);
    try {
      const fileList = await apiService.getWorkspaceFiles(currentWorkspace.id);
      const files = Array.isArray(fileList) ? fileList : (fileList.files || []);
      
      // Create a simple text file with all code (for demo - real implementation would use JSZip)
      let content = `// ${currentWorkspace.name} - Workspace Export\n`;
      content += `// Language: ${currentWorkspace.language}\n`;
      content += `// Exported: ${new Date().toISOString()}\n\n`;
      
      for (const file of files) {
        if (file.type !== 'folder') {
          try {
            const fileContent = await apiService.getFile(currentWorkspace.id, file.path);
            const actualContent = typeof fileContent === 'string' ? fileContent : (fileContent.content || '');
            content += `\n// ========== ${file.path} ==========\n`;
            content += actualContent;
            content += '\n';
          } catch (e) {
            content += `\n// ========== ${file.path} ==========\n`;
            content += '// Error loading file\n';
          }
        }
      }
      
      // Download as text file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentWorkspace.name.replace(/\s+/g, '_')}_export.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download workspace');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
        >
          <Menu size={16} />
        </button>
        
        <div className="text-lg font-semibold text-white">
          AI Compiler IDE
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="text-sm text-gray-400 hover:text-white flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-700"
          >
            <span>{workspace?.name || 'No workspace'}</span>
            <ChevronDown size={14} />
          </button>
          
          {showWorkspaceMenu && (
            <div className="absolute top-full left-0 mt-1 bg-gray-700 rounded-lg shadow-lg py-2 min-w-56 z-50 max-h-80 overflow-y-auto">
              {/* Current workspaces */}
              {workspaces.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs text-gray-400 uppercase">Your Workspaces</div>
                  {workspaces.map((ws: any) => (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws)}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                        currentWorkspace?.id === ws.id 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      <span>{ws.name}</span>
                      <span className="text-xs opacity-60">{ws.language}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-600 my-2"></div>
                </>
              )}
              
              {/* Create new workspace */}
              <button
                onClick={() => {
                  handleCreateWorkspace();
                  setShowWorkspaceMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-600 flex items-center space-x-2"
              >
                <Plus size={14} />
                <span>New Workspace</span>
              </button>
              
              {/* Download workspace */}
              <button
                onClick={() => {
                  handleDownloadWorkspace();
                  setShowWorkspaceMenu(false);
                }}
                disabled={!currentWorkspace || isDownloading}
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-600 flex items-center space-x-2 disabled:opacity-50"
              >
                <Download size={14} />
                <span>{isDownloading ? 'Downloading...' : 'Download Workspace'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center Section */}
      <div className="flex items-center space-x-2">
        <button
          data-action="run"
          onClick={handleRun}
          disabled={!activeFile || isRunning}
          className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
        >
          <Play size={14} />
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>
        
        <button
          data-action="save"
          onClick={handleSave}
          disabled={!activeFile || !activeFile.isModified || isSaving}
          className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleAIChat}
          className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
        >
          <Bot size={14} />
          <span>AI</span>
        </button>
        
        <button
          onClick={onShowAPIKeys}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Manage API Keys"
        >
          <Key size={14} />
        </button>
        
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        
        <button
          onClick={onShowAPIKeys}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Settings"
        >
          <Settings size={14} />
        </button>
        
        <div className="flex items-center space-x-2">
          <img
            src={user?.avatarUrl || 'https://github.com/github.png'}
            alt={user?.displayName}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-gray-300">{user?.displayName}</span>
        </div>
        
        <button
          onClick={onLogout}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
};