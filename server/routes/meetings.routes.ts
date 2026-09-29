import { Router } from 'express';
import multer from 'multer';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { mistralService } from '../services/mistralService.js';
import { transcriptionService } from '../services/transcriptionService.js';
import type { ActionItem } from '../types.js';

export const meetingsRouter = Router();

meetingsRouter.use(requireAuth);

meetingsRouter.param('id', (req: AuthenticatedRequest, res, next, id) => {
  const meeting = db.getMeetingById(id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const userCanAccessMeeting = db.getMeetings({ userId: req.user!.id })
    .some(visibleMeeting => visibleMeeting.id === meeting.id);
  if (!userCanAccessMeeting) {
    res.status(403).json({ error: 'You do not have access to this meeting' });
    return;
  }

  next();
});

// Multer memory storage for audio upload (Max 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// List meetings
meetingsRouter.get('/', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { teamId, status, search } = req.query;

  const meetings = db.getMeetings({
    userId: user.id,
    teamId: teamId as string | undefined,
    status: status as string | undefined,
    search: search as string | undefined,
  });

  const enriched = meetings.map(m => {
    const participants = db.getMeetingParticipants(m.id);
    const hasBrief = !!db.getMeetingBrief(m.id);
    const hasMom = !!db.getMeetingMom(m.id);
    const actionItemsCount = db.getActionItems(m.id).length;
    const recordingsCount = db.getRecordings(m.id).length;
    return {
      ...m,
      participants,
      hasBrief,
      hasMom,
      actionItemsCount,
      recordingsCount,
    };
  });

  res.json(enriched);
});

// Create meeting
meetingsRouter.post('/', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { teamId, title, description, scheduledAt, duration, location, participantUserIds } = req.body;

  if (!title || !scheduledAt) {
    res.status(400).json({ error: 'Title and scheduled date are required' });
    return;
  }

  let targetTeamId = teamId;
  if (!targetTeamId) {
    const userTeams = db.getUserTeams(user.id);
    if (userTeams.length > 0) targetTeamId = userTeams[0].id;
    else {
      res.status(400).json({ error: 'Team ID is required' });
      return;
    }
  }

  if (!db.isUserInTeam(user.id, targetTeamId) && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'You cannot create meetings in this team' });
    return;
  }

  const teamMemberIds = db.getTeamMembers(targetTeamId).map(member => member.userId);
  const participantIds = Array.isArray(participantUserIds) ? participantUserIds : [user.id];
  if (participantIds.some((participantId: string) => !teamMemberIds.includes(participantId))) {
    res.status(400).json({ error: 'All meeting participants must belong to the selected team' });
    return;
  }

  const meeting = db.createMeeting({
    teamId: targetTeamId,
    title,
    description: description || '',
    scheduledAt,
    duration: duration ? parseInt(duration, 10) : 30,
    location,
    participantUserIds: participantIds,
    createdBy: user.id,
  });

  res.status(201).json(meeting);
});

// Get meeting details with all relational data
meetingsRouter.get('/:id', (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const participants = db.getMeetingParticipants(meeting.id);
  const brief = db.getMeetingBrief(meeting.id);
  const mom = db.getMeetingMom(meeting.id);
  const decisions = db.getDecisions(meeting.id);
  const commitments = db.getCommitments({ meetingId: meeting.id });
  const issues = db.getIssues({ meetingId: meeting.id });
  const actionItems = db.getActionItems(meeting.id);
  const tasks = db.getTasks({ meetingId: meeting.id });
  const recordings = db.getRecordings(meeting.id);
  const transcript = db.getLatestTranscript(meeting.id);
  const memories = db.getMeetingMemories(meeting.id);

  // Completeness score
  const completeness = mistralService.calculateCompleteness(decisions, actionItems, mom?.unresolvedIssues || []);

  res.json({
    ...meeting,
    participants,
    brief,
    mom,
    decisions,
    commitments,
    issues,
    actionItems,
    tasks,
    recordings,
    transcript: transcript?.content || meeting.transcript,
    transcriptApproved: transcript?.approved ?? false,
    transcriptVersion: transcript?.version || 1,
    memories,
    completeness,
  });
});

