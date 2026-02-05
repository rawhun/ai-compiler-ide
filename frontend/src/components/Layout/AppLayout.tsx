import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { MonacoEditor } from '../Editor/MonacoEditor';
import { Terminal } from '../Terminal/Terminal';
import { AIChat } from '../AIAssistant/AIChat';
import { FileExplorer } from '../FileExplorer/FileTree';
import { useAuth } from '../../hooks/useAuth';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [aiChatVisible, setAiChatVisible] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Top Navigation */}
      <TopBar 
        user={user}
        workspace={null}
        onShowAPIKeys={() => {}}
        onLogout={() => {}}
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