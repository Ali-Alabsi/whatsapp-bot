const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    // إنشاء اتصال بقاعدة البيانات SQLite
    const db = await open({
        filename: process.env.DB_FILENAME || './database.sqlite',
        driver: sqlite3.Database
    });

    try {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        
        // إنشاء الجداول
        await db.exec(`
            -- جدول المستخدمين
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT NOT NULL UNIQUE,
                name TEXT,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- جدول المحادثات
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                phone_number TEXT NOT NULL,
                last_message TEXT,
                unread_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            
            -- جدول الردود التلقائية
            CREATE TABLE IF NOT EXISTS auto_replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                reply_text TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- جدول الرسائل الواردة
            CREATE TABLE IF NOT EXISTS incoming_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                message_id TEXT NOT NULL,
                message_text TEXT,
                message_type TEXT,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            );
            
            -- جدول الرسائل الصادرة
            CREATE TABLE IF NOT EXISTS outgoing_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                message_id TEXT NOT NULL,
                message_text TEXT,
                status TEXT,
                is_auto_reply BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            );
        `);
        
        console.log('✅ تم إنشاء الجداول بنجاح');
        
        // إدراج بيانات أولية
        await db.run(`
            INSERT OR IGNORE INTO users (phone_number, name, is_admin)
            VALUES ('00967771750533', 'المشرف', 1)
        `);
        
        await db.run(`
            INSERT OR IGNORE INTO auto_replies (keyword, reply_text)
            VALUES 
                -- تحيات وترحيب
                ('مرحبا', 'مرحباً بك! كيف يمكنني مساعدتك؟'),
                ('السلام عليكم', 'وعليكم السلام ورحمة الله وبركاته'),
                ('صباح الخير', 'صباح النور والسرور! كيف يمكنني مساعدتك اليوم؟'),
                ('مساء الخير', 'مساء النور! كيف يمكنني مساعدتك؟'),
                ('مساء النور', 'مساء الخير والسرور! كيف يمكنني مساعدتك؟'),
                
                -- شكر وتقدير
                ('شكرا', 'العفو، نحن في الخدمة دائماً'),
                ('شكراً', 'لا شكر على واجب، يسعدنا خدمتك'),
                ('مشكور', 'العفو، تفضل كيف يمكنني مساعدتك؟'),
                ('يعطيك العافية', 'الله يعافيك، دائمًا في الخدمة'),
                
                -- مساعدة واستفسارات
                ('مساعدة', 'مرحباً بك! إليك الأوامر المتاحة:\n- !info: معلومات عن البوت\n- !الاسعار: عرض الأسعار\n- !الموقع: عنواننا\n- !اتصل بنا: معلومات التواصل'),
                ('الاسعار', 'أسعار خدماتنا:\n- الباقة الأساسية: 100 ريال\n- الباقة المميزة: 200 ريال\n- الباقة الذهبية: 300 ريال\nللحصول على تفاصيل أكثر، راسلنا على الرقم: 967771750533'),
                ('الموقع', 'عنواننا: صنعاء - شارع حدة\nساعات العمل: من السبت إلى الخميس، من 9 صباحاً حتى 9 مساءً\nتطبيق خرائط: https://maps.app.goo.gl/...'),
                ('اتصل بنا', 'للتواصل معنا:\n📞 الهاتف: 967771750533\n📧 البريد: info@example.com\n🌐 الموقع: www.example.com\n📍 العنوان: صنعاء - اليمن'),
                
                -- معلومات عامة
                ('من انت', 'أنا بوت واتساب مصمم لمساعدتك في الحصول على المعلومات والرد على استفساراتك. كيف يمكنني مساعدتك اليوم؟'),
                ('ما اسمك', 'أنا بوت المساعدة، يمكنك مناداتي بأي اسم تفضله! 😊'),
                ('كيف حالك', 'أنا بخير، شكراً لسؤالك! كيف يمكنني مساعدتك اليوم؟'),
                
                -- أوقات العمل
                ('متى دوامكم', 'ساعات العمل:\nالسبت - الخميس: 9 صباحاً - 9 مساءً\nالجمعة: إجازة\nللتواصل: 967771750533'),
                ('متاحين', 'نعم، نحن متاحون الآن!\nساعات العمل: من 9 صباحاً حتى 9 مساءً\nللاستفسار: 967771750533'),
                
                -- خدمات
                ('ما هي خدماتكم', 'نقدم الخدمات التالية:\n- تصميم المواقع\n- تطبيقات الجوال\n- التسويق الإلكتروني\n- إدارة وسائل التواصل\nللتفاصيل: 967771750533'),
                ('التسعير', 'نقدم عروضاً تنافسية تناسب الجميع. للاستفسار عن الأسعار يرجى التواصل معنا على: 967771750533'),
                
                -- تواصل
                ('اريد التحدث مع مدير', 'يمكنك التحدث مع مديرنا على الرقم: 967771750533\nسيكون سعيداً بمساعدتك!'),
                ('مدير', 'للتحدث مع المدير، يرجى التواصل على:\n📞 967771750533\n📧 manager@example.com'),
                
                -- إشعارات
                ('شكرا لمساعدتك', 'العفو، سعيد بمساعدتك! لا تتردد في السؤال عن أي شيء آخر.'),
                ('الى اللقاء', 'إلى اللقاء! نتمنى لك يوماً سعيداً. لا تتردد في التواصل معنا متى احتجت للمساعدة.')
        `);
        
        console.log('✅ تم إدراج البيانات الأولية بنجاح');
        
        // حفظ التغييرات
        await db.close();
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
        if (db) await db.close();
        process.exit(1);
    }
}

// تنفيذ الدالة
initializeDatabase().catch(console.error);
