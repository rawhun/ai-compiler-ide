import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  aiQuotaUsed: number;
  aiQuotaResetDate: string;
}

interface Workspace {
  id: string;
  name: string;
  language: string;
  description?: string;
  files: WorkspaceFile[];
  lastAccessedAt: string;
  createdAt: string;
}

interface WorkspaceFile {
  id: string;
  path: string;
  content: string;
  language: string;
  isModified: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  isActive: boolean;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  
  // Workspaces
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  activeFile: WorkspaceFile | null;
  
  // AI
  aiProviders: AIProvider[];
  selectedAIProvider: string;
  aiQuotaUsed: number;
  
  // UI
  sidebarCollapsed: boolean;
  aiChatVisible: boolean;
  terminalHeight: number;
  theme: 'dark' | 'light';
  searchModalOpen: boolean;
  
  // Editor
  cursorPosition: { line: number; column: number };
  editorSelection: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setAccessToken: (token: string | null) => void;
  
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setActiveFile: (file: WorkspaceFile | null) => void;
  updateFileContent: (fileId: string, content: string) => void;
  
  addAIProvider: (provider: AIProvider) => void;
  removeAIProvider: (providerId: string) => void;
  setSelectedAIProvider: (providerId: string) => void;
  
  toggleSidebar: () => void;
  toggleAIChat: () => void;
  setTerminalHeight: (height: number) => void;
  toggleTheme: () => void;
  setSearchModalOpen: (open: boolean) => void;
  
  // Editor actions
  setCursorPosition: (line: number, column: number) => void;
  setEditorSelection: (selection: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null) => void;
  
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      accessToken: null,
      
      workspaces: [],
      currentWorkspace: null,
      activeFile: null,
      
      aiProviders: [],
      selectedAIProvider: 'shared',
      aiQuotaUsed: 0,
      
      sidebarCollapsed: false,
      aiChatVisible: true,
      terminalHeight: 200,
      theme: 'dark',
      searchModalOpen: false,
      
      // Editor state
      cursorPosition: { line: 1, column: 1 },
      editorSelection: null,
      
      // Actions
      setUser: (user) => set({ user }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setAccessToken: (token) => set({ accessToken: token }),
      
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setActiveFile: (file) => set({ activeFile: file }),
      
      updateFileContent: (fileId, content) => set((state) => {
        if (!state.currentWorkspace) return state;
        
        const updatedFiles = state.currentWorkspace.files.map(file =>
          file.id === fileId 
            ? { ...file, content, isModified: true }
            : file
        );
        
        const updatedWorkspace = {
          ...state.currentWorkspace,
          files: updatedFiles
        };
        
        const activeFile = state.activeFile?.id === fileId 
          ? { ...state.activeFile, content, isModified: true }
          : state.activeFile;
        
        return {
          currentWorkspace: updatedWorkspace,
          activeFile
        };
      }),
      
      addAIProvider: (provider) => set((state) => ({
        aiProviders: [...state.aiProviders, provider]
      })),
      
      removeAIProvider: (providerId) => set((state) => ({
        aiProviders: state.aiProviders.filter(p => p.id !== providerId)
      })),
      
      setSelectedAIProvider: (providerId) => set({ selectedAIProvider: providerId }),
      
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleAIChat: () => set((state) => ({ aiChatVisible: !state.aiChatVisible })),
      setTerminalHeight: (height) => set({ terminalHeight: height }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setSearchModalOpen: (open) => set({ searchModalOpen: open }),
      
      // Editor actions
      setCursorPosition: (line, column) => set({ cursorPosition: { line, column } }),
      setEditorSelection: (selection) => set({ editorSelection: selection }),
      
      logout: () => set({
        user: null,
        isAuthenticated: false,
        accessToken: null,
        workspaces: [],
        currentWorkspace: null,
        activeFile: null,
        aiProviders: [],
        selectedAIProvider: 'shared',
        aiQuotaUsed: 0,
        cursorPosition: { line: 1, column: 1 },
        editorSelection: null,
      }),
    }),
    {
      name: 'ai-ide-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        aiProviders: state.aiProviders,
        selectedAIProvider: state.selectedAIProvider,
        sidebarCollapsed: state.sidebarCollapsed,
        aiChatVisible: state.aiChatVisible,
        terminalHeight: state.terminalHeight,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Store rehydrated:', state ? 'success' : 'failed');
      },
    }
  )
);