// Update meeting
meetingsRouter.put('/:id', (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }
  if (meeting.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only the meeting creator or an administrator can edit this meeting' });
    return;
  }

  const { title, description, scheduledAt, location, status, transcript } = req.body;
  const updated = db.updateMeeting(meeting.id, {
    title: title ?? meeting.title,
    description: description ?? meeting.description,
    scheduledAt: scheduledAt ?? meeting.scheduledAt,
    location: location ?? meeting.location,
    status: status ?? meeting.status,
    transcript: transcript ?? meeting.transcript,
  });

  res.json(updated);
});

// Delete meeting
meetingsRouter.delete('/:id', (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id)!;
  if (meeting.createdBy !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only the meeting creator or an administrator can delete this meeting' });
    return;
  }
  const success = db.deleteMeeting(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }
  res.json({ success: true });
});

// ==========================================
// VOICE RECORDING & TRANSCRIPTION WORKFLOW
// ==========================================

// Upload audio file or browser recording (Section 6, 8, 42)
meetingsRouter.post('/:id/recordings', upload.single('audio'), async (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No audio file provided' });
    return;
  }

  const mimeType = req.file.mimetype || 'audio/webm';
  if (!transcriptionService.validateAudioMimeType(mimeType)) {
    res.status(400).json({ error: `Invalid format ${mimeType}. Please upload MP3, WAV, M4A, or WEBM audio.` });
    return;
  }

  const recording = db.addRecording({
    meetingId: meeting.id,
    uploadedBy: req.user!.id,
    fileName: req.file.originalname || `meeting_recording_${Date.now()}.webm`,
    mimeType,
    duration: null,
    storagePath: `/secure_recordings/${meeting.id}/${Date.now()}.webm`,
    transcriptionStatus: 'UPLOADED',
  });

  // Automatically trigger transcription
  db.updateRecording(recording.id, { transcriptionStatus: 'TRANSCRIBING' });

  try {
    const transcriptResult = await transcriptionService.transcribeAudio(
      req.file.buffer,
      mimeType,
      recording.fileName
    );

    db.updateRecording(recording.id, {
      transcriptionStatus: 'COMPLETED',
      transcribedAt: new Date().toISOString(),
      duration: transcriptResult.duration || null,
    });

    // Save transcript version (Section 10, 15)
    const transcriptRecord = db.saveMeetingTranscript({
      meetingId: meeting.id,
      recordingId: recording.id,
      content: transcriptResult.text,
      language: transcriptResult.language,
      approved: false, // human review required first!
    });

    res.status(201).json({
      recording: db.getRecordingById(recording.id),
      transcript: transcriptRecord,
      segments: transcriptResult.segments,
    });
  } catch (err: any) {
    console.error('Transcription error:', err);
    db.updateRecording(recording.id, { transcriptionStatus: 'FAILED' });
    res.status(500).json({ error: 'Audio transcription failed. Please retry or enter the transcript manually.' });
  }
});

// Get meeting recordings
meetingsRouter.get('/:id/recordings', (req: AuthenticatedRequest, res) => {
  const list = db.getRecordings(req.params.id);
  res.json(list);
});

// Get approved or latest transcript (Section 10)
meetingsRouter.get('/:id/transcript', (req: AuthenticatedRequest, res) => {
  const transcript = db.getLatestTranscript(req.params.id);
  if (!transcript) {
    const meeting = db.getMeetingById(req.params.id);
    res.json({
      content: meeting?.transcript || '',
      approved: false,
      version: 1,
    });
    return;
  }
  res.json(transcript);
});

