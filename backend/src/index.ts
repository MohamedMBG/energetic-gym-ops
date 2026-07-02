import 'express-async-errors';
import * as dotenv from 'dotenv';
dotenv.config();

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
import healthRoutes from './routes/health';
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

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, Postman, mobile apps)
      if (!origin || allowedOrigins.has(origin)) {
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
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/equipment', equipmentRoutes);

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
