@echo off
echo جاري تثبيت الحزم المطلوبة...
call npm install

echo.
echo جاري تهيئة قاعدة البيانات...
call node init-db.js

echo.
echo جاري تشغيل البوت...
set NODE_ENV=development
set DB_CLIENT=sqlite3
set DB_FILENAME=./database.sqlite
set BOT_NAME=WhatsApp Bot
set BOT_PREFIX=/
set OWNER_NUMBER=00967771750533@s.whatsapp.net

node simple-bot.js

pause
