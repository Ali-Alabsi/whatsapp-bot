const { getQuotedMessage } = require('@whiskeysockets/baileys');
const messageUtils = require('../utils/messageUtils');
const database = require('../services/database');
const { logger } = require('../utils/logger');
const config = require('../config/config');

// Destructure message utilities
const { 
    sendTextMessage, 
    sendImageFromUrl, 
    sendAudioMessage,
    sendButtonMessage 
} = messageUtils;

// Available commands and their handlers
const commands = {
    // Help command
    help: {
        description: 'عرض قائمة الأوامر المتاحة',
        handler: handleHelpCommand
    },
    
    // Status command
    status: {
        description: 'عرض حالة البوت',
        handler: handleStatusCommand
    },
    
    // Quote command
    quote: {
        description: 'الحصول على اقتباس تحفيزي',
        handler: handleQuoteCommand
    },
    
    // Joke command
    joke: {
        description: 'الحصول على نكتة عشوائية',
        handler: handleJokeCommand
    },
    
    // Menu command
    menu: {
        description: 'عرض القائمة الرئيسية',
        handler: handleMenuCommand
    },
    
    // Admin: Broadcast command
    broadcast: {
        description: 'إرسال رسالة لجميع المشتركين (للمشرفين فقط)',
        handler: handleBroadcastCommand,
        adminOnly: true
    },
    
    // Admin: Debug command
    debug: {
        description: 'معلومات تصحيح (للمشرفين فقط)',
        handler: handleDebugCommand,
        adminOnly: true
    }
};

// Process incoming command
async function processCommand(sock, message, content, user) {
    try {
        const args = content.trim().split(/\s+/);
        const commandName = args[0].substring(1).toLowerCase(); // Remove the prefix
        const command = commands[commandName];
        
        if (!command) {
            return await sendTextMessage(
                sock, 
                message.key.remoteJid, 
                '⚠️ الأمر غير معروف. اكتب /help لعرض الأوامر المتاحة.'
            );
        }
        
        // Check admin permissions
        if (command.adminOnly && !isAdmin(message.key.remoteJid)) {
            return await sendTextMessage(
                sock, 
                message.key.remoteJid, 
                '⛔ ليس لديك صلاحية تنفيذ هذا الأمر.'
            );
        }
        
        // Execute the command
        await command.handler(sock, message, args.slice(1), user);
        
    } catch (error) {
        logger.error('Error processing command:', error);
        await sendTextMessage(
            sock, 
            message.key.remoteJid, 
            '❌ حدث خطأ أثناء معالجة الأمر. يرجى المحاولة مرة أخرى لاحقاً.'
        );
    }
}

// Check if user is admin
function isAdmin(jid) {
    // In a real app, you might want to check against a database
    return jid === config.bot.owner;
}

// Command handlers
async function handleHelpCommand(sock, message) {
    let helpText = '📋 *قائمة الأوامر المتاحة*\n\n';
    
    // Add public commands
    helpText += '*الأوامر العامة:*\n';
    for (const [cmd, info] of Object.entries(commands)) {
        if (!info.adminOnly) {
            helpText += `*/${cmd}* - ${info.description}\n`;
        }
    }
    
    // Add admin commands if user is admin
    if (isAdmin(message.key.remoteJid)) {
        helpText += '\n*أوامر المشرفين:*\n';
        for (const [cmd, info] of Object.entries(commands)) {
            if (info.adminOnly) {
                helpText += `*/${cmd}* - ${info.description}\n`;
            }
        }
    }
    
    helpText += '\n🤖 *' + config.bot.name + '*';
    
    await sendTextMessage(sock, message.key.remoteJid, helpText);
}

async function handleStatusCommand(sock, message) {
    const statusText = `🟢 *حالة البوت*\n\n` +
        `*الاسم:* ${config.bot.name}\n` +
        `*الحالة:* نشط\n` +
        `*الإصدار:* 1.0.0\n` +
        `*الوقت:* ${new Date().toLocaleString('ar-SA')}\n\n` +
        '🤖 البوت يعمل بشكل طبيعي';
    
    await sendTextMessage(sock, message.key.remoteJid, statusText);
}

