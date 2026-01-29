import { Command } from 'commander';
import { initializeSchema } from './db/schema';
import {
  listInboxItems,
  getInboxItemById,
  triageInboxItem,
  updateInboxItem,
} from './db/inbox';
import type { ItemStatus, InboxItem } from './types';

// Initialize database schema
initializeSchema();

const program = new Command();

program
  .name('inbox')
  .description('Life OS inbox CLI for Clawdbot/Max');

// List command
program
  .command('list')
  .description('List inbox items')
  .option('-s, --status <status>', 'Filter by status (new, triaged, processed, archived)')
  .option('-p, --prefix <prefix>', 'Filter by prefix (NOW, URGENT, SORT_NOW)')
  .option('-l, --limit <number>', 'Limit number of results', '50')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const items = listInboxItems({
      status: options.status as ItemStatus | undefined,
      prefix: options.prefix,
      limit: parseInt(options.limit, 10),
    });

    if (options.json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log('No items found.');
      return;
    }

    console.log(`Found ${items.length} item(s):\n`);
    for (const item of items) {
      const prefixTag = item.prefix ? ` [${item.prefix}]` : '';
      const transcriptionTag = item.needsTranscription ? ' [NEEDS_TRANSCRIPTION]' : '';
      const attachmentCount = item.attachments.length;
      const attachmentTag = attachmentCount > 0 ? ` (${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''})` : '';

      console.log(`#${item.id} [${item.status}]${prefixTag}${transcriptionTag}${attachmentTag}`);
      console.log(`  Created: ${item.createdAt}`);
      if (item.rawText) {
        const preview = item.rawText.length > 80 ? item.rawText.slice(0, 80) + '...' : item.rawText;
        console.log(`  Text: ${preview}`);
      }
      if (item.summary) {
        console.log(`  Summary: ${item.summary}`);
      }
      console.log('');
    }
  });

// Get command
program
  .command('get <id>')
  .description('Get inbox item details')
  .option('--json', 'Output as JSON')
  .action((id, options) => {
    const item = getInboxItemById(parseInt(id, 10));

    if (!item) {
      console.error(`Item #${id} not found.`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    printItemDetails(item);
  });

// Triage command
program
  .command('triage <id>')
  .description('Add triage fields to an inbox item')
  .option('--summary <text>', 'Summary of the item')
  .option('--pipeline <name>', 'Primary pipeline')
  .option('--bucket <name>', 'Primary bucket')
  .option('--priority <level>', 'Priority level')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
  .option('--next-action <text>', 'Next action')
  .option('--why <text>', 'Why this priority/categorization')
  .option('--json', 'Output as JSON')
  .action((id, options) => {
    const item = triageInboxItem(parseInt(id, 10), {
      summary: options.summary,
      primaryPipeline: options.pipeline,
      primaryBucket: options.bucket,
      priority: options.priority,
      tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
      dueDate: options.dueDate,
      nextAction: options.nextAction,
      why: options.why,
    });

    if (!item) {
      console.error(`Item #${id} not found.`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    console.log(`Triaged item #${id}:`);
    printItemDetails(item);
  });

// Update command
program
  .command('update <id>')
  .description('Update inbox item fields')
  .option('--status <status>', 'New status (new, triaged, processed, archived)')
  .option('--transcript <text>', 'Set transcript')
  .option('--needs-transcription <bool>', 'Set needs_transcription flag (true/false)')
  .option('--json', 'Output as JSON')
  .action((id, options) => {
    const item = updateInboxItem(parseInt(id, 10), {
      status: options.status as ItemStatus | undefined,
      transcript: options.transcript,
      needsTranscription: options.needsTranscription !== undefined
        ? options.needsTranscription === 'true'
        : undefined,
    });

    if (!item) {
      console.error(`Item #${id} not found.`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    console.log(`Updated item #${id}:`);
    printItemDetails(item);
  });

function printItemDetails(item: InboxItem): void {
  console.log('');
  console.log(`=== Inbox Item #${item.id} ===`);
  console.log(`Status: ${item.status}`);
  console.log(`Created: ${item.createdAt}`);
  console.log(`Source: ${item.source}`);
  if (item.prefix) console.log(`Prefix: ${item.prefix}`);
  console.log(`Needs Transcription: ${item.needsTranscription}`);
  console.log('');

  if (item.rawText) {
    console.log('--- Raw Text ---');
    console.log(item.rawText);
    console.log('');
  }

  if (item.transcript) {
    console.log('--- Transcript ---');
    console.log(item.transcript);
    console.log('');
  }

  if (item.attachments.length > 0) {
    console.log('--- Attachments ---');
    for (const att of item.attachments) {
      console.log(`  - ${att.type}: ${att.filePath}`);
      if (att.fileName) console.log(`    File: ${att.fileName}`);
      if (att.mimeType) console.log(`    MIME: ${att.mimeType}`);
      if (att.fileSize) console.log(`    Size: ${att.fileSize} bytes`);
    }
    console.log('');
  }

  // Triage fields
  if (item.summary || item.primaryPipeline || item.primaryBucket || item.tags.length > 0 ||
      item.priority || item.dueDate || item.nextAction || item.why) {
    console.log('--- Triage Data ---');
    if (item.summary) console.log(`Summary: ${item.summary}`);
    if (item.primaryPipeline) console.log(`Pipeline: ${item.primaryPipeline}`);
    if (item.primaryBucket) console.log(`Bucket: ${item.primaryBucket}`);
    if (item.tags.length > 0) console.log(`Tags: ${item.tags.join(', ')}`);
    if (item.priority) console.log(`Priority: ${item.priority}`);
    if (item.dueDate) console.log(`Due Date: ${item.dueDate}`);
    if (item.nextAction) console.log(`Next Action: ${item.nextAction}`);
    if (item.why) console.log(`Why: ${item.why}`);
    console.log('');
  }
}

export { program };
