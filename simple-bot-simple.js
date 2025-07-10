console.log('1. Loading dependencies...');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');

// إعدادات البوت
const BOT_CONFIG = {
    name: 'WhatsApp-Bot',
    prefix: '!',
    ownerNumber: '967771750533',
    reconnectDelay: 5000, // 5 ثواني
    maxReconnectAttempts: 10 // أقصى عدد لمحاولات إعادة الاتصال
};

// دالة للاتصال بواتساب
async function connectToWhatsApp() {
    console.log('2. Setting up authentication...');
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info'));
    
    console.log('3. Creating WhatsApp connection...');
    
    // تهيئة الاتصال
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['WhatsApp Bot', 'Chrome', '1.0.0']
    });

    // معالجة تحديثات الحالة
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n🔑 يرجى مسح رمز QR التالي للاتصال:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`\n❌ تم إغلاق الاتصال: ${lastDisconnect?.error?.message || 'سبب غير معروف'}`);
            
            if (shouldReconnect) {
                console.log(`🔄 محاولة إعادة الاتصال بعد ${BOT_CONFIG.reconnectDelay / 1000} ثوانٍ...`);
                await delay(BOT_CONFIG.reconnectDelay);
                await connectToWhatsApp();
            } else {
                console.log('❌ تم تسجيل الخروج من الجهاز. يرجى مسح بيانات المصادفة وحاول مرة أخرى.');
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log('✅ تم تسجيل الدخول بنجاح!');
            console.log(`👤 معرف البوت: ${sock.user?.id || 'غير متوفر'}`);
        }
    });

    // حفظ بيانات المصادفة عند التحديث
    sock.ev.on('creds.update', saveCreds);

    // معالجة الرسائل الواردة
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const messageText = msg.message.conversation || '';
        const sender = msg.key.remoteJid;
        
        if (messageText.startsWith(BOT_CONFIG.prefix)) {
            const command = messageText.slice(BOT_CONFIG.prefix.length).trim().split(' ')[0].toLowerCase();
            const args = messageText.split(' ').slice(1);
            
            // معالجة الأوامر
            switch (command) {
                case 'ping':
                    await sock.sendMessage(sender, { text: '🏓 Pong!' });
                    break;
                case 'info':
                    await sock.sendMessage(sender, { 
                        text: `*معلومات البوت*\n\n` +
                              `*الاسم:* ${BOT_CONFIG.name}\n` +
                              `*الوقت:* ${new Date().toLocaleString()}`
                    });
                    break;
                default:
                    // البحث عن رد تلقائي في قاعدة البيانات
                    const db = require('./db');
                    const reply = await db.getAutoReply(command);
                    if (reply) {
                        await sock.sendMessage(sender, { text: reply.reply_text });
                    } else {
                        await sock.sendMessage(sender, { 
                            text: '⚠️ الأمر غير معروف. استخدم !help لعرض الأوامر المتاحة.'
                        });
                    }
            }
        } else {
            // معالجة الرسائل العادية
            const db = require('./db');
            const reply = await db.getAutoReply(messageText.toLowerCase());
            if (reply) {
                await sock.sendMessage(sender, { text: reply.reply_text });
            }
        }
    });

    return sock;
}

// بدء البوت
console.log('Starting WhatsApp Bot...');

// معالجة الأخطاء غير المعالجة
process.on('uncaughtException', (error) => {
    console.error('❌ خطأ غير معالج:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ وعد مرفوض غير معالج:', reason);
});

// بدء تشغيل البوت
(async () => {
    let reconnectAttempts = 0;
    
    while (reconnectAttempts < BOT_CONFIG.maxReconnectAttempts) {
        try {
            await connectToWhatsApp();
            break; // الخروج من الحلقة إذا نجح الاتصال
        } catch (error) {
            reconnectAttempts++;
            console.error(`❌ فشل الاتصال (المحاولة ${reconnectAttempts}/${BOT_CONFIG.maxReconnectAttempts}):`, error.message);
            
            if (reconnectAttempts >= BOT_CONFIG.maxReconnectAttempts) {
                console.error('❌ تم تجاوز الحد الأقصى لمحاولات إعادة الاتصال. جاري الخروج...');
                process.exit(1);
            }
            
            await delay(BOT_CONFIG.reconnectDelay);
        }
    }
})();
