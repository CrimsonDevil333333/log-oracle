#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const readline = require('readline');
const Fuse = require('fuse.js');

const program = new Command();

program
  .name('log-oracle')
  .description('A CLI to distill "WTF" moments from logs.')
  .version('1.0.0')
  .argument('[file]', 'Log file to analyze (or stdin)')
  .option('-s, --sensitivity <level>', 'Fuzzy match sensitivity (0.0 to 1.0)', '0.4')
  .option('-i, --ignore <pattern>', 'Add patterns to ignore (comma separated)')
  .action(async (file, options) => {
    const stream = file ? fs.createReadStream(file) : process.stdin;
    const rl = readline.createInterface({ input: stream, terminal: false });

    // Chalk v4 fix: ensuring properties are accessed correctly
    const patterns = [
      { regex: /error|fail|exception|fatal|critical/i, label: chalk.red('CRITICAL') },
      { regex: /warn|issue|alert/i, label: chalk.yellow('WARNING') },
      { regex: /denied|forbidden|unauthorized|403|401/i, label: chalk.magenta('SECURITY') },
      { regex: /timeout|latency|slow|hang/i, label: chalk.cyan('PERF') }
    ];

    const ignoreList = options.ignore ? options.ignore.split(',') : ['info', 'debug', 'routine', 'heartbeat_ok'];
    const groupedErrors = new Map();

    console.log(chalk.blue('\n🔮 Log Oracle is meditating on your logs...\n'));

    for await (const line of rl) {
      const lowerLine = line.toLowerCase();
      if (ignoreList.some(p => lowerLine.includes(p.toLowerCase()))) continue;

      for (const p of patterns) {
        if (p.regex.test(line)) {
          const cleanLine = line.replace(/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}.*?\s/, '').trim();
          
          let foundGroup = false;
          for (const key of groupedErrors.keys()) {
            const fuse = new Fuse([key], { threshold: parseFloat(options.sensitivity) });
            if (fuse.search(cleanLine).length > 0) {
              groupedErrors.set(key, (groupedErrors.get(key) || 0) + 1);
              foundGroup = true;
              break;
            }
          }

          if (!foundGroup) {
            groupedErrors.set(cleanLine, 1);
            console.log(`${p.label} ${line.trim()}`);
          }
          break;
        }
      }
    }

    console.log(chalk.blue('\n✨ Summary of "WTF" Moments:'));
    if (groupedErrors.size === 0) {
      console.log(chalk.green('   No issues found. Everything is zen.'));
    } else {
      for (const [msg, count] of groupedErrors) {
        if (count > 1) {
          console.log(`   ${chalk.gray(`(Happened ${count}x)`)} ${msg}`);
        } else {
          console.log(`   ${msg}`);
        }
      }
    }
    console.log('');
  });

program.parse();