// Save human-reviewed transcript (Section 10: "AI should analyze the USER-APPROVED transcript")
meetingsRouter.put('/:id/transcript', (req: AuthenticatedRequest, res) => {
  const { content, approved } = req.body;
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'Transcript content is required' });
    return;
  }

  const saved = db.saveMeetingTranscript({
    meetingId: req.params.id,
    content: content.trim(),
    approved: approved ?? true,
  });

  res.json(saved);
});

// ==========================================
// MEETING PREPARATION & "WHAT CHANGED"
// ==========================================

// What Changed Since Last Meeting? (Section 18, 19)
meetingsRouter.post('/:id/what-changed', (req: AuthenticatedRequest, res) => {
  const report = db.getSinceLastMeetingReport(req.params.id);
  if (!report) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }
  res.json(report);
});

// Prepare Me (Section 20, 21)
meetingsRouter.post('/:id/prepare', async (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  try {
    const allTeamMeetings = db.getMeetings({ teamId: meeting.teamId })
      .filter(m => m.id !== meeting.id && new Date(m.scheduledAt) < new Date(meeting.scheduledAt));
    const previousMeetingIds = new Set(allTeamMeetings.map(previousMeeting => previousMeeting.id));

    const pastDecisions = db.getDecisions().filter(d => allTeamMeetings.some(m => m.id === d.meetingId)).map(d => {
      const src = allTeamMeetings.find(m => m.id === d.meetingId);
      return { id: d.id, decision: d.decision, meetingTitle: src?.title || 'Previous Meeting', date: d.createdAt };
    });

    const pendingCommitments = db.getCommitments().filter(c =>
      previousMeetingIds.has(c.meetingId) && (c.status === 'PENDING' || c.status === 'IN_PROGRESS')
    ).map(c => {
      const src = allTeamMeetings.find(m => m.id === c.meetingId);
      return { id: c.id, commitment: c.commitment, person: c.person, meetingTitle: src?.title || 'Previous Meeting', dueDate: c.deadline };
    });

    const overdueTasks = db.getTasks().filter(t =>
      t.meetingId && previousMeetingIds.has(t.meetingId) && t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date()
    ).map(t => ({
      id: t.id,
      task: t.title,
      person: db.getUserById(t.assignedTo)?.name || 'Unassigned',
      dueDate: t.dueDate,
    }));

    const openIssues = db.getIssues().filter(i =>
      previousMeetingIds.has(i.meetingId) && (i.status === 'OPEN' || i.status === 'IN_PROGRESS')
    ).map(i => ({
      id: i.id,
      issue: i.issue,
      owner: i.owner,
      lastDiscussed: i.lastDiscussed,
    }));

    const participants = db.getMeetingParticipants(meeting.id).map(p => p.user.name);

    const brief = await mistralService.generateMeetingBrief({
      targetMeeting: meeting,
      previousMeetings: allTeamMeetings.map(m => ({ title: m.title, date: m.scheduledAt })),
      previousDecisions: pastDecisions,
      pendingCommitments,
      overdueTasks,
      openIssues,
      participants,
    });

    db.saveMeetingBrief(meeting.id, brief);
    res.json(brief);
  } catch (err: any) {
    console.error('Error generating brief:', err);
    res.status(500).json({ error: 'Unable to prepare this meeting brief right now. Please try again.' });
  }
});

// ==========================================
// MOM GENERATION & HUMAN APPROVAL
// ==========================================

