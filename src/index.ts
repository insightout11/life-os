import 'dotenv/config';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'bot') {
  // Start Telegram bot
  const { startBot } = require('./bot');
  startBot();
} else if (command === 'ui') {
  // Start UI API server
  require('./server');
} else if (command === 'transcribe') {
  // Run transcription worker
  require('./transcribe').runTranscribe();
} else if (command === 'inbox' || !command) {
  // Run CLI
  const { program } = require('./cli');
  // Remove 'inbox' from args if present
  const cliArgs = command === 'inbox' ? args.slice(1) : args;
  program.parse(['node', 'inbox', ...cliArgs]);
} else {
  console.log('Life OS v1');
  console.log('');
  console.log('Usage:');
  console.log('  npx ts-node src/index.ts bot              Start Telegram bot');
  console.log('  npx ts-node src/index.ts inbox <command>  Run inbox CLI');
  console.log('');
  console.log('CLI Commands:');
  console.log('  inbox list [--status new]                 List inbox items');
  console.log('  inbox get <id>                            Get item details');
  console.log('  inbox triage <id> --summary "..."         Triage an item');
  console.log('  inbox update <id> --status triaged        Update item status');
  console.log('');
  console.log('Run "npx ts-node src/index.ts inbox --help" for more CLI options.');
}
