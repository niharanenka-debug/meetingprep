import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  Mic,
  Square,
  Pause,
  Play,
  Upload,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Users,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import type { MeetingTranscript, User } from '../types/index.js';

interface MeetingRecorderProps {
  meetingId: string;
  onTranscriptApproved: (transcript: string) => void;
  onTranscriptChange: (transcript: string) => void;
  initialTranscript?: string;
  isTranscriptApproved?: boolean;
}

export function MeetingRecorder({
  meetingId,
  onTranscriptApproved,
  onTranscriptChange,
  initialTranscript = '',
  isTranscriptApproved = false,
}: MeetingRecorderProps) {
  // Recording states: idle, recording, paused, recorded, uploading, transcribing, preparing, ready
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'paused' | 'recorded' | 'uploading' | 'transcribing' | 'preparing' | 'ready'>('idle');
  const [transcriptionProgressMessage, setTranscriptionProgressMessage] = useState<string>('Uploading recording...');
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcriptText, setTranscriptText] = useState(initialTranscript);
  const [isApproved, setIsApproved] = useState(isTranscriptApproved);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [segments, setSegments] = useState<Array<{ speaker?: string; text: string }>>([]);

  // Speaker mapping (Section 13)
  const [speakerMapping, setSpeakerMapping] = useState<Record<string, string>>({
    'Speaker A': 'Rahul',
    'Speaker B': 'Ayesha',
    'Speaker C': 'Maroof',
  });
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTranscriptText(initialTranscript);
    setIsApproved(isTranscriptApproved);
    if (initialTranscript.trim().length > 0) {
      setRecordState('ready');
      extractSpeakersFromText(initialTranscript);
    }
  }, [initialTranscript, isTranscriptApproved]);

  useEffect(() => {
    api.getUsers().then(users => setTeamUsers(users)).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const extractSpeakersFromText = (text: string) => {
    const regex = /(Speaker\s*[A-Za-z0-9]+|[A-Za-z]+):/gi;
    const matches = Array.from(text.matchAll(regex)).map(m => m[1]);
    const unique = Array.from(new Set(matches)).filter(Boolean);
    if (unique.length > 0) {
      setDetectedSpeakers(unique);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording via MediaRecorder.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const options = { mimeType: 'audio/webm' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setRecordState('recorded');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setRecordState('recording');
      setSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser.');
      } else {
        setError(err.message || 'Failed to start recording');
      }
      setRecordState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordState === 'recording') {
      mediaRecorderRef.current.pause();
      clearInterval(timerIntervalRef.current);
      setRecordState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordState === 'paused') {
      mediaRecorderRef.current.resume();
      timerIntervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
      setRecordState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordState === 'recording' || recordState === 'paused')) {
      mediaRecorderRef.current.stop();
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleTranscribeRecordedAudio = async () => {
    if (!audioBlob) return;
    setError(null);
    setRecordState('uploading');
    setTranscriptionProgressMessage('Uploading recording...');

    try {
      setRecordState('transcribing');
      setTranscriptionProgressMessage('Transcribing with AssemblyAI...');

      const res = await api.uploadAudioRecording(meetingId, audioBlob, `recorded_session_${Date.now()}.webm`);

      setRecordState('preparing');
      setTranscriptionProgressMessage('Preparing transcript...');
      setTranscriptText(res.transcript.content);
      onTranscriptChange(res.transcript.content);
      if (res.segments) {
        setSegments(res.segments);
        const foundSpeakers = Array.from(new Set(res.segments.map(s => s.speaker).filter(Boolean))) as string[];
        if (foundSpeakers.length > 0) setDetectedSpeakers(foundSpeakers);
      } else {
        extractSpeakersFromText(res.transcript.content);
      }
      setRecordState('ready');
      setIsApproved(false);
    } catch (err: any) {
      setError(err.message || 'Audio transcription failed. Please retry or enter the transcript manually.');
      setRecordState('recorded');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.mp3', '.wav', '.m4a', '.webm', '.ogg'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt && !file.type.startsWith('audio/')) {
      setError('Unsupported audio file format. Please upload MP3, WAV, M4A, or WEBM audio.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds 25MB limit. Please upload a smaller audio clip.');
      return;
    }

    setError(null);
    setRecordState('uploading');
    setTranscriptionProgressMessage('Uploading recording...');

    try {
      setRecordState('transcribing');
      setTranscriptionProgressMessage('Transcribing with AssemblyAI...');

      const res = await api.uploadAudioRecording(meetingId, file, file.name);

      setRecordState('preparing');
      setTranscriptionProgressMessage('Preparing transcript...');
      setTranscriptText(res.transcript.content);
      onTranscriptChange(res.transcript.content);
      if (res.segments) {
        setSegments(res.segments);
        const foundSpeakers = Array.from(new Set(res.segments.map(s => s.speaker).filter(Boolean))) as string[];
        if (foundSpeakers.length > 0) setDetectedSpeakers(foundSpeakers);
      } else {
        extractSpeakersFromText(res.transcript.content);
      }
      setRecordState('ready');
      setIsApproved(false);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and transcribe audio. Please retry or enter the transcript manually.');
      setRecordState('idle');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApproveTranscript = async () => {
    if (!transcriptText.trim()) return;
    try {
      await api.saveTranscript(meetingId, transcriptText.trim(), true);
      setIsApproved(true);
      onTranscriptApproved(transcriptText.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to save approved transcript');
    }
  };

  const applySpeakerMapping = () => {
    let updated = transcriptText;
    for (const [speakerLabel, realName] of Object.entries(speakerMapping)) {
      if (!realName || !realName.trim()) continue;
      const regex = new RegExp(`\\b${speakerLabel}\\b`, 'gi');
      updated = updated.replace(regex, realName.trim());
    }
    setTranscriptText(updated);
    setIsApproved(false);
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isProcessing = recordState === 'uploading' || recordState === 'transcribing' || recordState === 'preparing';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-6 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mic className="w-4 h-4 text-indigo-600" />
            Meeting Voice Recorder & AssemblyAI Transcription
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Record in-browser or upload audio for speaker-diarized transcription.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*,.mp3,.wav,.m4a,.webm"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={recordState === 'recording' || isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shadow-2xs disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Upload Audio File
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Recording Physical Control Box (Section 11) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md max-w-xl mx-auto text-center space-y-5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Voice Capture Console
        </div>

        {/* Live Timer Display */}
        <div className="flex items-center justify-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${
            recordState === 'recording' ? 'bg-rose-500 animate-ping' : recordState === 'paused' ? 'bg-amber-400' : 'bg-slate-600'
          }`} />
          <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight tabular-nums">
            🎙️ {formatTimer(seconds)}
          </span>
        </div>

        {/* Status Text (Section 11) */}
        <p className="text-xs text-slate-400 font-mono">
          {recordState === 'idle' && 'Ready to record session'}
          {recordState === 'recording' && 'Recording in progress... speak clearly'}
          {recordState === 'paused' && 'Recording paused'}
          {recordState === 'recorded' && 'Recording captured. Ready for transcription.'}
          {isProcessing && transcriptionProgressMessage}
          {recordState === 'ready' && 'Transcription ready for review'}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {recordState === 'idle' && (
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Mic className="w-4 h-4" />
              Start Recording
            </button>
          )}

          {recordState === 'recording' && (
            <>
              <button
                onClick={pauseRecording}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg border border-slate-700"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
              <button
                onClick={stopRecording}
                className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </button>
            </>
          )}

          {recordState === 'paused' && (
            <>
              <button
                onClick={resumeRecording}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </button>
              <button
                onClick={stopRecording}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </button>
            </>
          )}

          {recordState === 'recorded' && (
            <div className="flex items-center gap-2">
              <button
                onClick={startRecording}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Discard & Re-record
              </button>
              <button
                onClick={handleTranscribeRecordedAudio}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                Transcribe Recording
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="inline-flex items-center gap-2 px-4 py-2 text-xs text-indigo-400 bg-slate-800 rounded-lg border border-slate-700 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              {transcriptionProgressMessage}
            </div>
          )}

          {recordState === 'ready' && (
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
            >
              <Mic className="w-3.5 h-3.5" />
              Record Another Session
            </button>
          )}
        </div>
      </div>

      {/* Speaker Identification & Mapping Box (Section 13) */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-800">
              Speaker Identification & Mapping
            </h4>
          </div>
          <button
            onClick={applySpeakerMapping}
            disabled={!transcriptText}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Apply Speaker Mapping to Transcript
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Map detected voices (e.g. Speaker A, Speaker B, Speaker C) directly to team members before approving the official transcript.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {['Speaker A', 'Speaker B', 'Speaker C'].map((spk) => (
            <div key={spk} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
              <span className="text-xs font-mono font-semibold text-slate-700 shrink-0">{spk}</span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={speakerMapping[spk] || ''}
                onChange={e => setSpeakerMapping(prev => ({ ...prev, [spk]: e.target.value }))}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                <option value="Maroof">Maroof</option>
                <option value="Rahul">Rahul</option>
                <option value="Ayesha">Ayesha</option>
                <option value="Sarah">Sarah</option>
                {teamUsers.filter(u => !['Maroof', 'Rahul', 'Ayesha', 'Sarah'].includes(u.name)).map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Editable Transcript Review Section (Section 14) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span>Transcript Review Editor</span>
              {isApproved && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded font-semibold normal-case">
                  Approved for MOM
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500">
              The official MOM must use the approved transcript. Edit, search, copy, or save changes below.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyTranscript}
              disabled={!transcriptText}
              className="p-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 flex items-center gap-1"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => setTranscriptText('')}
              disabled={!transcriptText}
              className="p-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200"
              title="Clear text"
            >
              Clear
            </button>
          </div>
        </div>

        <textarea
          value={transcriptText}
          onChange={e => {
            setTranscriptText(e.target.value);
            setIsApproved(false);
          }}
          placeholder="Meeting transcript will appear here after recording or upload. You can also paste transcript directly..."
          rows={6}
          className="w-full p-4 text-xs font-mono leading-relaxed border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
        />

        {/* Approval Button Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-slate-400 font-mono">
            {transcriptText.split(/\s+/).filter(Boolean).length} words
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApproveTranscript}
              disabled={!transcriptText.trim()}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
                isApproved
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isApproved ? 'Transcript Approved ✓' : 'Approve Transcript for MOM'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
