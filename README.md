# Life OS v1

Minimal capture + storage layer for Telegram messages. V1 focuses on:
- Receiving Telegram messages (text/image/voice/document)
- Storing everything as InboxItem in SQLite
- Flagging special prefixes (`NOW:`, `URGENT:`, `SORT NOW`)
- CLI for Clawdbot/Max to query and triage items

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from template:
```bash
cp .env.example .env
```

3. Get a Telegram bot token from [@BotFather](https://t.me/BotFather) and add it to `.env`:
```
TELEGRAM_BOT_TOKEN=your_token_here
```

## Running the Bot

```bash
npm run bot
# or
npx ts-node src/index.ts bot
```

The bot will:
- Reply "Saved." to every message
- Store the message content in SQLite
- Download attachments to `data/attachments/`
- Parse prefixes: `NOW:`, `URGENT:`, `SORT NOW`

## CLI Usage

### List items
```bash
# List all items
npx ts-node src/index.ts inbox list

# List new items only
npx ts-node src/index.ts inbox list --status new

# List items with specific prefix
npx ts-node src/index.ts inbox list --prefix NOW

# Output as JSON (for Clawdbot/Max)
npx ts-node src/index.ts inbox list --status new --json
```

### Get item details
```bash
npx ts-node src/index.ts inbox get 42
npx ts-node src/index.ts inbox get 42 --json
```

### Triage an item
```bash
npx ts-node src/index.ts inbox triage 42 \
  --summary "Design review for landing page" \
  --pipeline business \
  --bucket B \
  --priority B \
  --tags "design,website" \
  --next-action "Schedule 30min review call" \
  --why "Clear ask,Has deadline,Needs input"
```

### Update item status
```bash
npx ts-node src/index.ts inbox update 42 --status triaged
npx ts-node src/index.ts inbox update 42 --transcript "Transcribed text here"
```

## Data Model

Each `InboxItem` contains:

| Field | Description |
|-------|-------------|
| `id` | Auto-incrementing ID |
| `createdAt` | Timestamp |
| `source` | Always "telegram" for V1 |
| `rawText` | Message text (prefix stripped) |
| `attachments` | Array of downloaded files |
| `transcript` | null for V1 |
| `needsTranscription` | true for voice/audio messages |
| `prefix` | null, NOW, URGENT, or SORT_NOW |
| `status` | new, triaged, processed, archived |

**Triage fields** (populated by Clawdbot/Max):
- `summary`, `primaryPipeline`, `primaryBucket`
- `tags`, `priority`, `dueDate`, `nextAction`, `why`

## Message Prefixes

Messages can start with special prefixes for flagging:

- `NOW: <text>` - Immediate attention needed
- `URGENT: <text>` - High priority
- `SORT NOW` or `SORT NOW: <text>` - Needs immediate sorting

## File Structure

```
life-os/
├── src/
│   ├── index.ts      # Entry point (bot or CLI)
│   ├── bot.ts        # Telegram bot
│   ├── cli.ts        # CLI commands
│   ├── types.ts      # TypeScript interfaces
│   └── db/
│       ├── index.ts  # SQLite connection
│       ├── schema.ts # Table definitions
│       └── inbox.ts  # CRUD operations
└── data/             # Created at runtime
    ├── life-os.db    # SQLite database
    └── attachments/  # Downloaded files
```
