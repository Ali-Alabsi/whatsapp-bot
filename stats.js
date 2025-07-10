const db = require('./db');

async function showStats() {
    try {
        // عرض إحصائيات الرسائل
        const stats = await db.getMessageStats();
        console.log('\n📊 إحصائيات الرسائل:');
        console.log('-------------------');
        console.log(`📨 إجمالي الرسائل: ${stats.total_messages}`);
        console.log(`📤 الرسائل الصادرة: ${stats.sent_messages}`);
        console.log(`📥 الرسائل الواردة: ${stats.received_messages}`);
        console.log(`👥 عدد المرسلين الفريدين: ${stats.unique_senders}`);

        // عرض آخر الرسائل
        const recentMessages = await db.getRecentMessages(5);
        console.log('\n📝 آخر الرسائل:');
        console.log('-------------------');
        
        for (const msg of recentMessages) {
            const direction = msg.is_from_me ? '←' : '→';
            const type = msg.is_from_me ? 'صادرة' : 'واردة';
            const time = new Date(msg.created_at).toLocaleString('ar-SA');
            
            console.log(`\n${direction} [${time}] (${type})`);
            console.log(`من: ${msg.sender_number}`);
            console.log(`إلى: ${msg.recipient_number}`);
            console.log(`النص: ${msg.message_preview}${msg.message_preview.length === 100 ? '...' : ''}`);
            console.log(`النوع: ${msg.message_type} | الحالة: ${msg.status}`);
        }
        
    } catch (error) {
        console.error('حدث خطأ في عرض الإحصائيات:', error);
    } finally {
        // إغلاق الاتصال بقاعدة البيانات
        process.exit(0);
    }
}

// تشغيل الدالة
showStats();
