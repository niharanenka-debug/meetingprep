import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import type { Meeting, MeetingBrief } from '../types/index.js';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  HelpCircle,
  ListTodo,
  RefreshCw,
  Sparkles,
  Users,
  Check
} from 'lucide-react';

export function MeetingPrepPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [brief, setBrief] = useState<MeetingBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [preparing, setPreparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchMeetingAndBrief = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const m = await api.getMeeting(id);
      setMeeting(m);
      if (m.brief) {
        setBrief(m.brief);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingAndBrief();
  }, [id]);

  const handleRunPreparation = async () => {
    if (!id) return;
    setPreparing(true);
    setError(null);
    try {
      const generatedBrief = await api.prepareMeeting(id);
      setBrief(generatedBrief);
    } catch (err: any) {
      setError(err.message || 'Failed to generate meeting preparation brief');
    } finally {
      setPreparing(false);
    }
  };

  const copyBriefToClipboard = () => {
    if (!brief || !meeting) return;
    const text = `EXECUTIVE MEETING BRIEF
Meeting: ${meeting.title}
Date: ${new Date(meeting.scheduledAt).toLocaleString()}

EXECUTIVE SUMMARY:
${brief.summary}

PREVIOUS DECISIONS:
${brief.previousDecisions.map(d => `- ${d.decision} (Source: ${d.meetingTitle})`).join('\n')}

PENDING COMMITMENTS:
${brief.pendingCommitments.map(c => `- ${c.person}: ${c.commitment} (Target: ${c.dueDate ? new Date(c.dueDate).toLocaleDateString() : 'Next Sprint'})`).join('\n')}

KEY DISCUSSION TOPICS:
${brief.discussionTopics.map(t => `- ${t}`).join('\n')}

SUGGESTED QUESTIONS:
${brief.suggestedQuestions.map(q => `- ${q}`).join('\n')}

IMPORTANT CONTEXT:
${brief.importantContext.map(c => `- ${c}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading meeting details...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-slate-600">Meeting not found</p>
        <Link to="/meetings" className="text-xs text-indigo-600 font-semibold hover:underline">
          Back to Meetings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation & Header */}
      <div className="space-y-3">
        <Link
          to={`/meetings/${meeting.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Meeting Details
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider uppercase">
                Meeting Preparation Agent
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">Step 3 Demo Workflow</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Prepare for: {meeting.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
              <span className="font-mono tabular-nums">
                {new Date(meeting.scheduledAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>·</span>
              <span>{meeting.location || 'Google Meet'}</span>
              <span>·</span>
              <span>{meeting.participants?.length || 4} Participants</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {brief && (
              <button
                onClick={copyBriefToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                {copied ? 'Copied Brief' : 'Copy Brief'}
              </button>
            )}

            <button
              onClick={handleRunPreparation}
              disabled={preparing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${preparing ? 'animate-spin' : ''}`} />
              {preparing ? 'Synthesizing Meeting Memory...' : brief ? 'Regenerate AI Brief' : 'Generate AI Brief'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          {error}
        </div>
      )}

      {/* Preparing Loading Banner */}
      {preparing && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-8 text-center space-y-3 animate-pulse">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-indigo-900">Reviewing your meeting history...</h3>
          <p className="text-xs text-indigo-700 max-w-md mx-auto">
            The Agent is inspecting previous meetings (Project Alpha Planning), past decisions, pending team commitments (Rahul, Ayesha, Maroof), and overdue items to prepare your executive brief.
          </p>
        </div>
      )}

      {/* Empty State before Running Brief */}
      {!brief && !preparing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-slate-900">
              No Brief Generated Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click <strong>"Generate AI Brief"</strong> to let the agent retrieve historical context from prior meetings, identify pending deliverables from Rahul, Ayesha, and Maroof, and formulate suggested questions for this session.
            </p>
          </div>
          <button
            onClick={handleRunPreparation}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Prepare Me
          </button>
        </div>
      )}

      {/* Render Prepared Brief */}
      {brief && !preparing && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="w-4 h-4 text-indigo-600" />
                Executive Synthesis
              </div>
              <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                Generated {new Date(brief.generatedAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {brief.summary}
            </p>
          </div>

          {/* 2-Column Grid: Decisions & Pending Commitments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Previous Decisions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Past Decisions ({brief.previousDecisions.length})
                </div>
                <span className="text-[10px] text-slate-400">From Meeting Memory</span>
              </div>
              <div className="divide-y divide-slate-100">
                {brief.previousDecisions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No past decisions recorded for this team.</p>
                ) : (
                  brief.previousDecisions.map(d => (
                    <div key={d.id} className="py-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-900 leading-snug">{d.decision}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <span>Source: {d.meetingTitle}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">{new Date(d.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Commitments */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Pending Commitments ({brief.pendingCommitments.length})
                </div>
                <span className="text-[10px] text-slate-400">Accountability Tracking</span>
              </div>
              <div className="divide-y divide-slate-100">
                {brief.pendingCommitments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No active pending commitments.</p>
                ) : (
                  brief.pendingCommitments.map(c => (
                    <div key={c.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-900">{c.commitment}</p>
                        <p className="text-[10px] text-slate-500">
                          Owner: <span className="font-semibold text-slate-700">{c.person}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {c.dueDate ? `Due ${new Date(c.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Discussion Topics & Suggested Questions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Discussion Topics */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-3 border-b border-slate-100">
                <ListTodo className="w-4 h-4 text-indigo-600" />
                Key Discussion Topics
              </div>
              <ul className="space-y-2.5">
                {brief.discussionTopics.map((topic, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested Questions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-3 border-b border-slate-100">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Suggested Accountability Questions
              </div>
              <ul className="space-y-2.5">
                {brief.suggestedQuestions.map((question, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-indigo-600 font-bold font-mono text-[11px] shrink-0">Q{i + 1}.</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Important Context */}
          {brief.importantContext && brief.importantContext.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Important Historical Nuances
              </div>
              <ul className="space-y-1 text-xs text-slate-600">
                {brief.importantContext.map((ctx, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>{ctx}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Action Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Meeting ready! Once this session concludes, enter your notes or transcript to generate structured MOM and auto-assign tasks.
            </div>
            <Link
              to={`/meetings/${meeting.id}/mom`}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Proceed to MOM & Notes</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
