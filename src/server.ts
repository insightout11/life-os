import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { listInboxItems, getInboxItemById, updateInboxItem, triageInboxItem } from './db/inbox';
import { ATTACHMENTS_DIR } from './db';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

function requireToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const UI_TOKEN = process.env.LIFEOS_UI_TOKEN;
  if (!UI_TOKEN) return next();
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header;
  if (token && token === UI_TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Static UI (simple v1)
const uiDir = path.join(process.cwd(), 'ui');
app.use('/', express.static(uiDir, { index: 'index.html' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Attachments (serve local files saved from Telegram)
// Note: <img>/<audio> tags can't send Authorization headers, so we allow token via query param `t`.
function requireTokenForAsset(req: express.Request, res: express.Response, next: express.NextFunction) {
  const UI_TOKEN = process.env.LIFEOS_UI_TOKEN;
  if (!UI_TOKEN) return next();
  const header = req.header('authorization') || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header;
  const queryToken = typeof req.query.t === 'string' ? req.query.t : '';
  const token = headerToken || queryToken;
  if (token && token === UI_TOKEN) return next();
  res.status(401).send('Unauthorized');
}

app.get('/attachments/:name', requireTokenForAsset, (req, res) => {
  const name = String(req.params.name || '');
  // prevent path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return res.status(400).send('Bad filename');
  }
  const filePath = path.join(ATTACHMENTS_DIR, name);
  res.sendFile(filePath, (err) => {
    if (err) {
      const anyErr = err as any;
      res.status(anyErr?.statusCode || 404).send('Not found');
    }
  });
});

// Inbox
app.get('/api/inbox', requireToken, (req, res) => {
  const status = (req.query.status as string | undefined) || undefined;
  const prefix = (req.query.prefix as string | undefined) || undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;
  const items = listInboxItems({ status: status as any, prefix, limit });
  res.json({ items });
});

app.get('/api/inbox/:id', requireToken, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const item = getInboxItemById(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ item });
});

app.post('/api/inbox/:id/update', requireToken, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const item = updateInboxItem(id, req.body || {});
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ item });
});

app.post('/api/inbox/:id/triage', requireToken, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const item = triageInboxItem(id, req.body || {});
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ item });
});

const port = parseInt(process.env.LIFEOS_UI_PORT || '8733', 10);
const host = process.env.LIFEOS_UI_HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`Life OS UI API listening on http://${host}:${port}`);
  console.log(`cwd=${process.cwd()} LIFEOS_UI_TOKEN=${process.env.LIFEOS_UI_TOKEN ? '[set]' : '[missing]'}`);
});
