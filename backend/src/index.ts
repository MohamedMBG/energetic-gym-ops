import 'dotenv/config';
import 'express-async-errors';

import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import { AppError } from './lib/errors';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import paymentRoutes from './routes/payments';
import settingsRoutes from './routes/settings';
import offerRoutes from './routes/offers';
import packRoutes from './routes/packs';
import equipmentRoutes from './routes/equipment';
import staffRoutes from './routes/staff';
import healthRoutes from './routes/health';
import { requireLicense } from './middleware/license';
import { ensureAdminAccount } from './lib/admin-bootstrap';

const app = express();
const PORT = process.env.PORT || 3001;

function parseAllowedOrigins() {
  const configured = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...configured, 'http://localhost:3000', 'http://localhost:5173']);
}

const allowedOrigins = parseAllowedOrigins();

function isPrivateDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:') return false;

    const host = url.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, Postman, mobile apps)
      if (!origin || allowedOrigins.has(origin) || isPrivateDevOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// License gate — applies to every /api route below (health above stays open).
app.use('/api', requireLicense);

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/staff', staffRoutes);

// Global error handler — handles AppError (typed HTTP errors) and unexpected crashes.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
});

async function start() {
  await ensureAdminAccount();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start backend');
  console.error(error);
  process.exit(1);
});
