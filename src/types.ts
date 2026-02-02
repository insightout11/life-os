export type MessagePrefix = 'NOW' | 'URGENT' | 'SORT_NOW' | null;

export type ItemStatus = 'new' | 'triaged' | 'processed' | 'archived' | 'needs_clarification';

export type Source = 'telegram';

export type ActionOwner = 'matt' | 'max' | 'either' | null;

export type ActionState = 'waiting' | 'doing' | 'done' | null;

export interface Attachment {
  id: string;
  type: 'photo' | 'voice' | 'document' | 'video' | 'audio';
  filePath: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
}

export interface InboxItem {
  id: number;
  createdAt: string;
  source: Source;
  rawText: string | null;
  attachments: Attachment[];
  transcript: string | null;
  needsTranscription: boolean;
  prefix: MessagePrefix;
  status: ItemStatus;
  // Triage fields (populated by Clawdbot/Max via CLI)
  summary: string | null;
  primaryPipeline: string | null;
  primaryBucket: string | null;
  tags: string[];
  priority: string | null;
  dueDate: string | null;
  nextAction: string | null;
  why: string | null;
  // Pipeline fields
  actionOwner: ActionOwner;
  actionState: ActionState;
  notes: string | null;
  doneAt: string | null;
}

export interface CreateInboxItemInput {
  source: Source;
  rawText: string | null;
  attachments: Attachment[];
  needsTranscription: boolean;
  prefix: MessagePrefix;
}

export interface TriageInput {
  summary?: string;
  primaryPipeline?: string;
  primaryBucket?: string;
  tags?: string[];
  priority?: string;
  dueDate?: string;
  nextAction?: string;
  why?: string;
  actionOwner?: ActionOwner;
  actionState?: ActionState;
  notes?: string;
  doneAt?: string;
}

export interface UpdateInput {
  status?: ItemStatus;
  transcript?: string;
  needsTranscription?: boolean;
  // Allow updating triage fields via update endpoint
  summary?: string;
  primaryPipeline?: string;
  primaryBucket?: string;
  tags?: string[];
  priority?: string;
  dueDate?: string;
  nextAction?: string;
  why?: string;
  actionOwner?: ActionOwner;
  actionState?: ActionState;
  notes?: string;
  doneAt?: string;
}
