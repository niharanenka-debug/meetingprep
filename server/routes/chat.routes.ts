import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { ChatProviderUnavailableError, processUserChatMessage } from '../ai/chat-agent.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);

// Send message to chatbot
chatRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { message, sessionId } = req.body;

  if (typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }
  if (message.length > 12000) {
    res.status(413).json({ error: 'Message is too long. Keep it under 12,000 characters.' });
    return;
  }

  try {
    const session = db.getOrCreateChatSession(user.id, sessionId);
    const conversationHistory = db.getChatMessages(session.id);

    // Save user message
    db.addChatMessage({
      sessionId: session.id,
      role: 'user',
      content: message,
    });

    // Run context-grounded AI assistant
    const { reply, sources } = await processUserChatMessage(user.id, message, conversationHistory);

    // Save assistant reply
    const assistantMsg = db.addChatMessage({
      sessionId: session.id,
      role: 'assistant',
      content: reply,
      sources,
    });

    res.json({
      sessionId: session.id,
      message: assistantMsg,
    });
  } catch (err) {
    if (err instanceof ChatProviderUnavailableError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error('Chat processing failed:', err);
    res.status(500).json({ error: 'Unable to process your message right now. Please try again.' });
  }
});

// List sessions for user
chatRouter.get('/sessions', (req: AuthenticatedRequest, res) => {
  const sessions = db.getChatSessions(req.user!.id);
  res.json(sessions);
});

// Get messages for session
chatRouter.get('/sessions/:id/messages', (req: AuthenticatedRequest, res) => {
  const session = db.getChatSessions(req.user!.id).find(item => item.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Chat session not found' });
    return;
  }
  const messages = db.getChatMessages(req.params.id);
  res.json(messages);
});

// Delete session
chatRouter.delete('/sessions/:id', (req: AuthenticatedRequest, res) => {
  const success = db.deleteChatSession(req.params.id, req.user!.id);
  res.json({ success });
});
