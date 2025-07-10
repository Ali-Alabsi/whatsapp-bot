console.log('1. Loading dependencies...');
const { DisconnectReason, useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion, makeInMemoryStore, delay } = require('@whiskeysockets/baileys');
console.log('   - Dependencies loaded');
const qrcode = require('qrcode-terminal');
const NodeCache = require('node-cache');
const path = require('path');
const config = require('./config/config');
const { logger, baileysLogger } = require('./utils/logger');
const db = require('./services/database');
const messageHandler = require('./handlers/messageHandler');
const { scheduleMessages } = require('./services/scheduler');

// Store for chat and message data
const store = makeInMemoryStore({ });
store.readFromFile('./baileys_store_multi.json');
// Save store to file every 10 seconds
setInterval(() => {
    store.writeToFile('./baileys_store_multi.json');
}, 10_000);

// Initialize cache
const msgRetryCounterCache = new NodeCache();

// Initialize database
console.log('2. Initializing database...');
db.initialize().then(() => {
    console.log('   - Database initialized');    
}).catch(error => {
    console.error('   - Failed to initialize database:', error);
    process.exit(1);
});

async function connectToWhatsApp(retryCount = 0) {
    try {
        console.log('=== Starting Connection Attempt', retryCount + 1, '===');
        
        // Load auth state from file
        console.log('1. Loading authentication state...');
        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
        console.log('   - Auth state loaded successfully');
        
        // Fetch the latest version of WhatsApp Web
        console.log('2. Fetching latest WhatsApp Web version...');
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`   - Using WhatsApp v${version.join('.')}, is latest: ${isLatest}`);
        
        console.log('3. Creating WebSocket connection...');
        const sock = makeWASocket({
            version,
            printQRInTerminal: true,
            logger: {
                ...baileysLogger,
                debug: (args) => console.log('DEBUG:', args),
                info: (args) => console.log('INFO:', args),
                warn: (args) => console.warn('WARN:', args),
                error: (args) => console.error('ERROR:', args),
                level: 'trace'
            },
            browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
            syncFullHistory: false,
            auth: {
                creds: state.creds,
                keys: state.keys,
            },
            logger: baileysLogger,
            msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
            getMessage: async (key) => {
                // Implement message retrieval from database if needed
                return null;
            },
        });

        // Save credentials when updated
        sock.ev.on('creds.update', saveCreds);

        // Bind the store to the socket
        store.bind(sock.ev);

        // Handle connection updates
        sock.ev.on('connection.update', (update) => {
            console.log('Connection Update:', JSON.stringify(update, null, 2));
            const { connection, lastDisconnect, qr, isNewLogin } = update;

            if (qr) {
                const fs = require('fs');
                const path = require('path');
                
                // Create a simple HTML file with the QR code
                const qrHtmlPath = path.join(__dirname, '../../qr.html');
                const qrPageUrl = `file://${qrHtmlPath}?qr=${encodeURIComponent(qr)}`;
                
                console.log('\n📱 QR Code Generated!');
                console.log('Please open the following file in your web browser:');
                console.log(qrHtmlPath);
                console.log('\nOr click this link to open it directly:');
                console.log(qrPageUrl);
                
                // Open the QR code in the default browser
                try {
                    const open = require('open');
                    open(qrPageUrl);
                } catch (err) {
                    console.error('Could not open browser automatically. Please open the file manually.');
                }
            }

            if (connection === 'close') {
                // Reconnect if not logged out
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info(`Connection closed due to ${lastDisconnect?.error?.message || 'unknown error'}`);
                
                if (shouldReconnect) {
                    logger.info('Reconnecting...');
                    connectToWhatsApp();
                }
            } else if (connection === 'open') {
                logger.info('Connected to WhatsApp Web');
                
                // Schedule messages
                scheduleMessages(sock).catch(error => {
                    logger.error('Failed to schedule messages:', error);
                });
            }
        });

        // Handle incoming messages
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const message = m.messages[0];
                if (message) {
                    await messageHandler.handleMessage(sock, message);
                }
            } catch (error) {
                logger.error('Error handling message:', error);
            }
        });

        // Handle message status updates
        sock.ev.on('messages.update', (updates) => {
            updates.forEach(update => {
                if (update.status === 'ERROR') {
                    logger.error('Failed to send message:', update);
                }
            });
        });

        // Handle message reactions
        sock.ev.on('message-reaction.update', (reaction) => {
            logger.info('Message reaction:', reaction);
        });

        return sock;
    } catch (error) {
        logger.error('Error connecting to WhatsApp:', error);
        // Wait 5 seconds before attempting to reconnect
        await delay(5000);
        return connectToWhatsApp();
    }
}

