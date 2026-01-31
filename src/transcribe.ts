import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import { listInboxItems, updateInboxItem } from './db/inbox';
import type { InboxItem } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function pickAudioAttachment(item: InboxItem): { filePath: string; mimeType?: string } | null {
  // Prefer voice/audio types
  const a = item.attachments.find(att => att.type === 'voice' || att.type === 'audio');
  if (!a) return null;
  return { filePath: a.filePath, mimeType: a.mimeType };
}

async function transcribeFile(filePath: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) throw new Error(`File not found: ${absPath}`);

  const form = new FormData();
  form.set('model', 'whisper-1');
  form.set('file', await fileFromPath(absPath));

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form as any,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI transcription failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { text?: string };
  return (data.text || '').trim();
}

export async function runTranscribe(): Promise<void> {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY missing; set it in .env');
    process.exitCode = 1;
    return;
  }

  // Grab a batch of newest items and filter in code (simple v1)
  const items = listInboxItems({ status: 'new', limit: 200 });
  const pending = items.filter(i => i.needsTranscription && !i.transcript);

  if (pending.length === 0) {
    console.log('No pending transcriptions.');
    return;
  }

  console.log(`Found ${pending.length} item(s) needing transcription.`);

  for (const item of pending) {
    try {
      const audio = pickAudioAttachment(item);
      if (!audio) {
        console.log(`#${item.id}: needsTranscription but no voice/audio attachment found; skipping.`);
        continue;
      }

      console.log(`#${item.id}: transcribing...`);
      const transcript = await transcribeFile(audio.filePath);

      if (!transcript) {
        console.log(`#${item.id}: empty transcript; leaving needsTranscription=true`);
        continue;
      }

      updateInboxItem(item.id, {
        transcript,
        needsTranscription: false,
      });

      console.log(`#${item.id}: saved transcript (${transcript.length} chars).`);
    } catch (err: any) {
      console.error(`#${item.id}: transcription error:`, err?.message || err);
    }
  }
}
