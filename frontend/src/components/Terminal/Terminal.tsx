import React, { useState, useEffect } from 'react';
import { Play, Trash2, Terminal as TerminalIcon, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';

interface CompilationJob {
  jobId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout';
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTimeMs?: number;
  memoryUsedKb?: number;
}

interface Problem {
  severity: number; // 1=Hint, 2=Info, 4=Warning, 8=Error
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  file?: string;
}

export const Terminal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('output');
  const [output, setOutput] = useState('Welcome to AI Compiler IDE Terminal\nPress Ctrl+Enter to run your code\nType "help" for available commands\n');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentJob, setCurrentJob] = useState<CompilationJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const { activeFile, currentWorkspace } = useStore();

  useEffect(() => {
    // Listen for compilation jobs from the TopBar
    const handleCompilationStart = (event: CustomEvent) => {
      const { jobId, language } = event.detail;
      setCurrentJob({ jobId, status: 'pending' });
      setOutput(prev => prev + `\n$ Running ${language} code...\n`);
      pollCompilationStatus(jobId);
    };

    const handleCompilationError = (event: CustomEvent) => {
      const { error, language } = event.detail;
      setOutput(prev => prev + `\n❌ ${language} compilation failed:\n${error}\n`);
      setCurrentJob(null);
    };

    // Listen for editor markers (problems)
    const handleMarkersChanged = (event: CustomEvent) => {
      const { markers, file } = event.detail;
      setProblems(markers.map((m: any) => ({ ...m, file })));
    };

    window.addEventListener('compilation-started' as any, handleCompilationStart);
    window.addEventListener('compilation-error' as any, handleCompilationError);
    window.addEventListener('editor-markers-changed' as any, handleMarkersChanged);
    
    return () => {
      window.removeEventListener('compilation-started' as any, handleCompilationStart);
      window.removeEventListener('compilation-error' as any, handleCompilationError);
      window.removeEventListener('editor-markers-changed' as any, handleMarkersChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommand = (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    // Add to history
    setCommandHistory(prev => [...prev, trimmedCommand]);
    setHistoryIndex(-1);
    
    // Add command to output
    setOutput(prev => prev + `\n$ ${trimmedCommand}\n`);

    // Process command
    switch (trimmedCommand.toLowerCase()) {
      case 'help':
        setOutput(prev => prev + 
          'Available commands:\n' +
          '  help - Show this help message\n' +
          '  clear - Clear terminal output\n' +
          '  run - Run current file (same as Ctrl+Enter)\n' +
          '  info - Show current file information\n' +
          '  workspace - Show workspace information\n\n'
        );
        break;
      
      case 'clear':
        setOutput('Terminal cleared.\n');
        break;
      
      case 'run':
        if (activeFile) {
          window.dispatchEvent(new CustomEvent('run-code', { 
            detail: { file: activeFile } 
          }));
        } else {
          setOutput(prev => prev + 'No active file to run.\n');
        }
        break;
      
      case 'info':
        if (activeFile) {
          setOutput(prev => prev + 
            `File: ${activeFile.path}\n` +
            `Language: ${activeFile.language}\n` +
            `Modified: ${activeFile.isModified ? 'Yes' : 'No'}\n` +
            `Size: ${activeFile.content.length} characters\n\n`
          );
        } else {
          setOutput(prev => prev + 'No active file.\n');
        }
        break;
      
      case 'workspace':
        if (currentWorkspace) {
          setOutput(prev => prev + 
            `Workspace: ${currentWorkspace.name}\n` +
            `Language: ${currentWorkspace.language}\n` +
            `Files: ${currentWorkspace.files.length}\n` +
            `Last accessed: ${new Date(currentWorkspace.lastAccessedAt).toLocaleString()}\n\n`
          );
        } else {
          setOutput(prev => prev + 'No active workspace.\n');
        }
        break;
      
      default:
        setOutput(prev => prev + `Command not found: ${trimmedCommand}\nType "help" for available commands.\n`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(commandInput);
      setCommandInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommandInput('');
        } else {
          setHistoryIndex(newIndex);
          setCommandInput(commandHistory[newIndex]);
        }
      }
    }
  };

  const pollCompilationStatus = async (jobId: string) => {
    if (isPolling) return;
    
    setIsPolling(true);
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const job = await apiService.getCompilationStatus(jobId);
        setCurrentJob(job);

        if (job.status === 'pending' || job.status === 'running') {
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
            return;
          } else {
            // Timeout
            setOutput(prev => prev + 'Compilation timed out after 30 seconds\n');
            setIsPolling(false);
            return;
          }
        }

        // Compilation finished
        let result = '';
        if (job.status === 'success') {
          result += `✅ Execution completed successfully!\n\n`;
          result += `${job.stdout || 'No output'}`;
          if (job.executionTimeMs !== undefined) {
            result += `\n\n📊 Performance:\n`;
            result += `⏱️  Execution time: ${(job.executionTimeMs / 1000).toFixed(3)}s\n`;
            result += `🔄 Exit code: ${job.exitCode || 0}\n`;
            if (job.memoryUsedKb) {
              result += `💾 Memory used: ${(job.memoryUsedKb / 1024).toFixed(1)}MB\n`;
            }
          }
        } else {
          result += `❌ Execution failed!\n\n`;
          result += `${job.stderr || job.stdout || 'Unknown error occurred'}`;
          if (job.exitCode !== undefined && job.exitCode !== 0) {
            result += `\n\n🔄 Exit code: ${job.exitCode}`;
          }
        }

        setOutput(prev => prev + result + '\n');
        setIsPolling(false);

      } catch (error) {
        console.error('Polling error:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setOutput(prev => prev + 'Failed to get compilation results\n');
          setIsPolling(false);
        }
      }
    };

    poll();
  };

  const clearOutput = () => {
    setOutput('Terminal cleared\n');
    setCurrentJob(null);
  };

  const getSeverityIcon = (severity: number) => {
    switch (severity) {
      case 8: return <AlertCircle size={14} className="text-red-400" />;
      case 4: return <AlertTriangle size={14} className="text-yellow-400" />;
      case 2: return <Info size={14} className="text-blue-400" />;
      default: return <Info size={14} className="text-gray-400" />;
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 8: return 'Error';
      case 4: return 'Warning';
      case 2: return 'Info';
      default: return 'Hint';
    }
  };

  const errorCount = problems.filter(p => p.severity === 8).length;
  const warningCount = problems.filter(p => p.severity === 4).length;

  const tabs = [
    { id: 'output', label: 'Output', icon: TerminalIcon, badge: null },
    { id: 'problems', label: 'Problems', icon: AlertTriangle, badge: errorCount + warningCount > 0 ? errorCount + warningCount : null },
    { id: 'debug', label: 'Debug Console', icon: Play, badge: null },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Terminal Tabs */}
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1 text-sm rounded ${
                  activeTab === tab.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={clearOutput}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Clear output"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'output' && (
          <div className="p-4 font-mono text-sm h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              <pre className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                {output}
              </pre>
              {isPolling && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                  <span>Running...</span>
                </div>
              )}
            </div>
            
            {/* Command Input */}
            <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-600">
              <span className="text-green-400">$</span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or 'help' for available commands..."
                className="flex-1 bg-transparent text-gray-200 outline-none placeholder-gray-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="p-4">
            {problems.length === 0 ? (
              <div className="text-gray-400 text-sm flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>No problems detected in the current file.</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center space-x-4 text-xs text-gray-400 mb-2">
                  {errorCount > 0 && (
                    <span className="flex items-center space-x-1">
                      <AlertCircle size={12} className="text-red-400" />
                      <span>{errorCount} Error{errorCount !== 1 ? 's' : ''}</span>
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="flex items-center space-x-1">
                      <AlertTriangle size={12} className="text-yellow-400" />
                      <span>{warningCount} Warning{warningCount !== 1 ? 's' : ''}</span>
                    </span>
                  )}
                </div>
                {problems.map((problem, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 p-2 hover:bg-gray-700 rounded cursor-pointer text-sm"
                    onClick={() => {
                      // Could dispatch event to jump to line in editor
                      window.dispatchEvent(new CustomEvent('jump-to-line', {
                        detail: { line: problem.startLineNumber, column: problem.startColumn }
                      }));
                    }}
                  >
                    {getSeverityIcon(problem.severity)}
                    <div className="flex-1">
                      <span className="text-gray-200">{problem.message}</span>
                      <span className="text-gray-500 ml-2">
                        [{problem.file || 'current file'}:{problem.startLineNumber}:{problem.startColumn}]
                      </span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      problem.severity === 8 ? 'bg-red-900 text-red-200' :
                      problem.severity === 4 ? 'bg-yellow-900 text-yellow-200' :
                      'bg-blue-900 text-blue-200'
                    }`}>
                      {getSeverityText(problem.severity)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="p-4">
            <div className="text-gray-400 text-sm">
              Debug console is ready. Start debugging to see output here.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};