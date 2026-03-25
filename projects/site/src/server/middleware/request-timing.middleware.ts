import type { Request, Response, NextFunction } from 'express';

/**
 * Logs total time from request start until the response finishes sending.
 */
export function requestTimingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (process.env['NODE_ENV'] === 'production') {
      if (ms > 3000) {
        console.warn(`[slow] ${req.method} ${req.originalUrl} ${ms}ms`);
      }
    } else {
      console.log(`[timing] ${req.method} ${req.originalUrl} ${ms}ms`);
    }
  });
  next();
}