// Generate MOM from approved transcript (Section 23, 24)
meetingsRouter.post('/:id/generate-mom', async (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }
  if (db.getMeetingMom(meeting.id)?.reviewed) {
    res.status(409).json({ error: 'This meeting already has approved minutes. Create a new meeting to generate another set.' });
    return;
  }

  let transcriptToAnalyze: unknown = req.body.transcript;
  if (transcriptToAnalyze === undefined) {
    const latest = db.getLatestTranscript(meeting.id);
    transcriptToAnalyze = latest?.content || meeting.transcript;
  }

  if (typeof transcriptToAnalyze !== 'string' || transcriptToAnalyze.trim().length === 0) {
    res.status(400).json({ error: 'No transcript available. Record audio or enter transcript first.' });
    return;
  }
  const transcript = transcriptToAnalyze.trim();

  try {
    const knownUsers = db.getTeamMembers(meeting.teamId).flatMap(member => {
      const knownUser = db.getUserById(member.userId);
      return knownUser ? [knownUser] : [];
    });
    const momPayload = await mistralService.generateMOM({
      meetingTitle: meeting.title,
      transcript,
      knownUsers,
    });

    if (req.body.transcript !== undefined) {
      db.saveMeetingTranscript({
        meetingId: meeting.id,
        content: transcript,
        approved: false,
      });
    }

    // Save as draft MOM (Section 25: Human Review Required)
    const draftMom = db.saveMeetingMom({
      meetingId: meeting.id,
      summary: momPayload.summary,
      discussionPoints: momPayload.discussionPoints,
      unresolvedIssues: momPayload.unresolvedIssues,
      generatedAt: new Date().toISOString(),
      generatedByModel: mistralService.getProviderStatus().activeBackend,
      reviewed: false, // human review required!
    });

    // Save action items in draft PENDING status
    const createdActionItems = [];
    for (const existingItem of db.getActionItems(meeting.id)) {
      if (existingItem.status === 'PENDING') {
        db.updateActionItem(existingItem.id, { status: 'REJECTED' });
      }
    }
    for (const item of momPayload.actionItems) {
      let matchedUser = knownUsers.find(
        u => u.name.toLowerCase() === (item.assigneeName || '').toLowerCase()
      );

      const act = db.addActionItem({
        meetingId: meeting.id,
        title: item.title,
        description: item.description,
        assignedTo: matchedUser?.id || null,
        suggestedName: matchedUser?.name || item.assigneeName || null,
        deadline: item.deadline || 'Next Sprint',
        priority: item.priority || 'MEDIUM',
        confidence: item.confidence,
        needsConfirmation: item.needsConfirmation || !matchedUser,
        status: 'PENDING',
      });
      createdActionItems.push(act);
    }

    // Save decisions
    const createdDecisions = [];
    const existingDecisionKeys = new Set(db.getDecisions(meeting.id).map(decision => decision.decision.trim().toLowerCase()));
    for (const d of momPayload.decisions) {
      const key = d.decision.trim().toLowerCase();
      if (existingDecisionKeys.has(key)) continue;
      const dec = db.addDecision({
        meetingId: meeting.id,
        decision: d.decision,
        context: d.context,
        status: 'AGREED',
      });
      createdDecisions.push(dec);
      existingDecisionKeys.add(key);
    }

    // Save unresolved issues
    const existingIssueKeys = new Set(db.getIssues({ meetingId: meeting.id }).map(issue => issue.issue.trim().toLowerCase()));
    for (const issueText of momPayload.unresolvedIssues) {
      const key = issueText.trim().toLowerCase();
      if (existingIssueKeys.has(key)) continue;
      db.addIssue({
        meetingId: meeting.id,
        issue: issueText,
        status: 'OPEN',
        lastDiscussed: new Date().toISOString(),
      });
      existingIssueKeys.add(key);
    }

    const completeness = mistralService.calculateCompleteness(createdDecisions, createdActionItems, momPayload.unresolvedIssues);

    res.json({
      mom: draftMom,
      actionItems: createdActionItems,
      decisions: createdDecisions,
      unresolvedIssues: momPayload.unresolvedIssues,
      completeness,
    });
  } catch (err: any) {
    console.error('Error generating MOM:', err);
    res.status(500).json({ error: 'Unable to generate meeting minutes right now. Please try again.' });
  }
});

