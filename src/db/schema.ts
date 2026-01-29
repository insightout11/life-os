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
      why TEXT
    )
  `);

  // Create index on status for efficient filtering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status)
  `);

  // Create index on prefix for filtering flagged items
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_inbox_items_prefix ON inbox_items(prefix)
  `);
}
