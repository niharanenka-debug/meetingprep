import { db } from '../db.js';
import { groqService, GroqServiceError } from '../services/groqService.js';
import type { ChatMessage, SourceReference } from '../types.js';

export interface ChatResponseResult {
  reply: string;
  sources: SourceReference[];
}

export class ChatProviderUnavailableError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'ChatProviderUnavailableError';
  }
}
export async function processUserChatMessage(
  userId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponseResult> {
  const user = db.getUserById(userId);
  if (!user) throw new Error('User not found');

  const userMeetings = db.getMeetings({ userId });
  const meetingIds = new Set(userMeetings.map(meeting => meeting.id));
  const visibleDecisions = db.getDecisions().filter(decision => meetingIds.has(decision.meetingId));
  const visibleMemories = db.getMeetingMemories().filter(memory => meetingIds.has(memory.meetingId));
  const userTasks = db.getTasks({ userId });
  const visibleTasks = db.getTasks().filter(task =>
    task.assignedTo === userId || (task.meetingId && meetingIds.has(task.meetingId))
  );
  const pastMeetingMoms = userMeetings.flatMap(meeting => {
    const mom = db.getMeetingMom(meeting.id);
    return mom ? [{
      meetingTitle: meeting.title,
      date: meeting.scheduledAt,
      summary: mom.summary,
      discussionPoints: mom.discussionPoints || [],
    }] : [];
  });

  const contextPackage = {
    currentUser: { id: user.id, name: user.name, role: user.role },
    userTasks: userTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
    })),
    teamDecisions: visibleDecisions.map(decision => ({
      id: decision.id,
      decision: decision.decision,
      context: decision.context,
      meetingTitle: userMeetings.find(meeting => meeting.id === decision.meetingId)?.title,
      date: decision.createdAt,
    })),
    teamMemories: visibleMemories.map(memory => ({
      id: memory.id,
      type: memory.memoryType,
      content: memory.content,
      meetingTitle: userMeetings.find(meeting => meeting.id === memory.meetingId)?.title,
      importance: memory.importance,
    })),
    teamTasks: visibleTasks.map(task => ({
      title: task.title,
      assignedTo: db.getUserById(task.assignedTo)?.name || 'Unassigned',
      status: task.status,
      dueDate: task.dueDate,
      priority: task.priority,
    })),
    upcomingMeetings: userMeetings.filter(meeting => meeting.status === 'UPCOMING').map(meeting => ({
      title: meeting.title,
      scheduledAt: meeting.scheduledAt,
      description: meeting.description,
    })),
    pastMeetingMoms,
  };

  try {
    return await groqService.generateChatResponse({
      userMessage,
      contextPackage,
      user,
      conversationHistory: conversationHistory
        .filter(message => message.role === 'user' || message.role === 'assistant')
        .map(message => ({ role: message.role as 'user' | 'assistant', content: message.content })),
    });
  } catch (error) {
    if (error instanceof GroqServiceError) {
      console.warn(`Groq chatbot request failed with HTTP ${error.statusCode}.`);
      throw new ChatProviderUnavailableError(error.message, error.statusCode);
    }
    console.warn('Groq chatbot request failed unexpectedly.');
    throw new ChatProviderUnavailableError('Groq is temporarily unavailable. Please try again shortly.', 503);
  }
}
