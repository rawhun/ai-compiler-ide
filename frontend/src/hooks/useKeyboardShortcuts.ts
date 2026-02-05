import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Custom hook for handling keyboard shortcuts in the IDE
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
    const target = event.target as HTMLElement;
    const isEditable = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;
    
    // Allow Ctrl/Cmd + S even in editable areas (for save)
    const isSaveShortcut = 
      (event.ctrlKey || event.metaKey) && 
      event.key.toLowerCase() === 's';
    
    // Allow Ctrl/Cmd + Enter even in editable areas (for run)
    const isRunShortcut = 
      (event.ctrlKey || event.metaKey) && 
      event.key === 'Enter';

    for (const shortcut of shortcuts) {
      const ctrlOrMeta = shortcut.ctrlKey || shortcut.metaKey;
      const eventCtrlOrMeta = event.ctrlKey || event.metaKey;
      
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const modifiersMatch = 
        ctrlOrMeta === eventCtrlOrMeta &&
        (shortcut.shiftKey || false) === event.shiftKey &&
        (shortcut.altKey || false) === event.altKey;
      
      if (keyMatches && modifiersMatch) {
        // Only prevent default for editable areas if it's a special shortcut
        if (isEditable && !isSaveShortcut && !isRunShortcut) {
          continue;
        }
        
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get the modifier key name based on the operating system
 */
export function getModifierKey(): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Format a shortcut for display
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  const modKey = getModifierKey();
  
  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(modKey);
  }
  if (shortcut.shiftKey) {
    parts.push('Shift');
  }
  if (shortcut.altKey) {
    parts.push('Alt');
  }
  
  // Format special keys
  let keyDisplay = shortcut.key;
  if (keyDisplay === 'Enter') keyDisplay = '↵';
  else if (keyDisplay === ' ') keyDisplay = 'Space';
  else keyDisplay = keyDisplay.toUpperCase();
  
  parts.push(keyDisplay);
  
  return parts.join(' + ');
}

/**
 * Default IDE keyboard shortcuts configuration
 */
export const DEFAULT_SHORTCUTS = {
  save: { key: 's', ctrlKey: true, description: 'Save file' },
  run: { key: 'Enter', ctrlKey: true, description: 'Run code' },
  find: { key: 'f', ctrlKey: true, description: 'Find' },
  replace: { key: 'h', ctrlKey: true, description: 'Find and Replace' },
  newFile: { key: 'n', ctrlKey: true, description: 'New file' },
  toggleSidebar: { key: 'b', ctrlKey: true, description: 'Toggle sidebar' },
  toggleTerminal: { key: '`', ctrlKey: true, description: 'Toggle terminal' },
  toggleAI: { key: 'i', ctrlKey: true, shiftKey: true, description: 'Toggle AI assistant' },
  commandPalette: { key: 'p', ctrlKey: true, shiftKey: true, description: 'Command palette' },
  goToLine: { key: 'g', ctrlKey: true, description: 'Go to line' },
  formatCode: { key: 'f', ctrlKey: true, shiftKey: true, description: 'Format code' },
  undo: { key: 'z', ctrlKey: true, description: 'Undo' },
  redo: { key: 'y', ctrlKey: true, description: 'Redo' },
  selectAll: { key: 'a', ctrlKey: true, description: 'Select all' },
  copy: { key: 'c', ctrlKey: true, description: 'Copy' },
  cut: { key: 'x', ctrlKey: true, description: 'Cut' },
  paste: { key: 'v', ctrlKey: true, description: 'Paste' },
  duplicate: { key: 'd', ctrlKey: true, shiftKey: true, description: 'Duplicate line' },
  comment: { key: '/', ctrlKey: true, description: 'Toggle comment' },
  indent: { key: ']', ctrlKey: true, description: 'Indent' },
  outdent: { key: '[', ctrlKey: true, description: 'Outdent' },
};

/**
 * Keyboard shortcuts help dialog content
 */
export const SHORTCUT_CATEGORIES = [
  {
    name: 'File Operations',
    shortcuts: [
      { ...DEFAULT_SHORTCUTS.save, action: () => {} },
      { ...DEFAULT_SHORTCUTS.newFile, action: () => {} },
    ],
  },
  {
    name: 'Code Execution',
    shortcuts: [
      { ...DEFAULT_SHORTCUTS.run, action: () => {} },
    ],
  },
  {
    name: 'Search',
    shortcuts: [
      { ...DEFAULT_SHORTCUTS.find, action: () => {} },
      { ...DEFAULT_SHORTCUTS.replace, action: () => {} },
      { ...DEFAULT_SHORTCUTS.goToLine, action: () => {} },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { ...DEFAULT_SHORTCUTS.toggleSidebar, action: () => {} },
      { ...DEFAULT_SHORTCUTS.toggleTerminal, action: () => {} },
      { ...DEFAULT_SHORTCUTS.toggleAI, action: () => {} },
      { ...DEFAULT_SHORTCUTS.commandPalette, action: () => {} },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { ...DEFAULT_SHORTCUTS.undo, action: () => {} },
      { ...DEFAULT_SHORTCUTS.redo, action: () => {} },
      { ...DEFAULT_SHORTCUTS.duplicate, action: () => {} },
      { ...DEFAULT_SHORTCUTS.comment, action: () => {} },
      { ...DEFAULT_SHORTCUTS.formatCode, action: () => {} },
    ],
  },
];
