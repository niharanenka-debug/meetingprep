import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

// GET /api/notifications (Section 39)
notificationsRouter.get('/', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notifs = db.getNotifications(user.id);
  res.json(notifs);
});

// PUT /api/notifications/:id/read (Section 39)
notificationsRouter.put('/:id/read', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const success = db.markNotificationAsRead(req.params.id, user.id);
  if (!success) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  res.json({ success: true });
});

// PUT /api/notifications/read-all
notificationsRouter.put('/read-all', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  db.markAllNotificationsAsRead(user.id);
  res.json({ success: true });
});
