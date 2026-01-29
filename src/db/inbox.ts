import { db } from './index';
import type {
  InboxItem,
  CreateInboxItemInput,
  TriageInput,
  UpdateInput,
  ItemStatus,
} from '../types';

interface DbRow {
  id: number;
  created_at: string;
  source: string;
  raw_text: string | null;
  attachments: string;
  transcript: string | null;
  needs_transcription: number;
  prefix: string | null;
  status: string;
  summary: string | null;
  primary_pipeline: string | null;
  primary_bucket: string | null;
  tags: string;
  priority: string | null;
  due_date: string | null;
  next_action: string | null;
  why: string | null;
}

function rowToInboxItem(row: DbRow): InboxItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    source: row.source as 'telegram',
    rawText: row.raw_text,
    attachments: JSON.parse(row.attachments),
    transcript: row.transcript,
    needsTranscription: row.needs_transcription === 1,
    prefix: row.prefix as InboxItem['prefix'],
    status: row.status as ItemStatus,
    summary: row.summary,
    primaryPipeline: row.primary_pipeline,
    primaryBucket: row.primary_bucket,
    tags: JSON.parse(row.tags),
    priority: row.priority,
    dueDate: row.due_date,
    nextAction: row.next_action,
    why: row.why,
  };
}

export function createInboxItem(input: CreateInboxItemInput): InboxItem {
  const stmt = db.prepare(`
    INSERT INTO inbox_items (source, raw_text, attachments, needs_transcription, prefix)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.source,
    input.rawText,
    JSON.stringify(input.attachments),
    input.needsTranscription ? 1 : 0,
    input.prefix
  );

  return getInboxItemById(result.lastInsertRowid as number)!;
}

export function getInboxItemById(id: number): InboxItem | null {
  const stmt = db.prepare('SELECT * FROM inbox_items WHERE id = ?');
  const row = stmt.get(id) as DbRow | undefined;
  return row ? rowToInboxItem(row) : null;
}

export function listInboxItems(options: {
  status?: ItemStatus;
  prefix?: string;
  limit?: number;
}): InboxItem[] {
  let query = 'SELECT * FROM inbox_items WHERE 1=1';
  const params: (string | number)[] = [];

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  if (options.prefix) {
    query += ' AND prefix = ?';
    params.push(options.prefix);
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as DbRow[];
  return rows.map(rowToInboxItem);
}

export function triageInboxItem(id: number, input: TriageInput): InboxItem | null {
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.summary !== undefined) {
    updates.push('summary = ?');
    params.push(input.summary);
  }
  if (input.primaryPipeline !== undefined) {
    updates.push('primary_pipeline = ?');
    params.push(input.primaryPipeline);
  }
  if (input.primaryBucket !== undefined) {
    updates.push('primary_bucket = ?');
    params.push(input.primaryBucket);
  }
  if (input.tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(input.tags));
  }
  if (input.priority !== undefined) {
    updates.push('priority = ?');
    params.push(input.priority);
  }
  if (input.dueDate !== undefined) {
    updates.push('due_date = ?');
    params.push(input.dueDate);
  }
  if (input.nextAction !== undefined) {
    updates.push('next_action = ?');
    params.push(input.nextAction);
  }
  if (input.why !== undefined) {
    updates.push('why = ?');
    params.push(input.why);
  }

  if (updates.length === 0) {
    return getInboxItemById(id);
  }

  params.push(id);
  const stmt = db.prepare(`UPDATE inbox_items SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  return getInboxItemById(id);
}

export function updateInboxItem(id: number, input: UpdateInput): InboxItem | null {
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);
  }
  if (input.transcript !== undefined) {
    updates.push('transcript = ?');
    params.push(input.transcript);
  }
  if (input.needsTranscription !== undefined) {
    updates.push('needs_transcription = ?');
    params.push(input.needsTranscription ? 1 : 0);
  }

  if (updates.length === 0) {
    return getInboxItemById(id);
  }

  params.push(id);
  const stmt = db.prepare(`UPDATE inbox_items SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  return getInboxItemById(id);
}
