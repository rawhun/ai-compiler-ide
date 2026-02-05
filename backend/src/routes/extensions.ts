import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Mock extensions data
const mockExtensions = [
  {
    id: 'prettier-formatter',
    name: 'Prettier Code Formatter',
    description: 'Automatically format your code with Prettier',
    version: '1.0.0',
    author: 'Prettier Team',
    category: 'formatters',
    tags: ['formatting', 'javascript', 'typescript'],
    downloads: 15420,
    rating: 4.8,
    isInstalled: false,
    isEnabled: false,
    permissions: ['file:read', 'file:write'],
    manifest: {
      main: 'dist/extension.js',
      contributes: {
        commands: [
          {
            command: 'prettier.format',
            title: 'Format Document'
          }
        ],
        languages: ['javascript', 'typescript', 'json', 'css', 'html']
      }
    }
  },
  {
    id: 'eslint-linter',
    name: 'ESLint',
    description: 'JavaScript and TypeScript linting',
    version: '2.1.0',
    author: 'ESLint Team',
    category: 'linters',
    tags: ['linting', 'javascript', 'typescript'],
    downloads: 23150,
    rating: 4.6,
    isInstalled: true,
    isEnabled: true,
    permissions: ['file:read', 'diagnostics:write'],
    manifest: {
      main: 'dist/extension.js',
      contributes: {
        commands: [
          {
            command: 'eslint.fix',
            title: 'Fix ESLint Problems'
          }
        ],
        languages: ['javascript', 'typescript']
      }
    }
  }
];

// Get available extensions
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search, installed } = req.query;
    let extensions = [...mockExtensions];

    // Filter by category
    if (category && category !== 'all') {
      extensions = extensions.filter(ext => ext.category === category);
    }

    // Filter by search term
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      extensions = extensions.filter(ext => 
        ext.name.toLowerCase().includes(searchTerm) ||
        ext.description.toLowerCase().includes(searchTerm) ||
        ext.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by installation status
    if (installed === 'true') {
      extensions = extensions.filter(ext => ext.isInstalled);
    } else if (installed === 'false') {
      extensions = extensions.filter(ext => !ext.isInstalled);
    }

    res.json({ extensions });
  } catch (error) {
    console.error('Get extensions error:', error);
    res.status(500).json({ error: 'Failed to get extensions' });
  }
});

// Get extension details
router.get('/:extensionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { extensionId } = req.params;
    const extension = mockExtensions.find(ext => ext.id === extensionId);

    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    res.json({ extension });
  } catch (error) {
    console.error('Get extension error:', error);
    res.status(500).json({ error: 'Failed to get extension' });
  }
});

// Install extension
router.post('/:extensionId/install', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { extensionId } = req.params;
    const userId = req.user.userId;

    const extension = mockExtensions.find(ext => ext.id === extensionId);
    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    // Mock installation process
    extension.isInstalled = true;
    extension.isEnabled = true;

    res.json({ 
      message: 'Extension installed successfully',
      extension 
    });
  } catch (error) {
    console.error('Install extension error:', error);
    res.status(500).json({ error: 'Failed to install extension' });
  }
});

// Uninstall extension (POST method)
router.post('/:extensionId/uninstall', async (req: AuthRequest, res: Response) => {
  try {
    const { extensionId } = req.params;
    const userId = req.user.userId;

    const extension = mockExtensions.find(ext => ext.id === extensionId);
    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    // Mock uninstallation process
    extension.isInstalled = false;
    extension.isEnabled = false;

    res.json({ 
      message: 'Extension uninstalled successfully',
      extension 
    });
  } catch (error) {
    console.error('Uninstall extension error:', error);
    res.status(500).json({ error: 'Failed to uninstall extension' });
  }
});

// Uninstall extension (DELETE method - for REST compatibility)
router.delete('/:extensionId/install', async (req: AuthRequest, res: Response) => {
  try {
    const { extensionId } = req.params;
    const userId = req.user.userId;

    const extension = mockExtensions.find(ext => ext.id === extensionId);
    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    // Mock uninstallation process
    extension.isInstalled = false;
    extension.isEnabled = false;

    res.json({ 
      message: 'Extension uninstalled successfully',
      extension 
    });
  } catch (error) {
    console.error('Uninstall extension error:', error);
    res.status(500).json({ error: 'Failed to uninstall extension' });
  }
});

// Enable/disable extension
router.post('/:extensionId/toggle', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { extensionId } = req.params;
    const { enabled } = req.body;
    const userId = req.user.userId;

    const extension = mockExtensions.find(ext => ext.id === extensionId);
    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    if (!extension.isInstalled) {
      res.status(400).json({ error: 'Extension must be installed first' });
      return;
    }

    extension.isEnabled = enabled;

    res.json({ 
      message: `Extension ${enabled ? 'enabled' : 'disabled'} successfully`,
      extension 
    });
  } catch (error) {
    console.error('Toggle extension error:', error);
    res.status(500).json({ error: 'Failed to toggle extension' });
  }
});

// Get extension categories
router.get('/meta/categories', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = [
      { id: 'all', name: 'All Extensions', count: mockExtensions.length },
      { id: 'formatters', name: 'Formatters', count: mockExtensions.filter(e => e.category === 'formatters').length },
      { id: 'linters', name: 'Linters', count: mockExtensions.filter(e => e.category === 'linters').length },
      { id: 'themes', name: 'Themes', count: mockExtensions.filter(e => e.category === 'themes').length },
      { id: 'languages', name: 'Languages', count: mockExtensions.filter(e => e.category === 'languages').length },
      { id: 'debuggers', name: 'Debuggers', count: mockExtensions.filter(e => e.category === 'debuggers').length },
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Execute extension command
router.post('/:extensionId/commands/:commandId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { extensionId, commandId } = req.params;
    const { args } = req.body;
    const userId = req.user.userId;

    const extension = mockExtensions.find(ext => ext.id === extensionId);
    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    if (!extension.isInstalled || !extension.isEnabled) {
      res.status(400).json({ error: 'Extension must be installed and enabled' });
      return;
    }

    // Mock command execution
    const result = {
      commandId,
      extensionId,
      success: true,
      output: `Command ${commandId} executed successfully`,
      timestamp: new Date().toISOString()
    };

    res.json({ result });
  } catch (error) {
    console.error('Execute command error:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

export { router as extensionRoutes };