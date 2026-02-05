import React, { useState, useEffect, useRef } from 'react';
import { Folder, FolderOpen, File, Plus, MoreHorizontal } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
}

export const FileExplorer: React.FC = () => {
  const { 
    currentWorkspace, 
    activeFile, 
    setActiveFile, 
    updateFileContent 
  } = useStore();
  
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      loadFiles();
    }
  }, [currentWorkspace]);

  const loadFiles = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const fileList = await apiService.getWorkspaceFiles(currentWorkspace.id);
      
      // Handle the response - it should be an array directly now
      const files = Array.isArray(fileList) ? fileList : (fileList.files || []);
      
      // Convert flat file list to tree structure
      const fileTree = buildFileTree(files);
      setFiles(fileTree);
      
      // Auto-select the first file if none selected
      if (!activeFile && files.length > 0) {
        const firstFile = files.find((f: any) => !f.type || f.type === 'file');
        if (firstFile) {
          await selectFile({
            id: firstFile.id || firstFile.path,
            name: firstFile.name || firstFile.path.split('/').pop() || '',
            path: firstFile.path,
            type: 'file'
          });
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      // Create default file structure for demo
      const defaultFiles = createDefaultFileStructure();
      setFiles(defaultFiles);
      
      if (!activeFile && defaultFiles.length > 0) {
        const mainFile = findFileByPath(defaultFiles, 'main.py') || 
                        findFileByPath(defaultFiles, 'index.js') ||
                        findFileByPath(defaultFiles, 'main.cpp') ||
                        findFileByPath(defaultFiles, 'Main.java') ||
                        defaultFiles[0];
        
        if (mainFile) {
          await selectFile(mainFile);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (flatFiles: any[]): FileNode[] => {
    const tree: FileNode[] = [];
    const pathMap = new Map<string, FileNode>();

    // Sort files to ensure folders come before their contents
    flatFiles.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.path.localeCompare(b.path);
    });

    flatFiles.forEach(file => {
      const node: FileNode = {
        id: file.id || file.path,
        name: file.name || file.path.split('/').pop() || '',
        path: file.path,
        type: file.type,
        children: file.type === 'folder' ? [] : undefined,
        isOpen: file.type === 'folder' ? true : undefined,
      };

      pathMap.set(file.path, node);

      const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
      if (parentPath && pathMap.has(parentPath)) {
        const parent = pathMap.get(parentPath)!;
        if (parent.children) {
          parent.children.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    return tree;
  };

  const createDefaultFileStructure = (): FileNode[] => {
    if (!currentWorkspace) return [];

    const templates = {
      python: [
        {
          id: '1',
          name: 'main.py',
          path: 'main.py',
          type: 'file' as const,
        },
        {
          id: '2',
          name: 'utils.py',
          path: 'utils.py',
          type: 'file' as const,
        },
        {
          id: '3',
          name: 'requirements.txt',
          path: 'requirements.txt',
          type: 'file' as const,
        }
      ],
      javascript: [
        {
          id: '1',
          name: 'index.js',
          path: 'index.js',
          type: 'file' as const,
        },
        {
          id: '2',
          name: 'package.json',
          path: 'package.json',
          type: 'file' as const,
        }
      ],
      cpp: [
        {
          id: '1',
          name: 'main.cpp',
          path: 'main.cpp',
          type: 'file' as const,
        },
        {
          id: '2',
          name: 'Makefile',
          path: 'Makefile',
          type: 'file' as const,
        }
      ],
      java: [
        {
          id: '1',
          name: 'Main.java',
          path: 'Main.java',
          type: 'file' as const,
        }
      ]
    };

    return templates[currentWorkspace.language as keyof typeof templates] || templates.python;
  };

  const findFileByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findFileByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const selectFile = async (node: FileNode) => {
    if (node.type !== 'file' || !currentWorkspace) return;

    try {
      // Try to get file content from API
      let content: string = '';
      try {
        const response = await apiService.getFile(currentWorkspace.id, node.path);
        // Handle different response types
        if (typeof response === 'string') {
          content = response;
        } else if (response && typeof response === 'object') {
          // Handle object response with content property
          content = (response as any).content || (response as any).data || '';
        } else {
          content = '';
        }
      } catch (error) {
        console.log('File not found on server, using default content');
        // If file doesn't exist on server, use default content
        content = getDefaultFileContent(node.path);
      }

      const fileData = {
        id: node.id,
        path: node.path,
        content,
        language: getLanguageFromPath(node.path),
        isModified: false,
      };

      setActiveFile(fileData);
      console.log('Selected file:', node.path, 'Content length:', content.length);
    } catch (error) {
      console.error('Failed to load file:', error);
      // Fallback to default content
      const fileData = {
        id: node.id,
        path: node.path,
        content: getDefaultFileContent(node.path),
        language: getLanguageFromPath(node.path),
        isModified: false,
      };
      setActiveFile(fileData);
    }
  };

  const getDefaultFileContent = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    
    const templates = {
      // Web Technologies
      py: '# Python file\nprint("Hello, World!")\n\n# Your code here\n',
      js: '// JavaScript file\nconsole.log("Hello, World!");\n\n// Your code here\n',
      ts: '// TypeScript file\nconsole.log("Hello, World!");\n\n// Your code here\n',
      jsx: 'import React from "react";\n\nfunction Component() {\n  return <div>Hello, World!</div>;\n}\n\nexport default Component;\n',
      tsx: 'import React from "react";\n\ninterface Props {}\n\nconst Component: React.FC<Props> = () => {\n  return <div>Hello, World!</div>;\n};\n\nexport default Component;\n',
      html: '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>\n',
      css: '/* CSS file */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}\n\nh1 {\n    color: #333;\n}\n',
      scss: '// SCSS file\n$primary-color: #333;\n\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n    \n    h1 {\n        color: $primary-color;\n    }\n}\n',
      
      // Systems Programming
      cpp: '// C++ file\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
      c: '// C file\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
      h: '// Header file\n#ifndef HEADER_H\n#define HEADER_H\n\n// Your declarations here\n\n#endif\n',
      hpp: '// C++ Header file\n#ifndef HEADER_HPP\n#define HEADER_HPP\n\n// Your declarations here\n\n#endif\n',
      rs: '// Rust file\nfn main() {\n    println!("Hello, World!");\n}\n',
      go: '// Go file\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
      
      // JVM Languages
      java: '// Java file\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
      kt: '// Kotlin file\nfun main() {\n    println("Hello, World!")\n}\n',
      scala: '// Scala file\nobject Main {\n  def main(args: Array[String]): Unit = {\n    println("Hello, World!")\n  }\n}\n',
      
      // .NET Languages
      cs: '// C# file\nusing System;\n\nclass Program\n{\n    static void Main()\n    {\n        Console.WriteLine("Hello, World!");\n    }\n}\n',
      fs: '// F# file\nopen System\n\n[<EntryPoint>]\nlet main argv =\n    printfn "Hello, World!"\n    0\n',
      vb: '\' VB.NET file\nModule Program\n    Sub Main()\n        Console.WriteLine("Hello, World!")\n    End Sub\nEnd Module\n',
      
      // Scripting Languages
      php: '<?php\n// PHP file\necho "Hello, World!";\n?>\n',
      rb: '# Ruby file\nputs "Hello, World!"\n\n# Your code here\n',
      pl: '#!/usr/bin/perl\n# Perl file\nuse strict;\nuse warnings;\n\nprint "Hello, World!\\n";\n',
      lua: '-- Lua file\nprint("Hello, World!")\n\n-- Your code here\n',
      sh: '#!/bin/bash\n# Shell script\necho "Hello, World!"\n\n# Your code here\n',
      ps1: '# PowerShell script\nWrite-Host "Hello, World!"\n\n# Your code here\n',
      
      // Functional Languages
      hs: '-- Haskell file\nmain :: IO ()\nmain = putStrLn "Hello, World!"\n',
      ml: '(* OCaml file *)\nlet () = print_endline "Hello, World!"\n',
      clj: ';; Clojure file\n(println "Hello, World!")\n',
      elm: '-- Elm file\nmodule Main exposing (..)\n\nimport Html exposing (text)\n\nmain =\n    text "Hello, World!"\n',
      
      // Data & Config
      json: '{\n  "name": "project",\n  "version": "1.0.0",\n  "description": "Your project description"\n}\n',
      xml: '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n    <message>Hello, World!</message>\n</root>\n',
      yaml: '# YAML file\nname: project\nversion: 1.0.0\ndescription: Your project description\n',
      yml: '# YAML file\nname: project\nversion: 1.0.0\ndescription: Your project description\n',
      toml: '# TOML file\nname = "project"\nversion = "1.0.0"\ndescription = "Your project description"\n',
      ini: '; INI file\n[section]\nkey = value\n',
      
      // Documentation
      md: '# README\n\nProject description\n\n## Getting Started\n\nYour instructions here\n',
      txt: 'Text file\n\nYour content here\n',
      rst: 'README\n======\n\nProject description\n\nGetting Started\n---------------\n\nYour instructions here\n',
      
      // Database
      sql: '-- SQL file\nSELECT * FROM users WHERE active = 1;\n\n-- Your queries here\n',
      
      // Mobile Development
      swift: '// Swift file\nimport Foundation\n\nprint("Hello, World!")\n',
      m: '// Objective-C file\n#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@"Hello, World!");\n    return 0;\n}\n',
      dart: '// Dart file\nvoid main() {\n  print("Hello, World!");\n}\n',
      
      // Other Languages
      r: '# R file\nprint("Hello, World!")\n\n# Your code here\n',
      jl: '# Julia file\nprintln("Hello, World!")\n\n# Your code here\n',
      nim: '# Nim file\necho "Hello, World!"\n\n# Your code here\n',
      zig: '// Zig file\nconst std = @import("std");\n\npub fn main() void {\n    std.debug.print("Hello, World!\\n", .{});\n}\n',
      v: '// V file\nfn main() {\n    println("Hello, World!")\n}\n'
    };

    return templates[ext as keyof typeof templates] || '// New file\n// Start coding here\n';
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      // Web Technologies
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'scss',
      'less': 'less',
      
      // Systems Programming
      'py': 'python',
      'pyw': 'python',
      'cpp': 'cpp',
      'cxx': 'cpp',
      'cc': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'hxx': 'cpp',
      'rs': 'rust',
      'go': 'go',
      
      // JVM Languages
      'java': 'java',
      'kt': 'kotlin',
      'kts': 'kotlin',
      'scala': 'scala',
      
      // .NET Languages
      'cs': 'csharp',
      'fs': 'fsharp',
      'vb': 'vb',
      
      // Scripting Languages
      'php': 'php',
      'rb': 'ruby',
      'pl': 'perl',
      'pm': 'perl',
      'lua': 'lua',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'ps1': 'powershell',
      
      // Functional Languages
      'hs': 'haskell',
      'lhs': 'haskell',
      'ml': 'ocaml',
      'mli': 'ocaml',
      'clj': 'clojure',
      'cljs': 'clojure',
      'elm': 'elm',
      
      // Data & Config
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'ini',
      'conf': 'ini',
      
      // Documentation
      'md': 'markdown',
      'markdown': 'markdown',
      'txt': 'plaintext',
      'rst': 'restructuredtext',
      
      // Database
      'sql': 'sql',
      
      // Mobile Development
      'swift': 'swift',
      'm': 'objective-c',
      'mm': 'objective-c',
      'dart': 'dart',
      
      // Other Languages
      'r': 'r',
      'R': 'r',
      'jl': 'julia',
      'nim': 'nim',
      'zig': 'zig',
      'v': 'v'
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const toggleFolder = (id: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === id && node.type === 'folder') {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setFiles(updateNode(files));
  };

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{show: boolean, x: number, y: number, file: FileNode | null}>({
    show: false, x: 0, y: 0, file: null
  });
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ show: false, x: 0, y: 0, file: null });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const createNewFile = async () => {
    const fileName = window.prompt('File name (e.g., script.py, app.js, main.cpp):');
    if (!fileName || !currentWorkspace) return;

    try {
      const defaultContent = getDefaultFileContent(fileName);
      await apiService.updateFile(currentWorkspace.id, fileName, defaultContent);
      await loadFiles(); // Reload file tree
      
      // Auto-select the newly created file
      const newFile = {
        id: fileName,
        name: fileName,
        path: fileName,
        type: 'file' as const
      };
      await selectFile(newFile);
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file: ' + (error as any).message);
    }
  };

  const deleteFile = async (filePath: string) => {
    if (!currentWorkspace) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete "${filePath}"?`);
    if (!confirmDelete) return;

    try {
      await apiService.deleteFile(currentWorkspace.id, filePath);
      await loadFiles(); // Reload file tree
      
      // Clear active file if it was deleted
      if (activeFile?.path === filePath) {
        setActiveFile(null);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file: ' + (error as any).message);
    }
  };

  const createNewFolder = async () => {
    const folderName = window.prompt('Folder name:');
    if (!folderName || !currentWorkspace) return;

    try {
      // Create a placeholder file inside the folder to ensure the folder exists
      const placeholderPath = `${folderName}/.gitkeep`;
      await apiService.updateFile(currentWorkspace.id, placeholderPath, '');
      await loadFiles();
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder: ' + (error as any).message);
    }
  };

  const renameFile = async (oldPath: string, newName: string) => {
    if (!currentWorkspace) return;
    
    try {
      // Get the current file content
      const content = await apiService.getFile(currentWorkspace.id, oldPath);
      const actualContent = typeof content === 'string' ? content : (content.content || '');
      
      // Create the new file
      await apiService.updateFile(currentWorkspace.id, newName, actualContent);
      
      // Delete the old file
      await apiService.deleteFile(currentWorkspace.id, oldPath);
      
      // Reload files
      await loadFiles();
      
      // Update active file if it was the renamed file
      if (activeFile?.path === oldPath) {
        setActiveFile({
          ...activeFile,
          path: newName,
          id: newName,
        });
      }
    } catch (error) {
      console.error('Failed to rename file:', error);
      alert('Failed to rename file: ' + (error as any).message);
    }
  };

  const handleMoreMenuClick = (action: string) => {
    setShowMoreMenu(false);
    
    switch (action) {
      case 'newFile':
        createNewFile();
        break;
      case 'newFolder':
        createNewFolder();
        break;
      case 'refresh':
        loadFiles();
        break;
      default:
        break;
    }
  };

  const handleContextMenu = (event: React.MouseEvent, file: FileNode) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (file.type === 'file') {
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        file
      });
    }
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu.file) return;
    
    const file = contextMenu.file;
    setContextMenu({ show: false, x: 0, y: 0, file: null });
    
    switch (action) {
      case 'delete':
        deleteFile(file.path);
        break;
      case 'rename':
        const newName = window.prompt('New file name:', file.name);
        if (newName && newName !== file.name) {
          // Calculate new path (preserve directory structure)
          const pathParts = file.path.split('/');
          pathParts[pathParts.length - 1] = newName;
          const newPath = pathParts.join('/');
          renameFile(file.path, newPath);
        }
        break;
      case 'duplicate':
        const copyName = `${file.name.replace(/\.[^.]+$/, '')}_copy${file.name.match(/\.[^.]+$/)?.[0] || ''}`;
        duplicateFile(file.path, copyName);
        break;
      default:
        break;
    }
  };

  const duplicateFile = async (sourcePath: string, newName: string) => {
    if (!currentWorkspace) return;
    
    try {
      const content = await apiService.getFile(currentWorkspace.id, sourcePath);
      const actualContent = typeof content === 'string' ? content : (content.content || '');
      
      // Calculate new path
      const pathParts = sourcePath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');
      
      await apiService.updateFile(currentWorkspace.id, newPath, actualContent);
      await loadFiles();
    } catch (error) {
      console.error('Failed to duplicate file:', error);
      alert('Failed to duplicate file: ' + (error as any).message);
    }
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isSelected = activeFile?.id === node.id;
    
    return (
      <div key={node.id}>
        <div
          className={`flex items-center space-x-2 px-2 py-1 cursor-pointer hover:bg-gray-700 ${
            isSelected ? 'bg-blue-600' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.id);
            } else {
              selectFile(node);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {node.type === 'folder' ? (
            node.isOpen ? <FolderOpen size={16} /> : <Folder size={16} />
          ) : (
            <File size={16} />
          )}
          <span className="text-sm text-gray-200">{node.name}</span>
          {node.type === 'file' && activeFile?.id === node.id && activeFile.isModified && (
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
          )}
        </div>
        
        {node.type === 'folder' && node.isOpen && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-200">Explorer</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading files...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-200">Explorer</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={createNewFile}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="New File"
            >
              <Plus size={12} />
            </button>
            <div className="relative" ref={moreMenuRef}>
              <button
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                title="More Actions"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <MoreHorizontal size={12} />
              </button>
              
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-1 bg-gray-700 rounded-lg shadow-lg py-2 min-w-32 z-50">
                  <button
                    onClick={() => handleMoreMenuClick('newFile')}
                    className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-600"
                  >
                    New File
                  </button>
                  <button
                    onClick={() => handleMoreMenuClick('newFolder')}
                    className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-600"
                  >
                    New Folder
                  </button>
                  <button
                    onClick={() => handleMoreMenuClick('refresh')}
                    className="w-full px-3 py-1 text-left text-sm text-gray-200 hover:bg-gray-600"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            <File size={32} className="mx-auto mb-2 opacity-50" />
            <p>No files in workspace</p>
            <button
              onClick={createNewFile}
              className="mt-2 text-blue-400 hover:text-blue-300"
            >
              Create your first file
            </button>
          </div>
        ) : (
          <div className="py-2">
            {files.map(file => renderFileNode(file))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className="fixed bg-gray-700 rounded-lg shadow-lg py-1 min-w-36 z-50"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
        >
          <button
            onClick={() => handleContextMenuAction('rename')}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-600 flex items-center space-x-2"
          >
            <span>✏️</span>
            <span>Rename</span>
          </button>
          <button
            onClick={() => handleContextMenuAction('duplicate')}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-600 flex items-center space-x-2"
          >
            <span>📋</span>
            <span>Duplicate</span>
          </button>
          <div className="border-t border-gray-600 my-1"></div>
          <button
            onClick={() => handleContextMenuAction('delete')}
            className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-600 flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};
