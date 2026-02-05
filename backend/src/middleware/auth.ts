import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

/**
 * Authenticate JWT token from Authorization header.
 * Token format: mock-jwt-token-{userId}-{timestamp}
 * For Google OAuth: mock-jwt-token-{googleUserId}-{timestamp}
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  // For demo purposes, accept any token that starts with 'mock-jwt-token'
  if (token.startsWith('mock-jwt-token')) {
    // Extract user ID from token: mock-jwt-token-{userId}-{timestamp}
    // Format: mock-jwt-token-{userId}-{timestamp} or mock-jwt-token-{timestamp}
    const tokenParts = token.split('-');
    let userId = '1'; // default fallback
    
    if (tokenParts.length >= 5) {
      // Token format: mock-jwt-token-{userId}-{timestamp}
      // tokenParts = ['mock', 'jwt', 'token', '{userId}', '{timestamp}']
      // For Google OAuth: ['mock', 'jwt', 'token', '{googleUserId}', '{timestamp}']
      // The userId could be multiple parts joined by '-' (like Google user IDs)
      const timestampPart = tokenParts[tokenParts.length - 1];
      const userIdParts = tokenParts.slice(3, -1); // Everything between 'token' and timestamp
      
      // Validate timestamp is actually a number (to ensure we're parsing correctly)
      if (!isNaN(Number(timestampPart)) && userIdParts.length > 0) {
        userId = userIdParts.join('-');
      }
    } else if (tokenParts.length === 4) {
      // Simple format: mock-jwt-token-{timestamp}
      // Use default userId
      userId = '1';
    }
    
    (req as AuthRequest).user = {
      userId: userId,
      email: 'demo@example.com'
    };
    next();
  } else {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};