// Approve MOM and Automatically Create Tasks & Commitments (Section 25, 26)
meetingsRouter.post('/:id/approve-mom', (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const existingMom = db.getMeetingMom(meeting.id);
  if (!existingMom) {
    res.status(400).json({ error: 'Generate the meeting minutes before approving action items' });
    return;
  }
  if (existingMom.reviewed) {
    res.status(409).json({ error: 'Meeting minutes have already been approved' });
    return;
  }

  const { items } = req.body;
  const persistedItems = db.getActionItems(meeting.id);
  const requestedItems: unknown = items === undefined
    ? persistedItems.filter(item => item.status !== 'REJECTED')
    : items;
  if (!Array.isArray(requestedItems)) {
    res.status(400).json({ error: 'Action items must be a list' });
    return;
  }

  const teamMemberIds = new Set(db.getTeamMembers(meeting.teamId).map(member => member.userId));
  const itemsToConvert: ActionItem[] = [];
  for (const requestedItem of requestedItems) {
    if (!requestedItem || typeof requestedItem.id !== 'string') {
      res.status(400).json({ error: 'Every approved action item must have a valid ID' });
      return;
    }
    const persisted = persistedItems.find(item => item.id === requestedItem.id);
    if (!persisted) {
      res.status(400).json({ error: 'An action item does not belong to this meeting' });
      return;
    }
    if (persisted.status === 'REJECTED') continue;

    const assignedTo = requestedItem.assignedTo === undefined ? persisted.assignedTo : requestedItem.assignedTo;
    if (assignedTo && !teamMemberIds.has(assignedTo)) {
      res.status(400).json({ error: 'Action item assignees must belong to this meeting team' });
      return;
    }
    if (requestedItem.priority && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(requestedItem.priority)) {
      res.status(400).json({ error: 'An action item has an invalid priority' });
      return;
    }
    itemsToConvert.push({
      ...persisted,
      title: typeof requestedItem.title === 'string' && requestedItem.title.trim() ? requestedItem.title.trim() : persisted.title,
      description: typeof requestedItem.description === 'string' ? requestedItem.description : persisted.description,
      assignedTo,
      deadline: typeof requestedItem.deadline === 'string' ? requestedItem.deadline : persisted.deadline,
      priority: requestedItem.priority || persisted.priority,
    });
  }

  // Mark MOM as reviewed & approved
  if (existingMom) {
    db.saveMeetingMom({
      ...existingMom,
      reviewed: true,
    });
  }

  // Update meeting status to COMPLETED
  db.updateMeeting(meeting.id, { status: 'COMPLETED' });

  const createdTasks = [];
  const createdCommitments = [];

  for (const item of itemsToConvert) {
    if (!item.assignedTo) continue;

    // Convert relative deadline to ISO date if needed
    let dueDate = item.deadline;
    if (!dueDate || !dueDate.includes('-')) {
      dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Create persistent task
    const task = db.createTask({
      actionItemId: item.id || null,
      meetingId: meeting.id,
      assignedTo: item.assignedTo,
      title: item.title,
      description: item.description || `Deliverable from ${meeting.title}`,
      priority: item.priority || 'MEDIUM',
      dueDate,
      status: 'TODO',
    });
    createdTasks.push(task);

    // Create commitment record
    const user = db.getUserById(item.assignedTo);
    const commitment = db.addCommitment({
      meetingId: meeting.id,
      person: user?.name || item.suggestedName || 'Team Member',
      personUserId: item.assignedTo,
      commitment: item.title,
      deadline: dueDate,
      status: 'PENDING',
    });
    createdCommitments.push(commitment);

    // Update ActionItem status to CONVERTED
    if (item.id) {
      db.updateActionItem(item.id, { status: 'CONVERTED' });
    }
  }

  res.json({
    success: true,
    createdTasksCount: createdTasks.length,
    createdCommitmentsCount: createdCommitments.length,
    tasks: createdTasks,
    commitments: createdCommitments,
  });
});

meetingsRouter.put('/:id/action-items/:actionItemId', (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id)!;
  const actionItem = db.getActionItems(meeting.id).find(item => item.id === req.params.actionItemId);
  if (!actionItem) {
    res.status(404).json({ error: 'Action item not found' });
    return;
  }

  const { title, description, assignedTo, deadline, priority, confidence, needsConfirmation, status } = req.body;
  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    res.status(400).json({ error: 'Action item title is required' });
    return;
  }
  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
    res.status(400).json({ error: 'Invalid action item priority' });
    return;
  }
  if (status !== undefined && !['PENDING', 'CONFIRMED', 'REJECTED', 'CONVERTED'].includes(status)) {
    res.status(400).json({ error: 'Invalid action item status' });
    return;
  }
  if (assignedTo && !db.getTeamMembers(meeting.teamId).some(member => member.userId === assignedTo)) {
    res.status(400).json({ error: 'Assignee must belong to this meeting team' });
    return;
  }
  if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
    res.status(400).json({ error: 'Confidence must be between 0 and 1' });
    return;
  }

  const updated = db.updateActionItem(actionItem.id, {
    title: title?.trim() ?? actionItem.title,
    description: description ?? actionItem.description,
    assignedTo: assignedTo === undefined ? actionItem.assignedTo : assignedTo,
    deadline: deadline ?? actionItem.deadline,
    priority: priority ?? actionItem.priority,
    confidence: confidence ?? actionItem.confidence,
    needsConfirmation: needsConfirmation ?? actionItem.needsConfirmation,
    status: status ?? actionItem.status,
  });
  res.json(updated);
});

