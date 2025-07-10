console.log('بدء التصحيح...');

// تحميل المتطلبات الأساسية
try {
    const baileys = require('@whiskeysockets/baileys');
    console.log('✅ Baileys loaded successfully');
} catch (e) {
    console.error('❌ Failed to load Baileys:', e);
}

// التحقق من ملف التكوين
try {
    const config = require('./src/config/config');
    console.log('✅ Config loaded successfully');
    console.log('Bot Name:', config.bot.name);
} catch (e) {
    console.error('❌ Failed to load config:', e);
}

// التحقق من قاعدة البيانات
try {
    const db = require('./src/services/database');
    console.log('✅ Database module loaded');
} catch (e) {
    console.error('❌ Failed to load database module:', e);
}

console.log('انتهى التصحيح. إذا لم تكن هناك أخطاء، جرب تشغيل البوت الآن.');
