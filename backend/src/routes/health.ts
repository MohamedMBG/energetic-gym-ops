import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    data: {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;