async function handleQuoteCommand(sock, message) {
    // In a real app, you might want to fetch quotes from an API or database
    const quotes = [
        'النجاح هو مجموع الجهود الصغيرة المتكررة يومياً. - روبرت كولير',
        'لا يمكنك عبور البحر بمجرد الوقوف والتحديق في الماء. - روبندرونات طاغور',
        'الطريق إلى القمة يبدأ من الأسفل. - مثل صيني',
        'لا تؤجل عمل اليوم إلى الغد. - مثل عربي',
        'التفاؤل هو الإيمان الذي يؤدي إلى الإنجاز. - هيلين كيلر'
    ];
    
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    await sendTextMessage(sock, message.key.remoteJid, `💭 *اقتباس اليوم*\n\n${randomQuote}`);
}

async function handleJokeCommand(sock, message) {
    // In a real app, you might want to fetch jokes from an API
    const jokes = [
        'لماذا لا يلعب السمك كرة السلة؟ لأنه يخاف من الشبكة!',
        'ما هو الحيوان الذي يحب السفر؟ الزرافة... لأنها تحمل حقائبها على رقبتها!',
        'لماذا لا يستطيع الرياضي النوم؟ لأنه يخشى أن يحلم بالتمارين الرياضية!',
        'ما هو أذكى حيوان؟ الأخطبوط... لأنه يملك 8 أذرع للتفكير!',
        'لماذا يحب الكمبيوتر المدرسة؟ لأنه يمتلك ذاكرة جيدة!'
    ];
    
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    await sendTextMessage(sock, message.key.remoteJid, `😂 *نكتة اليوم*\n\n${randomJoke}`);
}

async function handleMenuCommand(sock, message) {
    const buttons = [
        { buttonId: '/help', buttonText: { displayText: 'المساعدة' }, type: 1 },
        { buttonId: '/status', buttonText: { displayText: 'حالة البوت' }, type: 1 },
        { buttonId: '/quote', buttonText: { displayText: 'اقتباس' }, type: 1 },
        { buttonId: '/joke', buttonText: { displayText: 'نكتة' }, type: 1 }
    ];
    
    const menuText = '🤖 *مرحباً بك في البوت الذكي*\n\n' +
        'يمكنك اختيار أحد الأزرار أدناه للبدء:';
    
    await sendButtonMessage(sock, message.key.remoteJid, menuText, buttons);
}

async function handleBroadcastCommand(sock, message, args) {
    if (!isAdmin(message.key.remoteJid)) {
        return await sendTextMessage(
            sock, 
            message.key.remoteJid, 
            '⛔ ليس لديك صلاحية تنفيذ هذا الأمر.'
        );
    }
    
    const broadcastMessage = args.join(' ');
    if (!broadcastMessage) {
        return await sendTextMessage(
            sock, 
            message.key.remoteJid, 
            '⚠️ يرجى كتابة الرسالة التي تريد إرسالها. مثال: /broadcast مرحباً بالجميع!'
        );
    }
    
    const autoReplies = await database.getAutoReplies();
    // for (const user of users) {
    //     await sendTextMessage(sock, user.phone_number, broadcastMessage);
    //     await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    // }
    
    await sendTextMessage(
        sock, 
        message.key.remoteJid, 
        `✅ تم إرسال الرسالة بنجاح إلى ${0} مستخدم.`
    );
}

async function handleDebugCommand(sock, message) {
    if (!isAdmin(message.key.remoteJid)) {
        return await sendTextMessage(
            sock, 
            message.key.remoteJid, 
            '⛔ ليس لديك صلاحية تنفيذ هذا الأمر.'
        );
    }
    
    const debugInfo = `🔍 *معلومات التصحيح*\n\n` +
        `*الوقت:* ${new Date().toISOString()}\n` +
        `*Node.js:* ${process.version}\n` +
        `*الذاكرة المستخدمة:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
        `*نظام التشغيل:* ${process.platform} ${process.arch}\n` +
        `*معرف الرسالة:* ${message.key.id}\n` +
        `*المرسل:* ${message.key.remoteJid}`;
    
    await sendTextMessage(sock, message.key.remoteJid, debugInfo);
}

module.exports = {
    processCommand
};
