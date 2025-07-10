const cron = require('node-cron');
const { logger } = require('../utils/logger');
const { sendTextMessage } = require('../handlers/messageHandler');
const database = require('./database');

// Store active jobs
const activeJobs = new Map();

// Initialize scheduled messages
async function scheduleMessages(sock, defaultMessages = []) {
    try {
        logger.info(' Initializing message scheduler...');
        
        // Clear existing jobs
        activeJobs.forEach(job => job.stop());
        activeJobs.clear();
        
        // Get scheduled messages from database
        let dbMessages = [];
        try {
            logger.info('Fetching scheduled messages from database...');
            dbMessages = await database.getScheduledMessages();
            logger.info(`Found ${dbMessages.length} scheduled messages in database`);
        } catch (error) {
            logger.error(' Error fetching scheduled messages:', error);
            throw error;
        }
        
        // Combine default and database messages
        const allMessages = [...defaultMessages, ...dbMessages];
        
        if (allMessages.length === 0) {
            logger.info('No scheduled messages to process');
            return;
        }
        
        logger.info(`Processing ${allMessages.length} scheduled messages...`);
        
        // Schedule each message
        for (const [index, message] of allMessages.entries()) {
            const messageId = message.id || `default_${index}`;
            
            if (!message.cron_expression || !message.message) {
                logger.warn(`Skipping invalid message at index ${index}`);
                continue;
            }
            
            if (message.is_active === false) {
                logger.info(`Skipping inactive message ${messageId}`);
                continue;
            }
            
            try {
                logger.info(`Scheduling message ${messageId} with cron: ${message.cron_expression}`);
                
                const job = cron.schedule(message.cron_expression, async () => {
                    const startTime = Date.now();
                    logger.info(`Executing scheduled message ${messageId}`);
                    
                    try {
                        logger.info(`Scheduled message executed: ${message.message.substring(0, 50)}${message.message.length > 50 ? '...' : ''}`);
                        
                        const duration = (Date.now() - startTime) / 1000;
                        logger.info(` Completed scheduled message ${messageId} in ${duration.toFixed(2)}s`);
                    } catch (error) {
                        logger.error(` Error in scheduled job ${messageId}:`, error);
                    }
                }, {
                    scheduled: true,
                    timezone: 'Asia/Riyadh',
                    name: `message_${messageId}`
                });
                
                activeJobs.set(messageId, job);
                logger.info(` Scheduled message ${messageId}`);
            } catch (error) {
                logger.error(` Failed to schedule message ${messageId}:`, error);
            }
        }
        
        logger.info(` Successfully scheduled ${activeJobs.size} out of ${allMessages.length} messages`);
    } catch (error) {
        logger.error(' Critical error in scheduleMessages:', error);
        throw error;
    }
}

// Add a new scheduled message
function addScheduledMessage(cronExpression, message) {
    try {
        const jobId = `custom_${Date.now()}`;
        const job = cron.schedule(cronExpression, () => {
            // Implementation for sending the message
            logger.info(`Sending custom scheduled message: ${message}`);
        }, {
            scheduled: true,
            timezone: 'Asia/Riyadh'
        });
        
        activeJobs.set(jobId, job);
        return jobId;
    } catch (error) {
        logger.error('Error adding scheduled message:', error);
        return null;
    }
}

// Remove a scheduled message
function removeScheduledMessage(jobId) {
    try {
        const job = activeJobs.get(jobId);
        if (job) {
            job.stop();
            activeJobs.delete(jobId);
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Error removing scheduled message:', error);
        return false;
    }
}

// Get all active scheduled messages
function getScheduledMessages() {
    const messages = [];
    activeJobs.forEach((job, jobId) => {
        messages.push({
            id: jobId,
            // Add more details about the job if needed
        });
    });
    return messages;
}

module.exports = {
    scheduleMessages,
    addScheduledMessage,
    removeScheduledMessage,
    getScheduledMessages
};
