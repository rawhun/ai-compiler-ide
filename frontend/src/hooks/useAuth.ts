import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('accessToken');
    if (token) {
      // In a real app, validate the token with the server
      setIsAuthenticated(true);
      setUser({
        id: '1',
        email: 'demo@example.com',
        displayName: 'Demo User',
        avatarUrl: 'https://github.com/github.png',
        subscriptionTier: 'free'
      });
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User, tokens: { accessToken: string; refreshToken: string }) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };
};