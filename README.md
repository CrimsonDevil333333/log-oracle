# Log-Oracle 🔮

Distill the noise. Group the patterns. Find the "WTF" in your logs.

## Features
- **Smart Filtering:** Ignores routine `INFO` and `DEBUG` noise by default.
- **Fuzzy Deduplication:** Groups similar error messages together (using Fuse.js) so you see one alert for a repeating issue.
- **Colorized Output:** Highlights `CRITICAL`, `WARNING`, `SECURITY`, and `PERF` issues.
- **Summary Mode:** Lists grouped issues at the end with occurrence counts.

## Install
```bash
npm install
```

## Run
```bash
# Analyze a file
node index.js app.log

# Pipe logs directly
tail -f app.log | node index.js
```

## Options
- `-s, --sensitivity`: Adjust fuzzy matching (default: 0.4).
- `-i, --ignore`: Comma-separated list of additional words to skip.

## License
MIT - Copyright (c) 2026 Satyaa & Clawdy
