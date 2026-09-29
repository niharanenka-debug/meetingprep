export interface TranscriptionSegment {
  speaker?: string;
  start?: number;
  end?: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration?: number | null;
  segments?: TranscriptionSegment[];
}

export class TranscriptionService {
  private assemblyApiKey: string | undefined;

  constructor() {
    this.assemblyApiKey = process.env.ASSEMBLYAI_API_KEY || process.env.TRANSCRIPTION_API_KEY;
  }

  public validateAudioMimeType(mimeType: string): boolean {
    const valid = [
      'audio/webm',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'audio/ogg',
      'audio/aac',
      'video/webm',
    ];
    return valid.includes(mimeType.toLowerCase()) || mimeType.startsWith('audio/');
  }

  public async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    fileName?: string
  ): Promise<TranscriptionResult> {
    if (!this.validateAudioMimeType(mimeType)) {
      throw new Error(`Unsupported audio format: ${mimeType}. Please upload MP3, WAV, M4A, or WEBM audio.`);
    }

    if (audioBuffer.length === 0) {
      throw new Error('Empty audio file provided. Please record or upload valid audio.');
    }

    if (!this.assemblyApiKey?.trim()) {
      throw new Error('Audio transcription is not configured. Set ASSEMBLYAI_API_KEY on the server.');
    }

    try {
      const result = await this.callAssemblyAI(audioBuffer);
      if (!result.text.trim()) throw new Error('AssemblyAI returned an empty transcript');
      return result;
    } catch (error) {
      console.error('AssemblyAI transcription failed:', error);
      throw new Error('Audio transcription failed. Please retry or enter the transcript manually.');
    }
  }

  private async callAssemblyAI(audioBuffer: Buffer): Promise<TranscriptionResult> {
    const apiKey = this.assemblyApiKey!;

    // Step 1: Upload audio file
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(audioBuffer),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`AssemblyAI upload failed (${uploadRes.status}): ${errText}`);
    }

    const uploadData: any = await uploadRes.json();
    const audioUrl = uploadData.upload_url;
    if (!audioUrl) {
      throw new Error('AssemblyAI did not return an upload_url');
    }

    // Step 2: Request transcription with speaker diarization (Section 13)
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        auto_highlights: false,
      }),
    });

    if (!transcriptRes.ok) {
      const errText = await transcriptRes.text();
      throw new Error(`AssemblyAI transcript request failed (${transcriptRes.status}): ${errText}`);
    }

    const transcriptData: any = await transcriptRes.json();
    const transcriptId = transcriptData.id;

    // Step 3: Poll status
    const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
    const maxRetries = 45; // up to 45 seconds
    let attempts = 0;

    while (attempts < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const pollRes = await fetch(pollingEndpoint, {
        headers: { authorization: apiKey },
      });

      if (!pollRes.ok) continue;

      const pollData: any = await pollRes.json();
      if (pollData.status === 'completed') {
        const segments: TranscriptionSegment[] = [];

        if (Array.isArray(pollData.utterances)) {
          for (const u of pollData.utterances) {
            segments.push({
              speaker: `Speaker ${u.speaker || 'A'}`,
              text: u.text,
              start: u.start,
              end: u.end,
            });
          }
        }

        return {
          text: pollData.text || '',
          language: pollData.language_code || 'en',
          duration: pollData.audio_duration ? Math.round(pollData.audio_duration) : null,
          segments: segments.length > 0 ? segments : undefined,
        };
      } else if (pollData.status === 'error') {
        throw new Error(`AssemblyAI transcription error: ${pollData.error}`);
      }
    }

    throw new Error('AssemblyAI transcription timed out');
  }

}

export const transcriptionService = new TranscriptionService();
