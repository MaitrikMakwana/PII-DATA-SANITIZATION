import 'dotenv/config';
import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import morgan       from 'morgan';
import rateLimit    from 'express-rate-limit';

import authRoutes   from './routes/auth.routes';
import adminRoutes  from './routes/admin';
import userRoutes   from './routes/user';
import { errorHandler } from './middleware/error.middleware';

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ─── Trust proxy (correct IP behind load balancers/Render/Railway) ───
app.set('trust proxy', 1);

// ─── Security headers ─────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────
app.use(
  cors({
    origin:      process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Request logging ──────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body parsing ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Auth rate limiting (brute-force protection) ─────────
app.use(
  '/api/auth',
  rateLimit({
    windowMs:         15 * 60 * 1000, // 15 minutes
    max:              20,
    standardHeaders:  true,
    legacyHeaders:    false,
    message:          { error: 'Too many requests. Please try again later.' },
  }),
);

// ─── Upload rate limiting ─────────────────────────────────
app.use(
  '/api/admin/files/upload',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max:      10,
    message:  { error: 'Upload rate limit reached. Please wait.' },
  }),
);

// ─── Health check ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/admin', adminRoutes);   // ADMIN only (auth + RBAC applied in router)
app.use('/api',       userRoutes);    // Standard users (auth applied in router)

// ─── 404 ──────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
