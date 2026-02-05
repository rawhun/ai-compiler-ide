import { Router } from 'express';
import { storeUser } from './user';

const router = Router();

// Mock user data for demo
const mockUser = {
  id: '1',
  email: 'demo@example.com',
  displayName: 'Demo User',
  avatarUrl: 'https://github.com/github.png',
  subscriptionTier: 'free',
  aiQuotaUsed: 45,
  aiQuotaResetDate: new Date().toDateString(),
};

// OAuth state storage (in production, use Redis)
const oauthStates = new Map<string, { provider: string, timestamp: number }>();

// GitHub OAuth
router.get('/oauth/github/url', (_req, res) => {
  const state = Date.now().toString();
  const timestamp = Date.now();
  
  oauthStates.set(state, { provider: 'github', timestamp });
  
  // Clean up old states (older than 10 minutes)
  for (const [key, value] of oauthStates.entries()) {
    if (timestamp - value.timestamp > 10 * 60 * 1000) {
      oauthStates.delete(key);
    }
  }

  // For demo, return a mock auth URL
  const authUrl = `http://localhost:3001/login?provider=github&state=${state}`;

  res.json({ authUrl, state });
});

router.post('/oauth/github/callback', async (req, res): Promise<void> => {
  try {
    const { state } = req.body;

    // Verify state
    const stateData = oauthStates.get(state);
    if (!stateData || stateData.provider !== 'github') {
      res.status(400).json({ error: 'Invalid state parameter' });
      return;
    }
    oauthStates.delete(state);

    // For demo, return mock tokens and user data
    const jwtToken = 'mock-jwt-token-' + Date.now();
    const refreshToken = 'mock-refresh-token-' + Date.now();

    res.json({
      accessToken: jwtToken,
      refreshToken,
      user: mockUser
    });

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Google OAuth
router.get('/oauth/google/url', (_req, res): void => {
  const state = Date.now().toString();
  const timestamp = Date.now();
  
  oauthStates.set(state, { provider: 'google', timestamp });

  // Clean up old states (older than 10 minutes)
  for (const [key, value] of oauthStates.entries()) {
    if (timestamp - value.timestamp > 10 * 60 * 1000) {
      oauthStates.delete(key);
    }
  }

  // Real Google OAuth URL
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/v1/auth/google/callback';
  
  if (!googleClientId || googleClientId === 'your-google-client-id') {
    // Use demo mode if Google OAuth not configured
    console.log('Google OAuth not configured, using demo mode');
    const demoAuthUrl = `http://localhost:8000/v1/auth/demo-login?state=${state}`;
    res.json({ authUrl: demoAuthUrl, state });
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${googleClientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid profile email')}&` +
    `state=${state}&` +
    `access_type=offline&` +
    `prompt=consent`;

  console.log('Generated Google OAuth URL with redirect:', redirectUri);
  res.json({ authUrl, state });
});

router.post('/oauth/google/callback', async (req, res): Promise<void> => {
  try {
    const { code, state } = req.body;

    // Verify state
    const stateData = oauthStates.get(state);
    if (!stateData || stateData.provider !== 'google') {
      res.status(400).json({ error: 'Invalid state parameter' });
      return;
    }
    oauthStates.delete(state);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const googleUser = await userResponse.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    // Create our user object
    const user = {
      id: googleUser.id,
      email: googleUser.email,
      displayName: googleUser.name,
      avatarUrl: googleUser.picture,
      subscriptionTier: 'free',
      aiQuotaUsed: 0,
      aiQuotaLimit: 100,
      aiQuotaResetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Store user data
    storeUser(googleUser.id, user);

    // Generate our own JWT token with user ID
    const jwtToken = `mock-jwt-token-${googleUser.id}-${Date.now()}`;
    const refreshToken = 'mock-refresh-token-' + Date.now();

    res.json({
      accessToken: jwtToken,
      refreshToken,
      user
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    // For demo, generate new token
    const newAccessToken = 'mock-jwt-token-' + Date.now();

    res.json({ accessToken: newAccessToken });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', async (_req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Handle OAuth redirect from Google
router.get('/google/callback', async (req, res): Promise<void> => {
  try {
    const { code, state } = req.query;
    console.log('Google OAuth callback received:', { code: code ? 'present' : 'missing', state });

    if (!code) {
      console.error('Missing code parameter');
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/login?error=missing_code`);
      return;
    }

    // Verify state (lenient in development - state may be lost on server restart)
    const stateData = oauthStates.get(state as string);
    if (stateData) {
      oauthStates.delete(state as string);
    } else {
      console.log('State not found in memory (server may have restarted), proceeding anyway in dev mode');
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/v1/auth/google/callback',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange code for tokens: ' + errorData);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const googleUser = await userResponse.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    // Generate our own JWT token with user ID
    const jwtToken = `mock-jwt-token-${googleUser.id}-${Date.now()}`;
    const refreshToken = 'mock-refresh-token-' + Date.now();

    // Store user data
    storeUser(googleUser.id, {
      id: googleUser.id,
      email: googleUser.email,
      displayName: googleUser.name,
      avatarUrl: googleUser.picture,
      subscriptionTier: 'free',
      aiQuotaUsed: 0,
      aiQuotaLimit: 100,
      aiQuotaResetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/login?` +
      `access_token=${jwtToken}&` +
      `refresh_token=${refreshToken}&` +
      `user=${encodeURIComponent(JSON.stringify({
        id: googleUser.id,
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
        subscriptionTier: 'free',
        aiQuotaUsed: 0,
        aiQuotaLimit: 100,
        aiQuotaResetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }))}`;

    res.redirect(redirectUrl);

  } catch (error: any) {
    console.error('Google OAuth callback error:', error.message || error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/login?error=auth_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`);
  }
});

// Handle OAuth redirect from GitHub
router.get('/github/callback', async (req, res): Promise<void> => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_parameters`);
      return;
    }

    // Verify state
    const stateData = oauthStates.get(state as string);
    if (!stateData || stateData.provider !== 'github') {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
      return;
    }
    oauthStates.delete(state as string);

    // For now, use mock data for GitHub (you can implement real GitHub OAuth later)
    const jwtToken = 'mock-jwt-token-' + Date.now();
    const refreshToken = 'mock-refresh-token-' + Date.now();

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/login?` +
      `access_token=${jwtToken}&` +
      `refresh_token=${refreshToken}&` +
      `user=${encodeURIComponent(JSON.stringify(mockUser))}`;

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// Demo login endpoint (for development without real OAuth)
router.get('/demo-login', (_req, res): void => {
  console.log('Demo login initiated');
  
  const demoUser = {
    id: 'demo-user-' + Date.now(),
    email: 'demo@aicompiler.dev',
    displayName: 'Demo User',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    subscriptionTier: 'free',
    aiQuotaUsed: 0,
    aiQuotaLimit: 100,
    aiQuotaResetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Store demo user
  storeUser(demoUser.id, demoUser);

  const jwtToken = `demo-jwt-token-${demoUser.id}-${Date.now()}`;
  const refreshToken = 'demo-refresh-token-' + Date.now();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const redirectUrl = `${frontendUrl}/login?` +
    `access_token=${jwtToken}&` +
    `refresh_token=${refreshToken}&` +
    `user=${encodeURIComponent(JSON.stringify(demoUser))}`;

  console.log('Demo login successful, redirecting to frontend');
  res.redirect(redirectUrl);
});

export { router as authRoutes };
