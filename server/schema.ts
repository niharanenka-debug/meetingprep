import { pgTable, text, timestamp, integer, boolean, real, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('user_role', ['USER', 'ADMIN']);
export const teamRoleEnum = pgEnum('team_member_role', ['OWNER', 'MEMBER']);
export const meetingStatusEnum = pgEnum('meeting_status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const momStatusEnum = pgEnum('mom_status', ['DRAFT', 'REVIEW_REQUIRED', 'APPROVED']);
export const commitmentStatusEnum = pgEnum('commitment_status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']);
export const taskStatusEnum = pgEnum('task_status', ['TODO', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']);
export const taskPriorityEnum = pgEnum('task_priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const memoryTypeEnum = pgEnum('memory_type', ['DECISION', 'COMMITMENT', 'ISSUE', 'DISCUSSION', 'FOLLOW_UP', 'PREFERENCE']);
export const issueStatusEnum = pgEnum('issue_status', ['OPEN', 'IN_PROGRESS', 'RESOLVED']);

// TABLE: users
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  avatarUrl: text('avatar_url'),
  role: roleEnum('role').default('USER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: teams
export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: team_members
export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').default('MEMBER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// TABLE: meetings
export const meetings = pgTable('meetings', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').default(30).notNull(), // in minutes
  location: text('location').default('Virtual Room'),
  status: meetingStatusEnum('status').default('SCHEDULED').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: meeting_participants
export const meetingParticipants = pgTable('meeting_participants', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  attendanceStatus: text('attendance_status').default('INVITED').notNull(),
});

// TABLE: recordings
export const recordings = pgTable('recordings', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  uploadedBy: text('uploaded_by').references(() => users.id),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  duration: integer('duration'),
  storageReference: text('storage_reference'),
  transcriptionStatus: text('transcription_status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: meeting_transcripts
export const meetingTranscripts = pgTable('meeting_transcripts', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  recordingId: text('recording_id').references(() => recordings.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  language: text('language').default('en').notNull(),
  version: integer('version').default(1).notNull(),
  approved: boolean('approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: meeting_mom
export const meetingMom = pgTable('meeting_mom', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  status: momStatusEnum('status').default('DRAFT').notNull(),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: decisions
export const decisions = pgTable('decisions', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('RECORDED').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: commitments
export const commitments = pgTable('commitments', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  description: text('description').notNull(),
  deadline: timestamp('deadline'),
  status: commitmentStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: action_items
export const actionItems = pgTable('action_items', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  assigneeId: text('assignee_id').references(() => users.id),
  deadline: timestamp('deadline'),
  priority: taskPriorityEnum('priority').default('MEDIUM').notNull(),
  confidence: real('confidence').default(0.9).notNull(),
  needsConfirmation: boolean('needs_confirmation').default(false).notNull(),
  status: text('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: tasks
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  actionItemId: text('action_item_id').references(() => actionItems.id, { onDelete: 'set null' }),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  assignedTo: text('assigned_to').references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  deadline: timestamp('deadline'),
  priority: taskPriorityEnum('priority').default('MEDIUM').notNull(),
  status: taskStatusEnum('status').default('TODO').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: meeting_memories
export const meetingMemories = pgTable('meeting_memories', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  memoryType: memoryTypeEnum('memory_type').notNull(),
  content: text('content').notNull(),
  importance: text('importance').default('MEDIUM').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// TABLE: unresolved_issues
export const unresolvedIssues = pgTable('unresolved_issues', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  ownerId: text('owner_id').references(() => users.id),
  status: issueStatusEnum('status').default('OPEN').notNull(),
  lastDiscussed: timestamp('last_discussed').defaultNow(),
  nextFollowUp: timestamp('next_follow_up'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: notifications
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// TABLE: chat_sessions
export const chatSessions = pgTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABLE: chat_messages
export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// TABLE: ai_generations
export const aiGenerations = pgTable('ai_generations', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  generationType: text('generation_type').notNull(),
  model: text('model').notNull(),
  inputHash: text('input_hash').notNull(),
  output: text('output').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
