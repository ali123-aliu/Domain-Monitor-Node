#!/usr/bin/env node
/**
 * Domain Monitor Scheduler
 * Runs domainMonitor.js every 10 minutes to check domain status.
 */

require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { main: domainMonitorMain } = require('./domainMonitor');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Scheduler Configuration
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '10');
const LOG_FILE = process.env.SCHEDULER_LOG_FILE || 'scheduler.log';
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

// Log Cleanup Configuration
const CLEANUP_DAYS = parseInt(process.env.CLEANUP_DAYS || '1'); // Days to keep logs
const CLEANUP_TIME = process.env.CLEANUP_TIME || '00:00'; // Time to run cleanup (24h format)

// ============================================================================
// SETUP LOGGING
// ============================================================================

function log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${level} - ${message}`;
    
    // Log to console
    console.log(logMessage);
    
    // Log to file
    try {
        fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (error) {
        console.error(`Failed to write to log file: ${error.message}`);
    }
}

function logger(level) {
    return (message) => {
        const levels = { 'DEBUG': 0, 'INFO': 1, 'WARNING': 2, 'ERROR': 3 };
        const currentLevel = levels[LOG_LEVEL.toUpperCase()] || 1;
        const messageLevel = levels[level.toUpperCase()] || 1;
        
        if (messageLevel >= currentLevel) {
            log(level, message);
        }
    };
}

const loggerInfo = logger('INFO');
const loggerWarning = logger('WARNING');
const loggerError = logger('ERROR');

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Clean up log files older than configured days.
 */
function cleanupOldLogs() {
    try {
        loggerInfo("Starting daily log cleanup...");
        
        // Get current time
        const now = Date.now();
        const cutoffTime = now - (CLEANUP_DAYS * 24 * 60 * 60 * 1000);
        
        // List of log files to clean
        const logFiles = [
            'domain_monitor.log',
            'scheduler.log'
        ];
        
        let deletedCount = 0;
        
        for (const logFile of logFiles) {
            try {
                if (fs.existsSync(logFile)) {
                    // Get file modification time
                    const stats = fs.statSync(logFile);
                    const fileTime = stats.mtime.getTime();
                    
                    // Check if file is older than configured days
                    if (fileTime < cutoffTime) {
                        fs.unlinkSync(logFile);
                        deletedCount++;
                        loggerInfo(`Deleted old log file: ${logFile}`);
                    }
                }
            } catch (error) {
                loggerWarning(`Could not process log file ${logFile}: ${error.message}`);
            }
        }
        
        // Also check for any other .log files
        try {
            const files = fs.readdirSync('.');
            for (const file of files) {
                if (file.endsWith('.log') && !logFiles.includes(file)) {
                    try {
                        const stats = fs.statSync(file);
                        const fileTime = stats.mtime.getTime();
                        if (fileTime < cutoffTime) {
                            fs.unlinkSync(file);
                            deletedCount++;
                            loggerInfo(`Deleted old log file: ${file}`);
                        }
                    } catch (error) {
                        // Ignore errors for other log files
                    }
                }
            }
        } catch (error) {
            // Ignore directory read errors
        }
        
        loggerInfo(`Log cleanup completed. Deleted ${deletedCount} old log files.`);
        
    } catch (error) {
        loggerError(`Error during log cleanup: ${error.message}`);
    }
}

/**
 * Run the domain monitor check.
 */
async function runDomainCheck() {
    try {
        loggerInfo("=".repeat(60));
        loggerInfo(`Starting scheduled domain check at ${new Date().toLocaleString()}`);
        loggerInfo("=".repeat(60));
        
        // Run the domain check
        const result = await domainMonitorMain();
        
        loggerInfo(`Domain check completed at ${new Date().toLocaleString()}`);
        loggerInfo("=".repeat(60));
        
        return result;
        
    } catch (error) {
        loggerError(`Error running domain check: ${error.message}`);
        return null;
    }
}

/**
 * Start the scheduler to run domain checks at configured interval.
 */
function startScheduler() {
    loggerInfo("=".repeat(60));
    loggerInfo("Domain Monitor Scheduler Starting");
    loggerInfo(`Check interval: ${CHECK_INTERVAL_MINUTES} minutes`);
    loggerInfo("=".repeat(60));
    
    // Convert cleanup time to cron format (HH:MM)
    const [cleanupHour, cleanupMinute] = CLEANUP_TIME.split(':').map(Number);
    
    // Schedule the domain check to run at configured interval
    // Cron format: "*/X * * * *" means every X minutes
    const cronExpression = `*/${CHECK_INTERVAL_MINUTES} * * * *`;
    cron.schedule(cronExpression, () => {
        runDomainCheck().catch(error => {
            loggerError(`Scheduled check failed: ${error.message}`);
        });
    });
    
    // Schedule daily log cleanup at configured time
    cron.schedule(`${cleanupMinute} ${cleanupHour} * * *`, () => {
        cleanupOldLogs();
    });
    
    // Run initial check immediately
    loggerInfo("Running initial domain check...");
    runDomainCheck().catch(error => {
        loggerError(`Initial check failed: ${error.message}`);
    });
    
    // Run initial log cleanup
    loggerInfo("Running initial log cleanup...");
    cleanupOldLogs();
    
    loggerInfo("Scheduler is running. Press Ctrl+C to stop.");
}

/**
 * Main function to start the scheduler.
 */
function main() {
    loggerInfo("Starting Domain Monitor Scheduler...");
    startScheduler();
}

// Run if called directly
if (require.main === module) {
    main();
    
    // Keep the process running
    process.on('SIGINT', () => {
        loggerInfo("Scheduler stopped by user");
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        loggerInfo("Scheduler stopped");
        process.exit(0);
    });
}

module.exports = { startScheduler, runDomainCheck, cleanupOldLogs };

