import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

export const decisionsRouter = Router();

decisionsRouter.use(requireAuth);

// Get decisions log (Section 28)
decisionsRouter.get('/', (req: AuthenticatedRequest, res) => {
  const { meetingId } = req.query;
  const visibleMeetingIds = new Set(db.getMeetings({ userId: req.user!.id }).map(meeting => meeting.id));
  const list = db.getDecisions(meetingId as string | undefined)
    .filter(decision => visibleMeetingIds.has(decision.meetingId));

  const enriched = list.map(d => {
    const meeting = db.getMeetingById(d.meetingId);
    return {
      ...d,
      meetingTitle: meeting?.title || 'Team Meeting',
      meetingDate: meeting?.scheduledAt,
    };
  });

  res.json(enriched);
});

// Add manual decision
decisionsRouter.post('/', (req: AuthenticatedRequest, res) => {
  const { meetingId, decision, context, status } = req.body;
  if (!decision || !meetingId) {
    res.status(400).json({ error: 'Meeting ID and decision statement are required' });
    return;
  }
  if (!db.getMeetings({ userId: req.user!.id }).some(meeting => meeting.id === meetingId)) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const newDec = db.addDecision({
    meetingId,
    decision,
    context: context || '',
    status: status || 'AGREED',
  });

  res.status(201).json(newDec);
});
