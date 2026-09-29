import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import type { ChatMessage, SourceReference } from '../types/index.js';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  User,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SUGGESTED_PROMPTS = [
  'What did we decide about the API?',
  'What are my pending tasks?',
  'What did Rahul commit to?',
  'What should I discuss in tomorrow\'s meeting?',
  'Show unresolved issues.'
];

export function ChatbotPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; createdAt: string }>>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const loadSessions = async () => {
    try {
      const sessList = await api.getChatSessions();
      setSessions(sessList);
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  };

  useEffect(() => {
    let active = true;
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    if (!user?.id) return () => { active = false; };

    api.getChatSessions().then(sessList => {
      if (!active) return;
      setSessions(sessList);
      setActiveSessionId(sessList[0]?.id || null);
    }).catch(err => {
      if (active) console.error('Failed to load chat sessions:', err);
    });

    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!activeSessionId) {
      setMessages([]);
      return () => { active = false; };
    }
    setMessages([]);
    api.getChatMessages(activeSessionId).then(msgs => {
      if (active) setMessages(msgs);
    }).catch(err => {
      if (active) console.error('Failed to load messages:', err);
    });
    return () => { active = false; };
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading || sendingRef.current) return;

    sendingRef.current = true;
    setInput('');
    setLoading(true);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      sessionId: activeSessionId || 'temp',
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await api.sendMessage(query, activeSessionId || undefined);
      if (!activeSessionId) {
        setActiveSessionId(res.sessionId);
        loadSessions();
      }
      setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), tempUserMsg, res.message]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sessionId: activeSessionId || 'temp',
        role: 'assistant',
        content: `AI service error: ${err.message || 'Unable to retrieve meeting memory'}. Your data is safe.`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Meeting Assistant
            </h1>
            <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-medium">
              Step 8 Hackathon Story
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Query organizational memory across past meetings, MOMs, architectural decisions, and tasks.
          </p>
        </div>

        <button
          onClick={handleNewConversation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4 min-h-0">
        {/* Left: Chat Sessions List */}
        <div className="hidden lg:flex flex-col bg-white rounded-xl border border-slate-200 p-3 overflow-y-auto space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
            Conversation History
          </p>
          <div className="space-y-1">
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 p-2">No previous conversations</p>
            ) : (
              sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center gap-2 truncate ${
                    activeSessionId === s.id
                      ? 'bg-indigo-50 text-indigo-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Chat Area */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0">
          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">What would you like to know?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    I have full memory of Project Alpha meetings, decisions (REST APIs, PostgreSQL), member commitments (Rahul, Ayesha, Maroof), and tasks.
                  </p>
                </div>

                {/* Prompt Pills (Step 8 Hackathon Demo Questions) */}
                <div className="w-full space-y-2 pt-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Suggested Questions for Demo:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 transition-all flex items-center justify-between group"
                      >
                        <span>"{prompt}"</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        <div className="whitespace-pre-wrap font-sans">
                          {msg.content}
                        </div>
                      </div>

                      {/* Source References if Assistant message */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="space-y-1.5 pt-1 pl-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-indigo-500" />
                            Sources & Meeting Memory:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.sources.map((src, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1 shadow-2xs"
                              >
                                <div className="flex items-center justify-between text-indigo-600 font-semibold">
                                  <span>{src.title}</span>
                                  {src.date && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {src.date}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-600 italic text-[10px] line-clamp-2">
                                  "{src.excerpt}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl rounded-tl-xs text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>Searching meeting memory, decisions & tasks...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips Bar */}
          {messages.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-semibold shrink-0">Quick ask:</span>
              {SUGGESTED_PROMPTS.slice(0, 3).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-md border border-slate-200 whitespace-nowrap text-slate-700 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Ask about previous decisions, tasks, or tomorrow's meeting..."
                className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => { void handleSendMessage(); }}
                disabled={loading || !input.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 shadow-xs"
                title="Send query"
                aria-label="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
