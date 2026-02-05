import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Simple in-memory user storage (in production, use a database)
const users = new Map<string, any>();

// Apply authentication to all routes
router.use(authenticateToken);

// Get user profile
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    
    // Try to get real user data from storage
    let user = users.get(userId);
    
    if (!user) {
      // Fallback to demo user data if not found
      user = {
        id: userId,
        email: req.user.email,
        displayName: 'Demo User',
        avatarUrl: 'https://github.com/github.png',
        subscriptionTier: 'free',
        aiQuotaUsed: 45,
        aiQuotaLimit: 100,
        aiQuotaResetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        preferences: {
          theme: 'dark',
          fontSize: 14,
          tabSize: 2,
          wordWrap: true,
          minimap: true,
          autoSave: true,
        },
        statistics: {
          totalWorkspaces: 5,
          totalFiles: 23,
          totalCompilations: 156,
          totalAIRequests: 45,
        }
      };
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { displayName, preferences } = req.body;

    // In a real app, you would update the database here
    const updatedUser = {
      id: userId,
      email: req.user.email,
      displayName: displayName || 'Demo User',
      avatarUrl: 'https://github.com/github.png',
      subscriptionTier: 'free',
      aiQuotaUsed: 45,
      aiQuotaLimit: 100,
      aiQuotaResetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      preferences: preferences || {
        theme: 'dark',
        fontSize: 14,
        tabSize: 2,
        wordWrap: true,
        minimap: true,
        autoSave: true,
      },
      statistics: {
        totalWorkspaces: 5,
        totalFiles: 23,
        totalCompilations: 156,
        totalAIRequests: 45,
      }
    };

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Get user statistics
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    // Mock statistics
    const stats = {
      today: {
        compilations: 12,
        aiRequests: 8,
        filesEdited: 5,
        timeSpent: 3600, // seconds
      },
      thisWeek: {
        compilations: 67,
        aiRequests: 23,
        filesEdited: 34,
        timeSpent: 18000,
      },
      thisMonth: {
        compilations: 234,
        aiRequests: 89,
        filesEdited: 156,
        timeSpent: 72000,
      },
      languages: [
        { name: 'JavaScript', usage: 45 },
        { name: 'Python', usage: 30 },
        { name: 'TypeScript', usage: 15 },
        { name: 'C++', usage: 10 },
      ],
      recentActivity: [
        {
          type: 'compilation',
          language: 'python',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          status: 'success'
        },
        {
          type: 'ai_request',
          action: 'code_explanation',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          status: 'success'
        },
        {
          type: 'file_edit',
          fileName: 'main.py',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          status: 'success'
        }
      ]
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Update AI quota usage
router.post('/quota/ai', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { increment = 1 } = req.body;

    // In a real app, you would update the database here
    const newQuotaUsed = 45 + increment;

    res.json({ 
      aiQuotaUsed: newQuotaUsed,
      aiQuotaLimit: 100,
      aiQuotaResetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Update AI quota error:', error);
    res.status(500).json({ error: 'Failed to update AI quota' });
  }
});

// Get user API keys (encrypted)
router.get('/api-keys', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    // Mock API keys (in real app, these would be encrypted)
    const apiKeys = [
      {
        id: '1',
        name: 'My OpenAI Key',
        provider: 'openai',
        masked: 'sk-...abc123',
        isActive: true,
        createdAt: '2024-01-15T10:30:00.000Z',
        lastUsed: new Date().toISOString()
      }
    ];

    res.json({ apiKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

// Add user API key
router.post('/api-keys', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { name, provider, apiKey } = req.body;

    if (!name || !provider || !apiKey) {
      res.status(400).json({ error: 'Name, provider, and API key are required' });
      return;
    }

    // In a real app, you would encrypt and store the API key
    const newApiKey = {
      id: Date.now().toString(),
      name,
      provider,
      masked: maskApiKey(apiKey),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsed: null
    };

    res.status(201).json({ apiKey: newApiKey });
  } catch (error) {
    console.error('Add API key error:', error);
    res.status(500).json({ error: 'Failed to add API key' });
  }
});

// Delete user API key
router.delete('/api-keys/:keyId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { keyId } = req.params;

    // In a real app, you would delete from database
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

function maskApiKey(key: string): string {
  if (key.length <= 8) return key;
  return key.substring(0, 4) + '...' + key.substring(key.length - 6);
}

// Function to store user data (used by auth routes)
export function storeUser(userId: string, userData: any) {
  users.set(userId, {
    ...userData,
    lastLoginAt: new Date().toISOString(),
    preferences: {
      theme: 'dark',
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      minimap: true,
      autoSave: true,
    },
    statistics: {
      totalWorkspaces: 0,
      totalFiles: 0,
      totalCompilations: 0,
      totalAIRequests: 0,
    }
  });
}

export { router as userRoutes };