// Handle process termination
process.on('SIGINT', () => {
    logger.info('Shutting down...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logger.error('Unhandled Rejection at:', { promise, reason });
    process.exit(1);
});

// Start the application
(async () => {
    try {
        console.log('🚀 Starting WhatsApp Bot...');
        logger.info('🚀 Starting WhatsApp Bot...');
        
        // Log environment variables for debugging
        console.log('\n🌍 Environment:');
        console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
        console.log('- BOT_NAME:', process.env.BOT_NAME || 'Not set');
        console.log('- Node.js Version:', process.version);
        
        // Log configuration
        console.log('\n⚙️ Configuration:');
        console.log('- Session Path:', 'baileys_auth_info/');
        console.log('- Prefix:', config.bot.prefix);
        console.log('- Log Level:', config.logging?.level || 'info');
        
        // Log memory usage
        const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
        const memoryData = process.memoryUsage();
        console.log('\n💾 Memory Usage:');
        console.log('- RSS:', formatMemoryUsage(memoryData.rss));
        console.log('- Heap Total:', formatMemoryUsage(memoryData.heapTotal));
        console.log('- Heap Used:', formatMemoryUsage(memoryData.heapUsed));
        
        // Initialize database with error handling
        try {
            console.log('\n💾 Initializing database...');
            await db.initialize();
            console.log('✅ Database initialized successfully');
        } catch (dbError) {
            console.error('❌ Failed to initialize database:', dbError);
            logger.error('Failed to initialize database:', dbError);
            process.exit(1);
        }
        
        // Start the bot
        console.log('3. Starting WhatsApp connection...');
        connectToWhatsApp().catch(error => {
            console.error('   - Failed to start WhatsApp connection:', error);
            process.exit(1);
        });
        
        // Keep the process alive
        const keepAlive = setInterval(() => {
            const memory = process.memoryUsage();
            logger.info(`Bot is still running - Memory: ${formatMemoryUsage(memory.heapUsed)}`);
        }, 1000 * 60 * 30); // Log every 30 minutes
        
        // Handle process termination
        process.on('SIGINT', async () => {
            console.log('\n🛑 Received shutdown signal. Cleaning up...');
            clearInterval(keepAlive);
            
            try {
                // Close any open connections
                const sock = await connectToWhatsApp();
                if (sock) {
                    await sock.end(undefined);
                }
                process.exit(0);
            } catch (error) {
                console.error('Error during cleanup:', error);
                process.exit(1);
            }
                const memory = process.memoryUsage();
                logger.info(`Bot is still running - Memory: ${formatMemoryUsage(memory.heapUsed)}`);
            }, 1000 * 60 * 30); // Log every 30 minutes
            
            // Handle process termination
            process.on('SIGINT', async () => {
                console.log('\n🛑 Received shutdown signal. Cleaning up...');
                clearInterval(keepAlive);
                
                try {
                    // Close any open connections
                    if (sock) {
                        await sock.end(undefined);
                    }
                    
                    // Close database connections
                    await db.close();
                    
                    console.log('✅ Cleanup complete. Goodbye! 👋');
                    process.exit(0);
                } catch (error) {
                    console.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
            
            logger.info('🚀 WhatsApp Bot started successfully');
            console.log('\n🎉 WhatsApp Bot started successfully!');
            console.log('Press Ctrl+C to stop the bot');
            
        } catch (whatsappError) {
            console.error('❌ Failed to connect to WhatsApp:', whatsappError);
            logger.error('Failed to connect to WhatsApp:', whatsappError);
            
            // Try to reconnect after a delay
            console.log('\n🔄 Attempting to reconnect in 10 seconds...');
            setTimeout(() => {
                connectToWhatsApp().catch(error => {
                    console.error('❌ Reconnection failed:', error);
                    process.exit(1);
                });
            }, 10000);
        }
    } catch (error) {
        console.error('❌ Failed to start WhatsApp Bot:', error);
        logger.error('Failed to start WhatsApp Bot:', error);
        process.exit(1);
    }
})();
