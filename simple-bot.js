console.log('1. Loading dependencies...');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

// إعدادات البريد الإلكتروني
const EMAIL_CONFIG = {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD
    }
};

// إعدادات البوت
const BOT_CONFIG = {
    name: process.env.BOT_NAME || 'WhatsApp-Bot',
    prefix: process.env.BOT_PREFIX || '!',
    ownerNumber: process.env.OWNER_NUMBER || '967771750533',
    qrTimeout: 120000, // 2 دقيقة
    reconnectDelay: 5000, // 5 ثواني
    maxReconnectAttempts: 10 // أقصى عدد لمحاولات إعادة الاتصال
};

// دالة لإرسال رمز QR عبر البريد الإلكتروني
async function sendQRCodeEmail(qrCode, toEmail) {
    if (!process.env.EMAIL_FROM || !process.env.EMAIL_PASSWORD) {
        console.warn('⚠️  بيانات البريد الإلكتروني غير متوفرة، سيتم عرض رمز QR في الطرفية فقط');
        return;
    }

    const transporter = nodemailer.createTransport(EMAIL_CONFIG);
    const mailOptions = {
        from: `"${BOT_CONFIG.name}" <${process.env.EMAIL_FROM}>`,
        to: toEmail,
        subject: 'رمز QR لتسجيل الدخول إلى واتساب بوت',
        text: 'يرجى مسح رمز QR التالي لتسجيل الدخول إلى واتساب بوت:',
        html: `
            <div dir="rtl">
                <h2>مرحباً بك في ${BOT_CONFIG.name}</h2>
                <p>يرجى مسح رمز QR التالي لتسجيل الدخول إلى حسابك:</p>
                <pre>${qrCode}</pre>
                <p>هذا الرمز صالح لمدة دقيقتين فقط.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ تم إرسال رمز QR إلى البريد الإلكتروني');
        return info;
    } catch (error) {
        console.error('❌ فشل إرسال البريد الإلكتروني:', error.message);
        return null;
    }
}

// دالة للاتصال بواتساب
async function connectToWhatsApp() {
    console.log('2. Setting up authentication...');
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info'));
    
    console.log('3. Creating WhatsApp connection...');
    
    // تهيئة الاتصال
    // إعداد السجل البسيط
    const logger = {
        level: 'warn',
        trace: (message, ...args) => console.trace(message, ...args),
        debug: (message, ...args) => console.debug(message, ...args),
        info: (message, ...args) => console.info(message, ...args),
        warn: (message, ...args) => console.warn(message, ...args),
        error: (message, ...args) => console.error(message, ...args),
        fatal: (message, ...args) => console.error('FATAL:', message, ...args)
    };

    const sock = makeWASocket({
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        logger: logger,
        printQRInTerminal: true,
        connectTimeoutMs: 20000, // زيادة مهلة الاتصال
        keepAliveIntervalMs: 15000,
        defaultQueryTimeoutMs: 60000,
        version: [2, 2413, 1], // أحدث إصدار معروف
        syncFullHistory: false,
        markOnlineOnConnect: false,
        getMessage: async (key) => ({}),
        shouldIgnoreJid: (jid) => false,
        shouldSyncHistoryMessage: () => false
    });

    // معالجة تحديثات الحالة
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n🔑 يرجى مسح رمز QR التالي للاتصال:');
            qrcode.generate(qr, { small: true });
            
            // إرسال رمز QR عبر البريد الإلكتروني إذا كان متوفراً
            if (process.env.EMAIL_TO) {
                await sendQRCodeEmail(qr, process.env.EMAIL_TO);
            }
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
                              `*الوقت:* ${new Date().toLocaleString()}\n` +
                              `*الإصدار:* 1.0.0`
                    });
                    break;
                default:
                    await sock.sendMessage(sender, { 
                        text: '⚠️ الأمر غير معروف. استخدم !help لعرض الأوامر المتاحة.'
                    });
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

process.on('unhandledRejection', (reason, promise) => {
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
