import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req:  Request,
  res:   Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  console.error('[Error]', err.message);

  // Multer errors
  if (err.name === 'MulterError' || err.message?.startsWith('Unsupported file type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Zod parse errors surfaced via throw
  if (err.name === 'ZodError') {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
};
