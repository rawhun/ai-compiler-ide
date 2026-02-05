import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter for demo
const requests = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requests.entries()) {
    if (now > value.resetTime) {
      requests.delete(key);
    }
  }
}, 60 * 1000); // Cleanup every minute

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Use req.ip first (Express sets this based on trust proxy settings)
  // Fallback to socket.remoteAddress (req.connection is deprecated)
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  const userRequests = requests.get(ip);
  
  if (!userRequests || now > userRequests.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (userRequests.count >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
    });
  }

  userRequests.count++;
  next();
};