const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
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
                is_admin BOOLEAN DEFAULT 0,
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
            
            -- جدول المحادثات
            CREATE TABLE IF NOT EXISTS conversations (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT,
                contact_number VARCHAR(20) NOT NULL,
                last_message TEXT,
                message_count INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            
            -- جدول الرسائل
            CREATE TABLE IF NOT EXISTS messages (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                conversation_id BIGINT,
                message_id VARCHAR(100) NOT NULL,
                sender_number VARCHAR(20) NOT NULL,
                recipient_number VARCHAR(20) NOT NULL,
                message_text TEXT,
                message_type VARCHAR(50) NOT NULL,
                is_from_me BOOLEAN DEFAULT FALSE,
                status VARCHAR(20) DEFAULT 'sent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                INDEX idx_message_id (message_id),
                INDEX idx_sender (sender_number),
                INDEX idx_recipient (recipient_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            
            -- جدول الردود التلقائية
            CREATE TABLE IF NOT EXISTS auto_replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                keyword VARCHAR(100) NOT NULL,
                reply_text TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_keyword (keyword)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            
            -- إدراج ردود افتراضية
            INSERT IGNORE INTO auto_replies (keyword, reply_text) VALUES 
                ('مرحبا', 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟'),
                ('السلام عليكم', 'وعليكم السلام ورحمة الله وبركاته'),
                ('كيف حالك', 'أنا بخير، شكراً لسؤالك! كيف يمكنني مساعدتك؟'),
                ('شكرا', 'العفو! لا تتردد في السؤال عن أي شيء آخر.'),
                ('مساعدة', 'يمكنك تجربة هذه الأوامر: \n- مرحبا\n- كيف حالك\n- الوقت\n- التاريخ');
        `);
        
        // تأكيد التغييرات
        await connection.commit();
        console.log('✅ تم إنشاء الجداول بنجاح');
        
    } catch (error) {
        // التراجع عن التغييرات في حالة حدوث خطأ
        await connection.rollback();
        console.error('❌ خطأ في إنشاء الجداول:', error);
        
    } finally {
        // إغلاق الاتصال
        await connection.end();
        console.log('✅ تم إغلاق الاتصال بقاعدة البيانات');
    }
}

// تنفيذ الدالة
initializeDatabase().catch(console.error);
