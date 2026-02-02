import { db } from './index';

export function initializeSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inbox_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      source TEXT NOT NULL,
      raw_text TEXT,
      attachments TEXT NOT NULL DEFAULT '[]',
      transcript TEXT,
      needs_transcription INTEGER NOT NULL DEFAULT 0,
      prefix TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      -- Triage fields
      summary TEXT,
      primary_pipeline TEXT,
      primary_bucket TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      priority TEXT,
      due_date TEXT,
      next_action TEXT,
      why TEXT,
      -- Pipeline fields (added in upgrade)
      action_owner TEXT,
      action_state TEXT,
      notes TEXT,
      done_at TEXT
    )
  `);

  // Migration: add new columns if they don't exist (for existing databases)
  const columns = db.prepare("PRAGMA table_info(inbox_items)").all() as { name: string }[];
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('action_owner')) {
    db.exec('ALTER TABLE inbox_items ADD COLUMN action_owner TEXT');
  }
  if (!columnNames.includes('action_state')) {
    db.exec('ALTER TABLE inbox_items ADD COLUMN action_state TEXT');
  }
  if (!columnNames.includes('notes')) {
    db.exec('ALTER TABLE inbox_items ADD COLUMN notes TEXT');
  }
  if (!columnNames.includes('done_at')) {
    db.exec('ALTER TABLE inbox_items ADD COLUMN done_at TEXT');
  }

  // Create index on status for efficient filtering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status)
  `);

  // Create index on prefix for filtering flagged items
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_inbox_items_prefix ON inbox_items(prefix)
  `);
}
