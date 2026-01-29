import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'life-os.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure attachments directory exists
const ATTACHMENTS_DIR = path.join(DATA_DIR, 'attachments');
if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

export const db: DatabaseType = new Database(DB_PATH);

// Enable foreign keys
db.pragma('journal_mode = WAL');

export { DATA_DIR, ATTACHMENTS_DIR };
