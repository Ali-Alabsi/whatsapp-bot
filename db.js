const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

class Database {
    constructor() {
        this.dbPath = path.resolve(process.env.DB_FILENAME || './database.sqlite');
        this.db = null;
        this.initializeDatabase();
    }

    async getDb() {
        if (!this.db) {
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });
        }
        return this.db;
    }

    async initializeDatabase() {
        try {
            // إنشاء الجداول إذا لم تكن موجودة
            await this.createTables();
            console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
            process.exit(1);
        }
    }

    async createTables() {
        const db = await this.getDb();
        
        // جدول المستخدمين
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT NOT NULL UNIQUE,
                name TEXT,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // جدول المحادثات
        await db.exec(`
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
        `);

        // جدول الردود التلقائية
        await db.exec(`
            CREATE TABLE IF NOT EXISTS auto_replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                reply_text TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // جدول الرسائل الواردة
        await db.exec(`
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
        `);

        // جدول الرسائل الصادرة
        await db.exec(`
            CREATE TABLE IF NOT EXISTS outgoing_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                message_id TEXT NOT NULL,
                message_text TEXT,
                status TEXT,
                is_auto_reply INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            );
        `);
    }

    // دوال إدارة المستخدمين
    async getUserByPhone(phoneNumber) {
        const db = await this.getDb();
        return db.get('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
    }

    async createUser(phoneNumber, name = null, isAdmin = false) {
        const db = await this.getDb();
        const result = await db.run(
            'INSERT INTO users (phone_number, name, is_admin) VALUES (?, ?, ?)',
            [phoneNumber, name, isAdmin ? 1 : 0]
        );
        return { id: result.lastID, phoneNumber, name, isAdmin };
    }

    // دوال إدارة المحادثات
    async getOrCreateConversation(userId, phoneNumber) {
        const db = await this.getDb();
        
        // البحث عن محادثة موجودة
        let conversation = await db.get(
            'SELECT * FROM conversations WHERE user_id = ? AND phone_number = ?',
            [userId, phoneNumber]
        );

        // إذا لم توجد محادثة، إنشاء محادثة جديدة
        if (!conversation) {
            const result = await db.run(
                'INSERT INTO conversations (user_id, phone_number) VALUES (?, ?)',
                [userId, phoneNumber]
            );
            conversation = { id: result.lastID, user_id: userId, phone_number: phoneNumber };
        }

        return conversation;
    }

    // دوال إدارة الردود التلقائية
    async getAutoReply(keyword) {
        const db = await this.getDb();
        return db.get(
            'SELECT * FROM auto_replies WHERE keyword = ? AND is_active = 1',
            [keyword]
        );
    }

    async addAutoReply(keyword, replyText, isActive = true) {
        const db = await this.getDb();
        const result = await db.run(
            'INSERT INTO auto_replies (keyword, reply_text, is_active) VALUES (?, ?, ?)',
            [keyword, replyText, isActive ? 1 : 0]
        );
        return { id: result.lastID, keyword, replyText, isActive };
    }

    // دوال تسجيل الرسائل
    async saveIncomingMessage(conversationId, messageData) {
        const db = await this.getDb();
        const result = await db.run(
            'INSERT INTO incoming_messages (conversation_id, message_id, message_text, message_type, status) VALUES (?, ?, ?, ?, ?)',
            [
                conversationId,
                messageData.id,
                messageData.text,
                messageData.type || 'text',
                messageData.status || 'received'
            ]
        );
        return result.lastID;
    }

    async saveOutgoingMessage(conversationId, messageData) {
        const db = await this.getDb();
        const result = await db.run(
            'INSERT INTO outgoing_messages (conversation_id, message_id, message_text, status, is_auto_reply) VALUES (?, ?, ?, ?, ?)',
            [
                conversationId,
                messageData.id,
                messageData.text,
                messageData.status || 'sent',
                messageData.isAutoReply ? 1 : 0
            ]
        );
        return result.lastID;
    }
}

// تصدير نسخة واحدة من قاعدة البيانات
module.exports = new Database();
