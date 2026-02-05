import React, { useState, useEffect } from 'react';
import { Github, Chrome, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { useStore } from '../../store/useStore';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState<'github' | 'google' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setUser, setAuthenticated, setAccessToken } = useStore();

  useEffect(() => {
    // Handle OAuth callback with URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');

    if (error) {
      const errorMessage = urlParams.get('message');
      setError(`Authentication failed: ${error}${errorMessage ? ' - ' + decodeURIComponent(errorMessage) : ''}`);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (accessToken && refreshToken && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Update store
        setUser(user);
        setAccessToken(accessToken);
        setAuthenticated(true);

        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
      } catch (error) {
        console.error('Failed to parse user data:', error);
        setError('Authentication failed: Invalid user data');
      }
      return;
    }

    // Handle legacy OAuth callback (for POST-based flow)
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const provider = urlParams.get('provider') as 'github' | 'google';

    if (code && state && provider) {
      handleOAuthCallback(provider, code, state);
    }
  }, []);

  const handleOAuthCallback = async (provider: 'github' | 'google', code: string, state: string) => {
    setLoading(provider);
    setError(null);

    try {
      const response = await apiService.handleOAuthCallback(provider, code, state);
      
      // Store tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Update store
      setUser(response.user);
      setAccessToken(response.accessToken);
      setAuthenticated(true);

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setError(error.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(null);
    }
  };

  const handleLogin = async (provider: 'github' | 'google') => {
    setLoading(provider);
    setError(null);

    try {
      const response = await apiService.getOAuthURL(provider);
      
      // Store state for verification
      localStorage.setItem('oauth_state', response.state);
      
      // Redirect to OAuth provider
      window.location.href = response.authUrl;
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Failed to initiate login');
      setLoading(null);
    }
  };

  const handleDemoLogin = () => {
    setLoading('demo');
    setError(null);
    // Redirect to demo login endpoint
    window.location.href = 'http://localhost:8000/v1/auth/demo-login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            AI Compiler IDE
          </h1>
          <p className="text-gray-300 text-lg">
            Code, Compile, and Create with AI
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Sign in to continue
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => handleLogin('github')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center space-x-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors"
            >
              {loading === 'github' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Github size={20} />
              )}
              <span>
                {loading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
              </span>
            </button>

            <button
              onClick={() => handleLogin('google')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors"
            >
              {loading === 'google' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Chrome size={20} />
              )}
              <span>
                {loading === 'google' ? 'Connecting...' : 'Continue with Google'}
              </span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">or</span>
              </div>
            </div>

            <button
              onClick={handleDemoLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors"
            >
              {loading === 'demo' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <span>🚀</span>
              )}
              <span>
                {loading === 'demo' ? 'Starting...' : 'Try Demo (No Sign-in Required)'}
              </span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-blue-400 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="grid grid-cols-3 gap-4 text-gray-400 text-sm">
            <div>
              <div className="font-semibold text-white">Multi-Language</div>
              <div>JS, Python, C++, Java</div>
            </div>
            <div>
              <div className="font-semibold text-white">AI-Powered</div>
              <div>Code completion & chat</div>
            </div>
            <div>
              <div className="font-semibold text-white">Secure</div>
              <div>Sandboxed execution</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};