import { Router, type Request, type Response, type NextFunction } from 'express';
import { db } from '../db.js';
import { mistralService } from '../services/mistralService.js';
import { env } from '../config/env.js';
import { requireAuth } from '../auth.js';

export const demoRouter = Router();

demoRouter.use(requireAuth);
demoRouter.use((_req: Request, res: Response, next: NextFunction) => {
  if (env.DEMO_AUTH_ENABLED !== 'true' || env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Demo endpoints are disabled' });
    return;
  }
  next();
});

demoRouter.post('/reset', (req, res) => {
  db.resetToDemo();
  res.json({
    success: true,
    message: 'Demo database has been reset to initial state with Maroof, Ayesha, Rahul, Sarah and Project Alpha meetings.',
  });
});

demoRouter.post('/seed', (req, res) => {
  db.seedDemoData();
  res.json({ success: true, message: 'Demo data verified and seeded' });
});

demoRouter.get('/status', (req, res) => {
  const aiStatus = mistralService.getProviderStatus();
  const users = db.getUsers();
  const meetings = db.getMeetings();
  const tasks = db.getTasks();
  const decisions = db.getDecisions();

  res.json({
    ai: aiStatus,
    stats: {
      usersCount: users.length,
      meetingsCount: meetings.length,
      tasksCount: tasks.length,
      decisionsCount: decisions.length,
    },
  });
});
