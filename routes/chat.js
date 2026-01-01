const express = require('express');
const Chat = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// AI Response Generator (Local Simulation)
const generateAIResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();

    // Code analysis patterns
    const codePatterns = {
        javascript: /```(javascript|js)|function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+|=>/,
        python: /```python|def\s+\w+|import\s+\w+|from\s+\w+|print\(|class\s+\w+:/,
        java: /```java|public\s+class|private\s+|void\s+main|System\.out/,
        cpp: /```(cpp|c\+\+)|#include|int\s+main|std::|cout\s*<</,
        html: /```html|<html>|<div|<span|<body|<head/,
        css: /```css|\.[\w-]+\s*{|#[\w-]+\s*{|@media/,
        sql: /```sql|SELECT|INSERT|UPDATE|DELETE|CREATE TABLE/i
    };

    // Detect language
    let detectedLang = 'text';
    for (const [lang, pattern] of Object.entries(codePatterns)) {
        if (pattern.test(userMessage)) {
            detectedLang = lang;
            break;
        }
    }

    // Generate appropriate response based on context
    if (lowerMessage.includes('error') || lowerMessage.includes('bug') || lowerMessage.includes('fix') || lowerMessage.includes('خطأ')) {
        return {
            content: `🔍 **تحليل الكود:**

لقد قمت بتحليل الكود الخاص بك. إليك بعض الملاحظات:

**المشاكل المحتملة:**
1. تأكد من التحقق من قيم null/undefined قبل استخدامها
2. تحقق من إغلاق جميع الأقواس والأقواس المعقوفة بشكل صحيح
3. تأكد من استيراد جميع المكتبات المطلوبة

**الحل المقترح:**
\`\`\`${detectedLang}
// تأكد من التحقق من الأخطاء
try {
  // الكود الخاص بك هنا
} catch (error) {
  console.error('خطأ:', error.message);
}
\`\`\`

💡 **نصيحة:** استخدم أدوات debugging مثل console.log لتتبع سير البرنامج.

هل تحتاج مساعدة إضافية؟`,
            type: 'code',
            language: detectedLang
        };
    }

    if (lowerMessage.includes('explain') || lowerMessage.includes('شرح') || lowerMessage.includes('اشرح')) {
        return {
            content: `📚 **شرح الكود:**

سأشرح لك هذا الكود بالتفصيل:

**الهيكل العام:**
- يتكون الكود من عدة أجزاء رئيسية
- كل جزء له وظيفة محددة

**كيف يعمل:**
1. أولاً، يتم تهيئة المتغيرات
2. ثم يتم تنفيذ العمليات الأساسية
3. وأخيراً، يتم إرجاع النتيجة

**نقاط مهمة:**
- ⚡ الأداء: الكود فعال ومُحسَّن
- 🔒 الأمان: تأكد من التحقق من المدخلات
- 📖 القراءة: يمكن تحسين التعليقات

هل تريد شرح جزء معين بالتفصيل؟`,
            type: 'text'
        };
    }

    if (lowerMessage.includes('optimize') || lowerMessage.includes('تحسين') || lowerMessage.includes('أسرع')) {
        return {
            content: `⚡ **تحسين الأداء:**

إليك بعض النصائح لتحسين الكود:

**1. تحسين الحلقات:**
\`\`\`${detectedLang}
// بدلاً من:
for (let i = 0; i < array.length; i++)
// استخدم:
const len = array.length;
for (let i = 0; i < len; i++)
\`\`\`

**2. استخدام Cache:**
- خزّن النتائج المتكررة
- تجنب العمليات المكررة

**3. Lazy Loading:**
- حمّل البيانات عند الحاجة فقط
- استخدم pagination للبيانات الكبيرة

**4. تقليل DOM Operations:**
- اجمع التغييرات وطبّقها مرة واحدة

📊 **النتيجة المتوقعة:** تحسين الأداء بنسبة 30-50%`,
            type: 'code',
            language: detectedLang
        };
    }

    // Default helpful response
    const responses = [
        `مرحباً! 👋 أنا **Olk Dev AI** مساعدك البرمجي.

أستطيع مساعدتك في:
- 🔍 تحليل الأكواد والبحث عن الأخطاء
- 💡 اقتراحات لتحسين الكود
- 📚 شرح المفاهيم البرمجية
- 🛠️ حل المشاكل التقنية

**لغات البرمجة المدعومة:**
JavaScript, Python, Java, C++, HTML/CSS, SQL, وغيرها الكثير!

كيف يمكنني مساعدتك اليوم؟`,

        `شكراً لسؤالك! 🎯

لأقدم لك أفضل مساعدة، يرجى:
1. مشاركة الكود الذي تعمل عليه
2. وصف المشكلة أو ما تريد تحقيقه
3. ذكر لغة البرمجة المستخدمة

أنا جاهز لمساعدتك! 💪`,

        `سؤال رائع! 🌟

دعني أساعدك في ذلك. بناءً على سؤالك:

**النقاط الرئيسية:**
1. تأكد من فهم المتطلبات جيداً
2. قسّم المشكلة إلى أجزاء صغيرة
3. اختبر كل جزء على حدة

هل تريد أن أشرح أكثر أو أساعدك في جزء معين؟`
    ];

    return {
        content: responses[Math.floor(Math.random() * responses.length)],
        type: 'text'
    };
};

// Get all chats for user
router.get('/', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user._id })
            .sort({ updatedAt: -1 })
            .select('title createdAt updatedAt messages');

        res.json({ chats });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch chats.' });
    }
});

// Create new chat
router.post('/', auth, async (req, res) => {
    try {
        const chat = new Chat({
            userId: req.user._id,
            title: 'New Chat',
            messages: []
        });

        await chat.save();
        res.status(201).json({ chat });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create chat.' });
    }
});

// Get single chat
router.get('/:id', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found.' });
        }

        res.json({ chat });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch chat.' });
    }
});

// Send message to chat
router.post('/:id/messages', auth, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Message content is required.' });
        }

        const chat = await Chat.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found.' });
        }

        // Add user message
        const userMessage = {
            role: 'user',
            content: content.trim(),
            type: 'text'
        };
        chat.messages.push(userMessage);

        // Generate AI response
        const aiResponse = generateAIResponse(content);
        const assistantMessage = {
            role: 'assistant',
            content: aiResponse.content,
            type: aiResponse.type || 'text',
            language: aiResponse.language || ''
        };
        chat.messages.push(assistantMessage);

        // Update chat title if first message
        chat.updateTitle();

        // Update user stats
        req.user.totalMessages += 1;
        await req.user.save();

        await chat.save();

        res.json({
            userMessage,
            assistantMessage,
            chat
        });
    } catch (error) {
        console.error('Message error:', error);
        res.status(500).json({ message: 'Failed to send message.' });
    }
});

// Delete chat
router.delete('/:id', auth, async (req, res) => {
    try {
        const chat = await Chat.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found.' });
        }

        res.json({ message: 'Chat deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete chat.' });
    }
});

module.exports = router;
