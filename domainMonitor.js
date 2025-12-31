#!/usr/bin/env node
/**
 * Simple Domain Monitor
 * Checks if a domain has an OK response or not and sends Cliq notifications.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendCliqChannelMessage } = require('./cliqMessage');

// ============================================================================
// CONFIGURATION SECTION
// ============================================================================

// Domain to monitor
const DOMAIN_URL = process.env.DOMAIN_URL || 'https://example.com';

// Request timeout in seconds
const REQUEST_TIMEOUT = parseFloat(process.env.REQUEST_TIMEOUT || '10') * 1000; // Convert to milliseconds

// Logging Configuration
const LOG_FILE = process.env.LOG_FILE || 'domain_monitor.log';
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

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
 * Check if the domain has an OK response and get response data.
 * 
 * @param {string} url - The URL to check
 * @returns {Promise<object>} Response data with status, content, headers, etc.
 */
async function checkDomain(url) {
    try {
        loggerInfo(`Checking domain: ${url}`);
        
        const startTime = Date.now();
        const response = await axios.get(url, {
            timeout: REQUEST_TIMEOUT,
            maxRedirects: 5,
            validateStatus: () => true // Don't throw on any status code
        });
        const responseTime = (Date.now() - startTime) / 1000;
        
        // Get response data
        const responseData = {
            url: url,
            statusCode: response.status,
            isOk: response.status === 200,
            headers: response.headers,
            contentLength: response.data ? (typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length) : 0,
            responseTime: responseTime,
            contentType: response.headers['content-type'] || 'unknown',
            contentPreview: response.data ? 
                (typeof response.data === 'string' ? 
                    (response.data.length > 200 ? response.data.substring(0, 200) + '...' : response.data) :
                    JSON.stringify(response.data).substring(0, 200) + '...') : 
                ''
        };
        
        if (response.status === 200) {
            loggerInfo(`Domain ${url} is OK (Status: ${response.status})`);
            loggerInfo(`Response time: ${responseData.responseTime.toFixed(2)}s`);
            loggerInfo(`Content length: ${responseData.contentLength} bytes`);
            loggerInfo(`Content type: ${responseData.contentType}`);
        } else {
            loggerWarning(`Domain ${url} returned non-200 status: ${response.status}`);
        }
        
        return responseData;
            
    } catch (error) {
        let errorData;
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            errorData = {
                url: url,
                statusCode: null,
                isOk: false,
                error: 'timeout',
                errorMessage: `Request to ${url} timed out after ${REQUEST_TIMEOUT / 1000} seconds`
            };
            loggerError(errorData.errorMessage);
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
            errorData = {
                url: url,
                statusCode: null,
                isOk: false,
                error: error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' ? 'dns_error' : 'connection_error',
                errorMessage: `Unable to connect to ${url} - ${error.message}`
            };
            loggerError(errorData.errorMessage);
        } else if (error.response) {
            // Got a response but with error status
            errorData = {
                url: url,
                statusCode: error.response.status,
                isOk: false,
                error: 'http_error',
                errorMessage: `HTTP error: ${error.response.status} - ${error.message}`
            };
            loggerError(errorData.errorMessage);
        } else {
            errorData = {
                url: url,
                statusCode: null,
                isOk: false,
                error: 'unexpected_error',
                errorMessage: `Unexpected error: ${error.message}`
            };
            loggerError(errorData.errorMessage);
        }
        
        return errorData;
    }
}

/**
 * Main function to check domain status and send Cliq notifications.
 */
async function main() {
    loggerInfo("=".repeat(60));
    loggerInfo("Domain Monitor Started");
    loggerInfo("=".repeat(60));
    
    // Check the domain and get response data
    const responseData = await checkDomain(DOMAIN_URL);
    
    // Display results and send Cliq notifications
    if (responseData.isOk) {
        loggerInfo(`[OK] Domain ${DOMAIN_URL} is healthy`);
        loggerInfo(`Status Code: ${responseData.statusCode}`);
        loggerInfo(`Response Time: ${responseData.responseTime.toFixed(2)}s`);
        loggerInfo(`Content Length: ${responseData.contentLength} bytes`);
        loggerInfo(`Content Type: ${responseData.contentType}`);
        loggerInfo(`Content Preview: ${responseData.contentPreview}`);
        
        // Domain is OK - No Cliq message needed
        loggerInfo("Domain is healthy - No alert sent to Cliq");
        
    } else {
        // ANY reason domain didn't respond with 200 = DANGER ALERT
        loggerError(`[ERROR] Domain ${DOMAIN_URL} is not responding properly`);
        if (responseData.error) {
            loggerError(`Error Type: ${responseData.error}`);
        }
        if (responseData.errorMessage) {
            loggerError(`Error Message: ${responseData.errorMessage}`);
        }
        if (responseData.statusCode) {
            loggerError(`Status Code: ${responseData.statusCode}`);
        }
        
        // Send danger alert to Cliq - ONLY when domain is not OK
        loggerError("Sending DANGER ALERT to Cliq...");
        try {
            await sendCliqChannelMessage("danger");
        } catch (error) {
            loggerError(`Failed to send Cliq alert: ${error.message}`);
        }
    }
    
    loggerInfo("Domain Monitor Completed");
    loggerInfo("=".repeat(60));
    
    // Return the response data for programmatic use
    return responseData;
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        loggerError(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { checkDomain, main };

