const db = require('./db');
const fs = require('fs');
const path = require('path');

// دالة للحصول على الرد التلقائي
async function getAutoReply(text) {
    try {
        // البحث عن تطابق كامل للكلمة المفتاحية
        const exactMatch = await db.getAutoReply(text.toLowerCase().trim());
        if (exactMatch) {
            return exactMatch.reply_text;
        }

        // إذا لم يتم العثور على تطابق كامل، ابحث عن تطابق جزئي
        const [partialMatches] = await db.query(
            'SELECT * FROM auto_replies WHERE ? LIKE CONCAT("%", keyword, "%") AND is_active = TRUE',
            [text.toLowerCase().trim()]
        );

        return partialMatches.length > 0 
            ? partialMatches[0].reply_text 
            : 'عذراً، لم أفهم رسالتك. اكتب "مساعدة" لرؤية الأوامر المتاحة.';
    } catch (error) {
        console.error('Error getting auto reply:', error);
        return 'عذراً، حدث خطأ في معالجة طلبك.';
    }
}

// دالة معالجة الرسائل الواردة
async function handleIncomingMessage(sock, message) {
    try {
        const messageType = Object.keys(message.message)[0];
        const messageContent = message.message[messageType];
        const sender = message.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');
        const timestamp = message.messageTimestamp ? new Date(message.messageTimestamp * 1000) : new Date();
        
        // تجاهل الرسائل المرسلة من البوت نفسه
        if (message.key.fromMe) return;

        let text = '';
        let messageData = {
            messageId: message.key.id,
            from: message.key.remoteJid,
            to: message.key.participant || message.key.remoteJid,
            messageText: '',
            messageType: messageType,
            timestamp: timestamp,
            status: 'received'
        };
        
        // استخراج النص من الرسالة
        if (messageType === 'conversation') {
            text = messageContent.text || '';
            messageData.messageText = text;
        } else if (messageType === 'extendedTextMessage') {
            text = messageContent.text || '';
            messageData.messageText = text;
            messageData.mentionedJid = messageContent.contextInfo?.mentionedJid || [];
        } else if (messageType === 'imageMessage') {
            text = '📷 صورة';
            messageData.messageText = messageContent.caption || '';
            messageData.mediaUrl = messageContent.url || '';
            messageData.mediaType = 'image';
        } else if (messageType === 'videoMessage') {
            text = '🎥 فيديو';
            messageData.messageText = messageContent.caption || '';
            messageData.mediaUrl = messageContent.url || '';
            messageData.mediaType = 'video';
        } else if (messageType === 'audioMessage') {
            text = '🔊 رسالة صوتية';
            messageData.mediaType = 'audio';
        } else if (messageType === 'documentMessage') {
            text = '📄 ملف: ' + (messageContent.fileName || 'مستند');
            messageData.messageText = messageContent.fileName || '';
            messageData.mediaType = 'document';
        } else {
            text = `[${messageType}]`;
            messageData.messageText = JSON.stringify(messageContent);
        }

        // استخراج رقم الهاتف من المعرف
        const phoneNumber = sender.split('@')[0];
        
        // حفظ المستخدم في قاعدة البيانات
        const userId = await db.createOrUpdateUser(phoneNumber, message.pushName || 'مستخدم');
        
        // الحصول على المحادثة أو إنشاؤها
        const conversation = await db.getOrCreateConversation(userId, phoneNumber);
        
        // حفظ الرسالة الواردة في قاعدة البيانات
        await db.saveIncomingMessage(conversation.id, {
            ...messageData,
            messageText: messageData.messageText || text
        });
        
        // الحصول على رد من قاعدة البيانات
        try {
            const reply = await getAutoReply(text);
            
            // إرسال الرد
            const sentMsg = await sock.sendMessage(sender, { 
                text: reply,
                mentions: [sender]
            });
            
            // حفظ الرد في قاعدة البيانات
            await db.saveOutgoingMessage(conversation.id, {
                messageId: sentMsg.key.id,
                to: sender,
                messageText: reply,
                status: 'sent',
                timestamp: new Date(),
                isAutoReply: true
            });
            
        } catch (error) {
            console.error('Error sending reply:', error);
            
            // إرسال رسالة خطأ افتراضية
            const errorMessage = 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.';
            await sock.sendMessage(sender, { text: errorMessage });
            
            // حفظ رسالة الخطأ في قاعدة البيانات
            await db.saveOutgoingMessage(conversation.id, {
                messageId: `error-${Date.now()}`,
                to: sender,
                messageText: errorMessage,
                status: 'error',
                timestamp: new Date()
            });
        }
        
    } catch (error) {
        console.error('Error handling message:', error);
        
        // تسجيل الخطأ في السجل
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: error.message,
            message: message
        };
        
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, 'message-errors.log');
        fs.appendFileSync(logFile, JSON.stringify(logEntry, null, 2) + '\n');
    }
}

// دالة لحفظ الرسائل في قاعدة البيانات
async function saveMessageToDatabase(sender, received, reply, isGroup) {
    try {
        // استخراج رقم الهاتف من المعرف
        const phoneNumber = sender.split('@')[0];
        
        // الحصول على المستخدم أو إنشاؤه
        let user = await db.getUserByPhone(phoneNumber);
        if (!user) {
            const userId = await db.createUser(phoneNumber, message.pushName || 'مستخدم');
            user = { id: userId, phone_number: phoneNumber };
        }
        
        // الحصول على المحادثة أو إنشاؤها
        const conversation = await db.getOrCreateConversation(user.id, phoneNumber);
        
        // حفظ الرسالة الواردة
        await db.saveMessage(conversation.id, {
            messageId: message.key.id,
            senderNumber: phoneNumber,
            recipientNumber: 'bot',
            messageText: received,
            messageType: 'received',
            isFromMe: false,
            status: 'delivered'
        });
        
        // حفظ الرد
        await db.saveMessage(conversation.id, {
            messageId: `reply-${Date.now()}`,
            senderNumber: 'bot',
            recipientNumber: phoneNumber,
            messageText: reply,
            messageType: 'sent',
            isFromMe: true,
            status: 'sent'
        });
        
    } catch (error) {
        console.error('Error saving message to database:', error);
        
        // في حالة حدوث خطأ، قم بتسجيله في ملف السجل
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: error.message,
            sender: sender,
            received: received,
            reply: reply
        };
        
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, 'db-errors.log');
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }
}

module.exports = { handleIncomingMessage };
