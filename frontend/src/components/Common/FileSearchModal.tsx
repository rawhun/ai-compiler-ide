import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, File, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
}

interface FileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: FileItem) => void;
}

export const FileSearchModal: React.FC<FileSearchModalProps> = ({ isOpen, onClose, onSelectFile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentWorkspace } = useStore();

  // Load files when modal opens
  useEffect(() => {
    if (isOpen && currentWorkspace) {
      loadFiles();
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentWorkspace]);

  const loadFiles = async () => {
    if (!currentWorkspace) return;
    try {
      const fileList = await apiService.getWorkspaceFiles(currentWorkspace.id);
      const files = Array.isArray(fileList) ? fileList : (fileList.files || []);
      setFiles(files.filter((f: any) => f.type !== 'folder').map((f: any) => ({
        id: f.id || f.path,
        name: f.name || f.path.split('/').pop() || '',
        path: f.path,
        type: f.type || 'file',
      })));
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredFiles[selectedIndex]) {
            onSelectFile(filteredFiles[selectedIndex]);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredFiles, selectedIndex, onSelectFile, onClose]);

  // Reset selected index when filtered files change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredFiles.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-700">
          <Search size={18} className="text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by name..."
            className="flex-1 bg-transparent text-white text-lg focus:outline-none placeholder-gray-500"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* File List */}
        <div className="max-h-80 overflow-y-auto">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchQuery ? 'No files found' : 'No files in workspace'}
            </div>
          ) : (
            <div className="py-2">
              {filteredFiles.map((file, index) => (
                <div
                  key={file.id}
                  className={`flex items-center px-4 py-2 cursor-pointer ${
                    index === selectedIndex ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <File size={16} className="text-gray-400 mr-3" />
                  <div className="flex-1">
                    <div className="text-white">{file.name}</div>
                    {file.path !== file.name && (
                      <div className="text-xs text-gray-400">{file.path}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getLanguageFromPath(file.path)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-between">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded mr-1">↑↓</kbd> navigate
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded mx-1 ml-3">Enter</kbd> open
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded mx-1 ml-3">Esc</kbd> close
          </span>
          <span>{filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'jsx': 'React JSX',
    'tsx': 'React TSX',
    'py': 'Python',
    'cpp': 'C++',
    'c': 'C',
    'java': 'Java',
    'html': 'HTML',
    'css': 'CSS',
    'json': 'JSON',
    'md': 'Markdown',
    'rs': 'Rust',
    'go': 'Go',
    'rb': 'Ruby',
    'php': 'PHP',
    'swift': 'Swift',
    'kt': 'Kotlin',
  };
  return languageMap[ext || ''] || ext?.toUpperCase() || 'File';
}
