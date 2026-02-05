import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/v1';

class APIService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.refreshToken(refreshToken);
              localStorage.setItem('accessToken', response.data.accessToken);
              
              // Retry the original request
              error.config.headers.Authorization = `Bearer ${response.data.accessToken}`;
              return this.api.request(error.config);
            } catch (refreshError) {
              // Refresh failed, logout user
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async getOAuthURL(provider: 'github' | 'google'): Promise<{ authUrl: string; state: string }> {
    const response = await this.api.get(`/auth/oauth/${provider}/url`);
    return response.data;
  }

  async handleOAuthCallback(provider: 'github' | 'google', code: string, state: string) {
    const response = await this.api.post(`/auth/oauth/${provider}/callback`, { code, state });
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    return this.api.post('/auth/refresh', { refreshToken });
  }

  async logout(refreshToken: string) {
    return this.api.post('/auth/logout', { refreshToken });
  }

  // User endpoints
  async getUserProfile() {
    const response = await this.api.get('/users/profile');
    return response.data.user;
  }

  // Workspace endpoints
  async getWorkspaces(limit = 20, offset = 0) {
    const response = await this.api.get('/workspaces', {
      params: { limit, offset }
    });
    return response.data;
  }

  async createWorkspace(data: { name: string; language: string; template?: string }) {
    const response = await this.api.post('/workspaces', data);
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    const response = await this.api.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async deleteWorkspace(workspaceId: string) {
    const response = await this.api.delete(`/workspaces/${workspaceId}`);
    return response.data;
  }

  // File endpoints
  async getWorkspaceFiles(workspaceId: string) {
    const response = await this.api.get(`/workspaces/${workspaceId}/files`);
    return response.data;
  }

  async getFile(workspaceId: string, filePath: string) {
    const response = await this.api.get(`/workspaces/${workspaceId}/files/${encodeURIComponent(filePath)}`);
    return response.data;
  }

  async updateFile(workspaceId: string, filePath: string, content: string) {
    const response = await this.api.put(
      `/workspaces/${workspaceId}/files/${encodeURIComponent(filePath)}`,
      { content }
    );
    return response.data;
  }

  async createFile(workspaceId: string, filePath: string, content = '') {
    const response = await this.api.put(
      `/workspaces/${workspaceId}/files/${encodeURIComponent(filePath)}`,
      { content }
    );
    return response.data;
  }

  async deleteFile(workspaceId: string, filePath: string) {
    const response = await this.api.delete(`/workspaces/${workspaceId}/files/${encodeURIComponent(filePath)}`);
    return response.data;
  }

  // Compilation endpoints
  async submitCompilation(data: {
    workspaceId: string;
    language: string;
    sourceFiles: Array<{ path: string; content: string }>;
    compilerOptions?: any;
  }) {
    const response = await this.api.post('/compile', data);
    return response.data;
  }

  async getCompilationStatus(jobId: string) {
    const response = await this.api.get(`/compile/${jobId}`);
    return response.data;
  }

  async executeProgram(jobId: string, input?: string) {
    const response = await this.api.post(`/compile/${jobId}/execute`, { stdin: input });
    return response.data;
  }

  // AI endpoints
  async sendChatMessage(data: {
    message: string;
    conversationId?: string;
    workspaceId?: string;
    provider: string;
    apiKey?: string;
  }) {
    const response = await this.api.post('/ai/chat', {
      messages: [{ role: 'user', content: data.message }],
      provider: data.provider,
      model: data.provider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-pro',
      workspaceId: data.workspaceId,
      apiKey: data.apiKey
    });
    return response.data;
  }

  async getCodeCompletion(data: {
    code: string;
    language: string;
    position: { line: number; character: number };
    provider: string;
    apiKey?: string;
  }) {
    const response = await this.api.post('/ai/complete', data);
    return response.data;
  }

  // Extension endpoints
  async getExtensions(query?: {
    category?: string;
    tags?: string[];
    text?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.api.get('/extensions', { params: query });
    return response.data;
  }

  async installExtension(extensionId: string) {
    const response = await this.api.post(`/extensions/${extensionId}/install`);
    return response.data;
  }

  async uninstallExtension(extensionId: string) {
    const response = await this.api.post(`/extensions/${extensionId}/uninstall`);
    return response.data;
  }
}

export const apiService = new APIService();