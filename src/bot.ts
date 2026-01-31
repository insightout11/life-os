import { Bot, Context } from 'grammy';
import { Message } from 'grammy/types';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { ATTACHMENTS_DIR } from './db';
import { initializeSchema } from './db/schema';
import { createInboxItem } from './db/inbox';
import type { MessagePrefix, Attachment, CreateInboxItemInput } from './types';

// Initialize database schema
initializeSchema();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
}

const bot = new Bot(token);

// Parse prefix from message text
function parsePrefix(text: string | null | undefined): { prefix: MessagePrefix; cleanText: string | null } {
  if (!text) {
    return { prefix: null, cleanText: null };
  }

  const upperText = text.toUpperCase();

  if (upperText.startsWith('NOW:')) {
    return { prefix: 'NOW', cleanText: text.slice(4).trim() || null };
  }
  if (upperText.startsWith('URGENT:')) {
    return { prefix: 'URGENT', cleanText: text.slice(7).trim() || null };
  }
  if (upperText.startsWith('SORT NOW')) {
    // Handle "SORT NOW" or "SORT NOW:"
    const afterPrefix = text.slice(8);
    const cleanText = afterPrefix.startsWith(':') ? afterPrefix.slice(1).trim() : afterPrefix.trim();
    return { prefix: 'SORT_NOW', cleanText: cleanText || null };
  }

  return { prefix: null, cleanText: text };
}

// Download file from Telegram
async function downloadFile(fileId: string, fileName: string): Promise<string> {
  const file = await bot.api.getFile(fileId);
  const filePath = file.file_path;

  if (!filePath) {
    throw new Error('Could not get file path from Telegram');
  }

  const localPath = path.join(ATTACHMENTS_DIR, `${fileId}_${fileName}`);
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(localPath);
    https.get(fileUrl, (response) => {
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(localPath);
      });
    }).on('error', (err) => {
      fs.unlink(localPath, () => {}); // Clean up partial file
      reject(err);
    });
  });
}

const allowFrom = (process.env.TELEGRAM_ALLOW_FROM || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Handle all messages
bot.on('message', async (ctx: Context) => {
  const fromId = ctx.from?.id;
  if (allowFrom.length > 0) {
    if (!fromId || !allowFrom.includes(String(fromId))) {
      // Ignore unauthorized senders (but reply politely)
      try { await ctx.reply('Not authorized.'); } catch {}
      return;
    }
  }
  const message = ctx.message as Message;

  try {
    const attachments: Attachment[] = [];
    let needsTranscription = false;
    let rawText = message.text || message.caption || null;

    // Parse prefix from text
    const { prefix, cleanText } = parsePrefix(rawText);
    rawText = cleanText;

    // Handle photo
    if (message.photo && message.photo.length > 0) {
      // Get highest resolution photo (last in array)
      const photo = message.photo[message.photo.length - 1];
      const localPath = await downloadFile(photo.file_id, 'photo.jpg');
      attachments.push({
        id: photo.file_id,
        type: 'photo',
        filePath: localPath,
        mimeType: 'image/jpeg',
        fileSize: photo.file_size,
      });
    }

    // Handle voice message
    if (message.voice) {
      const localPath = await downloadFile(message.voice.file_id, 'voice.ogg');
      attachments.push({
        id: message.voice.file_id,
        type: 'voice',
        filePath: localPath,
        mimeType: message.voice.mime_type || 'audio/ogg',
        fileSize: message.voice.file_size,
      });
      needsTranscription = true;
    }

    // Handle audio
    if (message.audio) {
      const fileName = message.audio.file_name || 'audio.mp3';
      const localPath = await downloadFile(message.audio.file_id, fileName);
      attachments.push({
        id: message.audio.file_id,
        type: 'audio',
        filePath: localPath,
        mimeType: message.audio.mime_type,
        fileName: message.audio.file_name,
        fileSize: message.audio.file_size,
      });
      needsTranscription = true;
    }

    // Handle document
    if (message.document) {
      const fileName = message.document.file_name || 'document';
      const localPath = await downloadFile(message.document.file_id, fileName);
      attachments.push({
        id: message.document.file_id,
        type: 'document',
        filePath: localPath,
        mimeType: message.document.mime_type,
        fileName: message.document.file_name,
        fileSize: message.document.file_size,
      });
    }

    // Handle video
    if (message.video) {
      const fileName = message.video.file_name || 'video.mp4';
      const localPath = await downloadFile(message.video.file_id, fileName);
      attachments.push({
        id: message.video.file_id,
        type: 'video',
        filePath: localPath,
        mimeType: message.video.mime_type,
        fileName: message.video.file_name,
        fileSize: message.video.file_size,
      });
    }

    // Create inbox item
    const input: CreateInboxItemInput = {
      source: 'telegram',
      rawText,
      attachments,
      needsTranscription,
      prefix,
    };

    const item = createInboxItem(input);
    console.log(`Saved inbox item #${item.id}${prefix ? ` [${prefix}]` : ''} from=${fromId ?? 'unknown'}`);

    // Always reply "Saved."
    await ctx.reply('Saved.');
  } catch (error) {
    console.error('Error processing message:', error);
    await ctx.reply('Saved.');
  }
});

// Error handler
bot.catch((err) => {
  console.error('Bot error:', err);
});

export function startBot(): void {
  console.log('Starting Life OS Telegram bot...');
  bot.start();
}

export { bot };
