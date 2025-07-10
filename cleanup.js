const fs = require('fs');
const path = require('path');

// مسار مجلد جلسة المصادقة
const authFolder = path.join(__dirname, 'baileys_auth_info');

// حذف المجلد إذا كان موجوداً
if (fs.existsSync(authFolder)) {
    console.log('جاري حذف جلسة المصادقة القديمة...');
    fs.rmSync(authFolder, { recursive: true, force: true });
    console.log('✅ تم حذف جلسة المصادقة بنجاح');
} else {
    console.log('⚠️ لم يتم العثور على جلسة مصادقة قديمة');
}

console.log('الآن يمكنك تشغيل البوت مرة أخرى');
