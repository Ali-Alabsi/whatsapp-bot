const OpenAI = require('openai');
require('dotenv').config();

class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.conversationHistory = new Map(); // لتخزين سجل المحادثات
    }

    // الحصول على تاريخ المحادثة للمستخدم
    getConversationHistory(userId) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, [
                {
                    role: "system",
                    content: "أنت مساعد ذكي يتحدث العربية. كن مفيدًا، محترفًا، وودودًا. استخدم علامات الترقيم المناسبة واجعل إجاباتك واضحة ومنظمة."
                }
            ]);
        }
        return this.conversationHistory.get(userId);
    }

    // تحديث سجل المحادثة
    updateConversationHistory(userId, role, content) {
        const history = this.getConversationHistory(userId);
        history.push({ role, content });
        
        // الحفاظ على حجم معقول لسجل المحادثة
        if (history.length > 10) { // الاحتفاظ بآخر 10 رسائل
            history.splice(1, 2); // إزالة أقدم رسالتين (بعد الرسالة النظامية)
        }
    }

    // الحصول على رد من الذكاء الاصطناعي
    async getAIResponse(userId, message) {
        try {
            // تحديث سجل المحادثة بالرسالة الجديدة
            this.updateConversationHistory(userId, 'user', message);
            
            const history = this.getConversationHistory(userId);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: history,
                temperature: 0.7,
                max_tokens: 500,
            });

            const aiResponse = completion.choices[0].message.content;
            
            // تحديث سجل المحادثة برد الذكاء الاصطناعي
            this.updateConversationHistory(userId, 'assistant', aiResponse);
            
            return aiResponse;
        } catch (error) {
            console.error('Error getting AI response:', error);
            return 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.';
        }
    }

    // معالجة الصور (إذا لزم الأمر)
    async processImage(imageUrl) {
        try {
            // يمكن إضافة معالجة الصور هنا
            return 'شكراً لك على مشاركة الصورة. أنا حالياً أستطيع معالجة النصوص فقط.';
        } catch (error) {
            console.error('Error processing image:', error);
            return 'عذراً، لا يمكنني معالجة الصور حالياً.';
        }
    }
}

module.exports = new AIService();
