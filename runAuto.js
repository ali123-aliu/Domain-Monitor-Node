#!/usr/bin/env node
/**
 * Auto-run Domain Monitor
 * Automatically runs the domain monitor scheduler with environment configuration.
 */

require('dotenv').config();

function setupEnvironment() {
    /**
     * Set up environment variables with defaults.
     */
    console.log("=".repeat(60));
    console.log("Domain Monitor Auto-Runner");
    console.log("=".repeat(60));
    
    // Set default values if not already set
    const defaults = {
        'DOMAIN_URL': 'https://example.com',
        'CHECK_INTERVAL_MINUTES': '10',
        'REQUEST_TIMEOUT': '10',
        'LOG_LEVEL': 'INFO',
        'LOG_FILE': 'domain_monitor.log',
        'SCHEDULER_LOG_FILE': 'scheduler.log'
    };
    
    console.log("Setting up environment variables...");
    for (const [key, defaultValue] of Object.entries(defaults)) {
        if (!process.env[key]) {
            process.env[key] = defaultValue;
            console.log(`  ${key} = ${defaultValue} (default)`);
        } else {
            console.log(`  ${key} = ${process.env[key]} (from env)`);
        }
    }
    
    console.log(`\nDomain to monitor: ${process.env.DOMAIN_URL}`);
    console.log(`Check interval: ${process.env.CHECK_INTERVAL_MINUTES} minutes`);
    console.log(`Request timeout: ${process.env.REQUEST_TIMEOUT} seconds`);
    console.log("=".repeat(60));
}

async function main() {
    /**
     * Main function to run the domain monitor automatically.
     */
    // Set up environment
    setupEnvironment();
    
    // Check if Cliq credentials are set
    const cliqCreds = [
        'ZOHO_CLIQ_CLIENT_ID',
        'ZOHO_CLIQ_CLIENT_SECRET', 
        'ZOHO_CLIQ_REFRESH_TOKEN',
        'ZOHO_CLIQ_CHANNEL_ID'
    ];
    
    const missingCreds = cliqCreds.filter(cred => !process.env[cred]);
    
    if (missingCreds.length > 0) {
        console.log("WARNING: Missing Cliq credentials:");
        for (const cred of missingCreds) {
            console.log(`  - ${cred}`);
        }
        console.log("\nDomain monitoring will work, but Cliq alerts will be skipped.");
        console.log("Set these environment variables to enable Cliq notifications.");
    } else {
        console.log("[OK] All Cliq credentials configured - alerts will be sent!");
    }
    
    console.log("\nStarting domain monitor scheduler...");
    console.log("Press Ctrl+C to stop");
    console.log("=".repeat(60));
    
    // Import and run the scheduler
    try {
        const { startScheduler } = require('./scheduler');
        startScheduler();
        
        // Keep the process running
        process.on('SIGINT', () => {
            console.log("\nScheduler stopped by user");
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log("\nScheduler stopped");
            process.exit(0);
        });
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { setupEnvironment, main };

