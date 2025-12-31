#!/usr/bin/env node
/**
 * Zoho Cliq Channel Message
 * A separate file to handle sending messages to Zoho Cliq channels using OAuth.
 */

require('dotenv').config();
const axios = require('axios');

// Global variables for token caching
let cachedToken = null;
let tokenExpiryTime = null;

/**
 * Get Zoho Cliq access token using refresh token.
 * Implements token caching to avoid unnecessary API calls.
 * 
 * @returns {Promise<string>} Access token for Zoho Cliq API
 */
async function getAccessToken() {
    // Check if we have a valid cached token
    const currentTime = Date.now();
    if (cachedToken && tokenExpiryTime && currentTime < tokenExpiryTime) {
        console.log("Using cached access token");
        return cachedToken;
    }

    // Get environment variables
    const clientId = process.env.ZOHO_CLIQ_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIQ_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_CLIQ_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Missing Zoho Cliq API credentials");
    }

    // Get a new access token using the refresh token
    const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";

    const params = new URLSearchParams({
        'refresh_token': refreshToken,
        'client_id': clientId,
        'client_secret': clientSecret,
        'grant_type': 'refresh_token',
    });

    try {
        console.log("Getting new Zoho Cliq access token...");
        const response = await axios.post(
            tokenUrl,
            params.toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000
            }
        );

        if (!response.data || !response.data.access_token) {
            const errorMsg = response.data?.error || 'Unknown error';
            const errorDescription = response.data?.error_description || 'No description available';
            throw new Error(`Failed to get access token: ${errorMsg} - ${errorDescription}`);
        }

        // Cache the token with expiry time (subtract 5 minutes for safety)
        cachedToken = response.data.access_token;
        tokenExpiryTime = currentTime + (response.data.expires_in * 1000) - 300000; // 5 minutes buffer

        console.log("Successfully obtained new access token");
        return response.data.access_token;
        
    } catch (error) {
        console.error(`Error getting Zoho access token: ${error.message}`);
        throw error;
    }
}

/**
 * Send a message to a Zoho Cliq channel.
 * Automatically gets access token, channel ID from environment.
 * 
 * @param {string} messageType - Type of message - "ok" or "danger"
 * @returns {Promise<object>} Response from the API
 */
async function sendCliqChannelMessage(messageType = "ok") {
    // Get channel ID from environment
    const channelId = process.env.ZOHO_CLIQ_CHANNEL_ID;
    if (!channelId) {
        throw new Error("ZOHO_CLIQ_CHANNEL_ID not set in environment variables");
    }
    
    // Get domain URL for the message
    const domainUrl = process.env.DOMAIN_URL || 'https://example.com';
    const currentTime = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Create appropriate message based on type
    let message;
    if (messageType === "danger") {
        message = `🚨🚨🚨 **CRITICAL ALERT** 🚨🚨🚨\n\n` +
                 `⚠️ **DOMAIN DOWN - IMMEDIATE ACTION REQUIRED** ⚠️\n\n` +
                 `🔥 **Domain:** \`${domainUrl}\`\n` +
                 `🔥 **Status:** ❌ **DOWN** ❌\n` +
                 `🔥 **Time:** ${currentTime}\n\n` +
                 `🚨 **URGENT:** Domain is not responding!\n` +
                 `🚨 **Action:** Investigate immediately!\n` +
                 `🚨 **Priority:** HIGH\n\n` +
                 `⚠️ **This requires immediate attention!** ⚠️`;
    } else { // ok message
        message = `✅ **Domain Status Update** ✅\n\n` +
                 `🌐 **Domain:** \`${domainUrl}\`\n` +
                 `🌐 **Status:** ✅ **ONLINE** ✅\n` +
                 `🌐 **Time:** ${currentTime}\n\n` +
                 `✅ **All systems operational**\n` +
                 `✅ **No action required**\n\n` +
                 `👍 **Domain is responding normally** 👍`;
    }
    
    // Get access token
    const accessToken = await getAccessToken();
    
    const apiUrl = `https://cliq.zoho.com/api/v2/channels/${channelId}/message`;

    const payload = {
        text: message
    };

    try {
        console.log(`Sending ${messageType} message to channel ${channelId}...`);
        console.log(`Message: ${message.substring(0, 100)}...`);
        
        const response = await axios.post(
            apiUrl,
            payload,
            {
                headers: {
                    "Authorization": `Zoho-oauthtoken ${accessToken}`,
                    "Content-Type": "application/json"
                },
                timeout: 10000
            }
        );

        return response.data || { status: "success" };
            
    } catch (error) {
        console.error(`Error sending Cliq channel message: ${error.message}`);
        throw error;
    }
}

module.exports = {
    getAccessToken,
    sendCliqChannelMessage
};

