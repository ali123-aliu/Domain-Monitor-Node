# Domain Monitor - Node.js Version

A domain monitoring system that checks if a domain is responding correctly and sends alerts to Zoho Cliq when issues are detected.

## Directory Structure

```
Domain-Monitor-Node/
├── domainMonitor.js          # Main domain monitoring script
├── cliqMessage.js            # Zoho Cliq messaging functions
├── scheduler.js               # Scheduler for automatic monitoring
├── runAuto.js                # Auto-run script with environment setup
├── start_scheduler.bat       # Windows batch file to start scheduler
├── package.json              # Node.js dependencies
├── config.env               # Environment configuration template
├── .env                     # Local environment variables (create from config.env)
├── domain_monitor.log      # Domain monitor logs
├── scheduler.log           # Scheduler logs
└── README.md               # This file
```

## Quick Start

1. **Install Node.js** (v14 or higher recommended)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Copy `config.env` to `.env`
   - Update the values in `.env` with your configuration:
     - Set `DOMAIN_URL` to the domain you want to monitor
     - Configure Zoho Cliq credentials if you want alerts (optional)

4. **Run the monitor:**
   ```bash
   npm start
   ```
   Or on Windows, double-click `start_scheduler.bat`

## Features

- ✅ Automatic domain health checks at configurable intervals
- ✅ Detailed logging with configurable log levels
- ✅ Zoho Cliq integration for alerts
- ✅ Automatic log cleanup
- ✅ Error handling for timeouts, connection errors, DNS errors
- ✅ Response time and content analysis

## Configuration

All configuration is done through environment variables (set in `.env` file):

- `DOMAIN_URL` - The domain to monitor (default: https://example.com)
- `CHECK_INTERVAL_MINUTES` - How often to check the domain (default: 10 minutes)
- `REQUEST_TIMEOUT` - Request timeout in seconds (default: 10)
- `LOG_LEVEL` - Logging level: DEBUG, INFO, WARNING, ERROR (default: INFO)
- `LOG_FILE` - Domain monitor log file (default: domain_monitor.log)
- `SCHEDULER_LOG_FILE` - Scheduler log file (default: scheduler.log)
- `CLEANUP_DAYS` - Days to keep logs (default: 1)
- `CLEANUP_TIME` - Time to run cleanup in 24h format (default: 00:00)

### Zoho Cliq Configuration (Optional)

To enable Cliq alerts, set these environment variables:
- `ZOHO_CLIQ_CLIENT_ID` - Your Zoho Cliq OAuth client ID
- `ZOHO_CLIQ_CLIENT_SECRET` - Your Zoho Cliq OAuth client secret
- `ZOHO_CLIQ_REFRESH_TOKEN` - Your Zoho Cliq refresh token
- `ZOHO_CLIQ_CHANNEL_ID` - The Cliq channel ID to send alerts to

## Usage

### Run once (single check)
```bash
npm run monitor
# or
node domainMonitor.js
```

### Run scheduler (continuous monitoring)
```bash
npm start
# or
node runAuto.js
# or
node scheduler.js
```

## How It Works

1. The scheduler runs domain checks at the configured interval
2. Each check makes an HTTP request to the configured domain
3. If the domain responds with HTTP 200, it's considered healthy
4. If the domain is down, returns non-200 status, times out, or has connection errors, a DANGER alert is sent to Zoho Cliq
5. All checks are logged to `domain_monitor.log`
6. Scheduler activity is logged to `scheduler.log`
7. Old log files are automatically cleaned up daily

## Dependencies

- `axios` - HTTP client for making requests
- `dotenv` - Environment variable management
- `node-cron` - Task scheduling

## Notes

- The monitor only sends alerts when the domain is DOWN or not responding properly
- Healthy domains do not trigger alerts (to reduce noise)
- Log files are automatically cleaned up based on the `CLEANUP_DAYS` setting
- The scheduler runs continuously until stopped (Ctrl+C)

## License

ISC

