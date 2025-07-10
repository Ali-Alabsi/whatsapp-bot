require('dotenv').config();

module.exports = {
    // Session configuration
    session: {
        savePath: './auth_info_baileys',
        fileName: 'auth_info_baileys',
        browser: ['Chrome (Windows)', 'chrome', '1.0.0']
    },
    
    // WhatsApp connection settings
    waSocket: {
        version: [2, 2413, 1],
        browser: ['Ubuntu', 'Chrome', '20.1.15063'],
        printQRInTerminal: true,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
    },
    
    // Bot configuration
    bot: {
        name: 'WhatsApp Bot',
        prefix: '/',
        owner: '1234567890@s.whatsapp.net', // Replace with your WhatsApp number
    },
    
    // Database configuration
    database: {
        client: 'sqlite3',
        connection: {
            filename: './database.sqlite'
        },
        useNullAsDefault: true
    },
    
    // Logging configuration
    logging: {
        level: 'info',
        file: './logs/app.log',
        errorFile: './logs/error.log'
    },
    
    // API Keys (if any)
    apis: {
        // Add your API keys here
        openai: process.env.OPENAI_API_KEY || ''
    },
    
    // Scheduled messages
    scheduledMessages: [
        {
            time: '0 8 * * *', // Every day at 8:00 AM
            message: 'صباح الخير! 🌞'
        },
        {
            time: '0 18 * * 5', // Every Friday at 6:00 PM
            message: 'لا تنسى قراءة الأذكار اليومية 🙏'
        }
    ],
    
    // Auto-reply configuration
    autoReplies: [
        {
            keywords: ['مرحبا', 'السلام عليكم', 'اهلا'],
            response: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟ 😊'
        },
        {
            keywords: ['شكرا', 'مشكور', 'يعطيك العافية'],
            response: 'العفو! دائمًا في الخدمة 🙏'
        }
    ]
};
