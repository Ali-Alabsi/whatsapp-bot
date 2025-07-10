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
                ('مرحبا', 'مرحباً بك! كيف يمكنني مساعدتك؟'),
                ('السلام عليكم', 'وعليكم السلام ورحمة الله وبركاته'),
                ('شكرا', 'العفو، نحن في الخدمة دائماً'),
                ('مساعدة', 'مرحباً بك! يمكنك استخدام الأوامر التالية:\n- /help: عرض المساعدة\n- /info: معلومات عن البوت\n- /contact: للتواصل مع الدعم')
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