// AI Follow-Up Generator (Section 30)
meetingsRouter.post('/:id/generate-follow-up', async (req: AuthenticatedRequest, res) => {
  const meeting = db.getMeetingById(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const mom = db.getMeetingMom(meeting.id);
  if (!mom) {
    res.status(400).json({ error: 'Please generate and approve MOM before creating a follow-up' });
    return;
  }

  const decisions = db.getDecisions(meeting.id);
  const actionItems = db.getActionItems(meeting.id);

  try {
    const followUp = await mistralService.generateFollowUp({
      meetingTitle: meeting.title,
      mom,
      decisions,
      actionItems,
    });
    res.json(followUp);
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to generate a follow-up right now. Please try again.' });
  }
});

// GET /api/meetings/:id/mom (Section 39)
meetingsRouter.get('/:id/mom', (req: AuthenticatedRequest, res) => {
  const mom = db.getMeetingMom(req.params.id);
  if (!mom) {
    res.status(404).json({ error: 'MOM not found for this meeting' });
    return;
  }
  res.json(mom);
});

// PUT /api/meetings/:id/mom (Section 39)
meetingsRouter.put('/:id/mom', (req: AuthenticatedRequest, res) => {
  const existing = db.getMeetingMom(req.params.id);
  const { summary, discussionPoints, unresolvedIssues, reviewed } = req.body;
  const saved = db.saveMeetingMom({
    meetingId: req.params.id,
    summary: summary ?? existing?.summary ?? '',
    discussionPoints: discussionPoints ?? existing?.discussionPoints ?? [],
    unresolvedIssues: unresolvedIssues ?? existing?.unresolvedIssues ?? [],
    generatedAt: existing?.generatedAt ?? new Date().toISOString(),
    generatedByModel: existing?.generatedByModel ?? 'Mistral AI',
    reviewed: reviewed ?? existing?.reviewed ?? true,
  });
  res.json(saved);
});

// GET /api/meetings/:id/memories
meetingsRouter.get('/:id/memories', (req: AuthenticatedRequest, res) => {
  const memories = db.getMeetingMemories(req.params.id);
  res.json(memories);
});

// POST /api/meetings/:id/memories
meetingsRouter.post('/:id/memories', (req: AuthenticatedRequest, res) => {
  const { memoryType, content, importance } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Content is required' });
    return;
  }
  const meeting = db.getMeetingById(req.params.id);
  const memory = db.addMeetingMemory({
    meetingId: req.params.id,
    teamId: meeting?.teamId,
    memoryType: memoryType || 'DISCUSSION',
    content,
    importance: importance || 'MEDIUM',
  });
  res.status(201).json(memory);
});
