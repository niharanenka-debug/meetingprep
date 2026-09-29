import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

export const issuesRouter = Router();

issuesRouter.use(requireAuth);

// Get unresolved issues (Section 29)
issuesRouter.get('/', (req: AuthenticatedRequest, res) => {
  const { status, meetingId } = req.query;
  const visibleMeetingIds = new Set(db.getMeetings({ userId: req.user!.id }).map(meeting => meeting.id));
  const list = db.getIssues({
    status: status as string | undefined,
    meetingId: meetingId as string | undefined,
  }).filter(issue => visibleMeetingIds.has(issue.meetingId));

  const enriched = list.map(i => {
    const meeting = db.getMeetingById(i.meetingId);
    return {
      ...i,
      meetingTitle: meeting?.title || 'Team Meeting',
      meetingDate: meeting?.scheduledAt,
    };
  });

  res.json(enriched);
});

// Update issue status
issuesRouter.put('/:id', (req: AuthenticatedRequest, res) => {
  const existing = db.getIssues().find(issue => issue.id === req.params.id);
  if (!existing || !db.getMeetings({ userId: req.user!.id }).some(meeting => meeting.id === existing.meetingId)) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }
  const isOwner = existing.ownerUserId === req.user!.id || existing.owner?.toLowerCase() === req.user!.name.toLowerCase();
  if (!isOwner && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'You cannot update this issue' });
    return;
  }
  const { status, owner, nextFollowUp } = req.body;
  const updated = db.updateIssue(req.params.id, {
    status: status ?? existing.status,
    owner: owner ?? existing.owner,
    nextFollowUp: nextFollowUp ?? existing.nextFollowUp,
  });

  if (!updated) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }
  res.json(updated);
});
