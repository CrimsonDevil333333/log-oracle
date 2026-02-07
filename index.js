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
  .version('1.1.0')
  .argument('[file]', 'Log file to analyze (or stdin)')
  .option('-s, --sensitivity <level>', 'Fuzzy match sensitivity (0.0 to 1.0)', '0.4')
  .option('-i, --ignore <pattern>', 'Add patterns to ignore (comma separated)')
  .option('-j, --json', 'Output results as JSON')
  .option('-w, --watch', 'Watch mode (keep running for live streams)')
  .action(async (file, options) => {
    const stream = file ? fs.createReadStream(file) : process.stdin;
    const rl = readline.createInterface({ input: stream, terminal: false });

    const patterns = [
      { regex: /error|fail|exception|fatal|critical/i, label: chalk.red.bold('CRITICAL'), key: 'critical' },
      { regex: /warn|issue|alert/i, label: chalk.yellow.bold('WARNING'), key: 'warning' },
      { regex: /denied|forbidden|unauthorized|403|401/i, label: chalk.magenta.bold('SECURITY'), key: 'security' },
      { regex: /timeout|latency|slow|hang/i, label: chalk.cyan.bold('PERF'), key: 'perf' }
    ];

    const ignoreList = options.ignore ? options.ignore.split(',') : ['info', 'debug', 'routine', 'heartbeat_ok'];
    const groupedErrors = new Map();
    const stats = { total: 0, critical: 0, warning: 0, security: 0, perf: 0 };

    if (!options.json) {
      console.log(chalk.blue.bold('\n🔮 Log Oracle is meditating on your logs...'));
      if (options.watch) console.log(chalk.gray('   (Watching live input...)\n'));
      else console.log('');
    }

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
            if (!options.json) console.log(`${p.label} ${line.trim()}`);
          }
          
          stats.total++;
          stats[p.key]++;
          break;
        }
      }
    }

    if (options.json) {
      const output = {
        stats,
        issues: Array.from(groupedErrors).map(([msg, count]) => ({ msg, count }))
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(chalk.blue.bold('\n📊 Log Oracle Statistics:'));
      console.log(`   Total WTF Moments: ${stats.total}`);
      console.log(`   - Critical: ${chalk.red(stats.critical)}`);
      console.log(`   - Warnings: ${chalk.yellow(stats.warning)}`);
      console.log(`   - Security: ${chalk.magenta(stats.security)}`);
      console.log(`   - Performance: ${chalk.cyan(stats.perf)}`);

      console.log(chalk.blue.bold('\n✨ Summary of Unique Grouped Issues:'));
      if (groupedErrors.size === 0) {
        console.log(chalk.green('   No issues found. Everything is zen.'));
      } else {
        for (const [msg, count] of groupedErrors) {
          const countLabel = count > 1 ? chalk.gray(`(Happened ${count}x)`) : '';
          console.log(`   ${countLabel} ${msg}`);
        }
      }
      console.log('');
    }
  });

program.parse();
