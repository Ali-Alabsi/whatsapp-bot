const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

async function checkDatabase() {
    const db = await open({
        filename: process.env.DB_FILENAME || './database.sqlite',
        driver: sqlite3.Database
    });

    try {
        console.log('📊 محتوى جدول المستخدمين:');
        const users = await db.all('SELECT * FROM users');
        console.table(users);

        console.log('\n📋 محتوى جدول الردود التلقائية:');
        const autoReplies = await db.all('SELECT * FROM auto_replies');
        console.table(autoReplies);

        console.log('\n✅ تم فحص قاعدة البيانات بنجاح');
    } catch (error) {
        console.error('❌ خطأ في فحص قاعدة البيانات:', error);
    } finally {
        await db.close();
    }
}

checkDatabase().catch(console.error);
