import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

export const commitmentsRouter = Router();

commitmentsRouter.use(requireAuth);

// Get all team commitments
commitmentsRouter.get('/', (req: AuthenticatedRequest, res) => {
  const { status, meetingId } = req.query;
  const visibleMeetingIds = new Set(db.getMeetings({ userId: req.user!.id }).map(meeting => meeting.id));
  const list = db.getCommitments({
    status: status as string | undefined,
    meetingId: meetingId as string | undefined,
  }).filter(commitment => visibleMeetingIds.has(commitment.meetingId));

  const enriched = list.map(c => {
    const meeting = db.getMeetingById(c.meetingId);
    return {
      ...c,
      meetingTitle: meeting?.title || 'Team Meeting',
      meetingDate: meeting?.scheduledAt,
    };
  });

  res.json(enriched);
});

// Get My Commitments
commitmentsRouter.get('/my', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const visibleMeetingIds = new Set(db.getMeetings({ userId: user.id }).map(meeting => meeting.id));
  const all = db.getCommitments();
  // Filter by userId or person matching user's name
  const my = all.filter(c => visibleMeetingIds.has(c.meetingId) && (c.personUserId === user.id || c.person.toLowerCase() === user.name.toLowerCase()));

  const enriched = my.map(c => {
    const meeting = db.getMeetingById(c.meetingId);
    return {
      ...c,
      meetingTitle: meeting?.title || 'Team Meeting',
      meetingDate: meeting?.scheduledAt,
    };
  });

  res.json(enriched);
});

// Update commitment status
commitmentsRouter.put('/:id', (req: AuthenticatedRequest, res) => {
  const existing = db.getCommitments().find(commitment => commitment.id === req.params.id);
  if (!existing || !db.getMeetings({ userId: req.user!.id }).some(meeting => meeting.id === existing.meetingId)) {
    res.status(404).json({ error: 'Commitment not found' });
    return;
  }
  const belongsToUser = existing.personUserId === req.user!.id || existing.person.toLowerCase() === req.user!.name.toLowerCase();
  if (!belongsToUser && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'You cannot update this commitment' });
    return;
  }
  const { status, deadline, commitment } = req.body;
  const updated = db.updateCommitment(req.params.id, {
    status: status ?? existing.status,
    deadline: deadline ?? existing.deadline,
    commitment: commitment ?? existing.commitment,
  });
  if (!updated) {
    res.status(404).json({ error: 'Commitment not found' });
    return;
  }
  res.json(updated);
});
