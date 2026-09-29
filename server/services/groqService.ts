import { ZodChatResponseSchema } from './mistralService.js';
import type { SourceReference, User } from '../types.js';

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

export class GroqServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'GroqServiceError';
  }
}

export class GroqService {
  public async generateChatResponse(params: {
    userMessage: string;
    contextPackage: unknown;
    user: User;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{ reply: string; sources: SourceReference[] }> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      throw new GroqServiceError(503, 'Groq is not configured on the server.');
    }

    const model = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
    const systemPrompt = `You are Meeting Agent.

Answer using only the meeting/application context supplied by the backend.
Never invent meetings, people, decisions, commitments, deadlines, tasks, or historical events.
If the requested information is not available in the supplied context, say that it was not found.
Clearly distinguish stored meeting facts from suggestions.
Use prior conversation turns only to resolve references; all factual claims must still be supported by supplied context.
Return valid JSON with this shape:
{"reply":"Markdown formatted answer","sources":[{"type":"DECISION|MEETING|TASK|COMMITMENT|MOM","title":"Source title","date":"Date if known","excerpt":"Supporting fact","referenceId":"ID if available"}]}`;

    const userPrompt = JSON.stringify({
      authorizedContext: params.contextPackage,
      recentConversationHistory: (params.conversationHistory || []).slice(-12),
      question: params.userMessage,
    });

    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.15,
          response_format: { type: 'json_object' },
        }),
      });
    } catch {
      throw new GroqServiceError(503, 'Groq is temporarily unavailable. Please try again shortly.');
    }

    if (response.status === 429) {
      throw new GroqServiceError(429, 'Groq rate limit reached. Please try again shortly.');
    }
    if (!response.ok) {
      console.warn(`Groq returned HTTP ${response.status}.`);
      throw new GroqServiceError(503, 'Groq is temporarily unavailable. Please try again shortly.');
    }

    try {
      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content?.trim()) {
        throw new GroqServiceError(502, 'Groq returned an empty response. Please try again.');
      }

      const result = ZodChatResponseSchema.parse(JSON.parse(content));
      return {
        reply: result.reply,
        sources: result.sources as SourceReference[],
      };
    } catch (error) {
      if (error instanceof GroqServiceError) throw error;
      console.warn('Groq returned an invalid chatbot response.');
      throw new GroqServiceError(502, 'Groq returned an unreadable response. Please try again.');
    }
  }
}

export const groqService = new GroqService();