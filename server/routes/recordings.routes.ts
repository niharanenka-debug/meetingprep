import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

export const recordingsRouter = Router();

recordingsRouter.use(requireAuth);

// POST /api/recordings/:id/transcribe (Section 39)
recordingsRouter.post('/:id/transcribe', async (req: AuthenticatedRequest, res) => {
  const recording = db.getRecordingById(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const meeting = db.getMeetingById(recording.meetingId);
  if (!meeting) {
    res.status(404).json({ error: 'Associated meeting not found' });
    return;
  }
  const canAccessMeeting = db.getMeetings({ userId: req.user!.id })
    .some(visibleMeeting => visibleMeeting.id === meeting.id);
  if (!canAccessMeeting) {
    res.status(403).json({ error: 'You do not have access to this recording' });
    return;
  }

  res.status(409).json({ error: 'The uploaded audio is not retained for re-transcription. Upload the audio again from the meeting page.' });
});

// GET /api/recordings/:id
recordingsRouter.get('/:id', (req: AuthenticatedRequest, res) => {
  const recording = db.getRecordingById(req.params.id);
  if (!recording) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  const meeting = db.getMeetingById(recording.meetingId);
  const canAccessMeeting = meeting && db.getMeetings({ userId: req.user!.id })
    .some(visibleMeeting => visibleMeeting.id === meeting.id);
  if (!canAccessMeeting) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json(recording);
});
