const { getContentType, proto } = require('@whiskeysockets/baileys');
const database = require('../services/database');
const { logger } = require('../utils/logger');
const config = require('../config/config');
const { processCommand } = require('./commandHandler');
const messageUtils = require('../utils/messageUtils');

/**
 * Handles incoming WhatsApp messages
 * @param {object} sock - The WhatsApp socket connection
 * @param {object} message - The incoming message object
 * @returns {Promise<void>}
 */
async function handleMessage(sock, message) {
    if (!message || !message.key || !message.key.remoteJid) {
        logger.warn('Received invalid message:', JSON.stringify(message, null, 2));
        return;
    }

    const messageId = message.key.id;
    const from = message.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const pushName = message.pushName || message.key.participant || 'Unknown';
    const senderNumber = from.split('@')[0];
    
    try {
        logger.info(`📩 New message from ${pushName} (${senderNumber})${isGroup ? ' in group' : ''}`);
        
        // Get message content
        let content = '';
        const messageType = getContentType(message.message || {});
        
        // Extract text content based on message type
        if (messageType === 'conversation') {
            content = message.message.conversation || '';
        } else if (messageType === 'extendedTextMessage') {
            content = message.message.extendedTextMessage?.text || '';
        } else if (messageType === 'imageMessage') {
            content = message.message.imageMessage?.caption || '';
        } else if (messageType === 'videoMessage') {
            content = message.message.videoMessage?.caption || '';
        } else if (messageType === 'documentMessage') {
            content = message.message.documentMessage?.fileName || '';
        }
        
        // Check if message is a command
        const isCommand = content.startsWith(config.bot.prefix);
        
        // Log the message to database
        try {
            await database.logMessage({
                messageId: messageId,
                from: from,
                to: message.key.participant || message.key.remoteJid,
                content: content.substring(0, 1000), // Limit content length
                isCommand: isCommand,
                messageType: messageType
            });
            logger.debug('Message logged to database');
        } catch (logError) {
            logger.error('Failed to log message to database:', logError);
            // Continue processing even if logging fails
        }
        
        // Get or create user
        let user;
        try {
            user = await database.getUser(senderNumber);
            if (!user) {
                logger.info(`Creating new user: ${pushName} (${senderNumber})`);
                user = await database.createUser(senderNumber, pushName);
            }
        } catch (userError) {
            logger.error('Error getting/creating user:', userError);
            // Continue with limited functionality
            user = { id: 0, phoneNumber: senderNumber, name: pushName, language: 'ar' };
        }
        
        // Handle commands
        if (isCommand) {
            logger.info(`Processing command: ${content.split(' ')[0]}`);
            return await processCommand(sock, message, content, user);
        }
        
        // Handle auto-replies for non-command messages
        logger.debug('Processing auto-reply for message');
        await handleAutoReply(sock, message, content, user);
        
    } catch (error) {
        logger.error('❌ Error in handleMessage:', error);
        
        // Try to send an error message to the user
        try {
            await messageUtils.sendTextMessage(
                sock,
                from,
                '❌ حدث خطأ أثناء معالجة رسالتك. يرجى المحاولة مرة أخرى لاحقًا.'
            );
        } catch (sendError) {
            logger.error('Failed to send error message to user:', sendError);
        }
    }
}

/**
 * Handles auto-replies to messages based on keywords
 * @param {object} sock - The WhatsApp socket connection
 * @param {object} message - The incoming message object
 * @param {string} content - The message content
 * @param {object} user - The user who sent the message
 * @returns {Promise<void>}
 */
async function handleAutoReply(sock, message, content, user) {
    try {
        // Get auto-replies from database
        let autoReplies = [];
        try {
            autoReplies = await database.getAutoReplies();
            logger.debug(`Found ${autoReplies.length} auto-reply rules`);
        } catch (dbError) {
            logger.error('Error fetching auto-replies:', dbError);
            return;
        }
        
        // Check each auto-reply rule
        for (const rule of autoReplies) {
            if (!rule.is_active || !rule.keyword || !rule.response) {
                continue;
            }
            
            try {
                // Simple contains match (could be enhanced with regex)
                if (content.toLowerCase().includes(rule.keyword.toLowerCase())) {
                    logger.info(`Matched auto-reply rule: ${rule.keyword}`);
                    
                    // Send the response
                    await messageUtils.sendTextMessage(
                        sock,
                        message.key.remoteJid,
                        rule.response,
                        message
                    );
                    
                    // Only match one rule per message
                    break;
                }
            } catch (ruleError) {
                logger.error(`Error processing auto-reply rule ${rule.id}:`, ruleError);
            }
        }
        
        logger.debug('Finished processing auto-replies');
    } catch (error) {
        logger.error('❌ Error in handleAutoReply:', error);
        throw error;
    }
};

// Export all functions as a single object to avoid circular dependencies
const messageHandler = {
    handleMessage,
    handleAutoReply,
    // Re-export message utilities for backward compatibility
    sendTextMessage: messageUtils.sendTextMessage,
    sendImageMessage: messageUtils.sendImageMessage,
    sendVideoMessage: messageUtils.sendVideoMessage,
    sendDocumentMessage: messageUtils.sendDocumentMessage,
    sendButtonMessage: messageUtils.sendButtonMessage,
    sendListMessage: messageUtils.sendListMessage
};

module.exports = messageHandler;
