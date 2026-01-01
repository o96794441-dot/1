const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'code'],
        default: 'text'
    },
    language: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'New Chat'
    },
    messages: [messageSchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Update title based on first message
chatSchema.methods.updateTitle = function () {
    if (this.messages.length > 0 && this.title === 'New Chat') {
        const firstMessage = this.messages[0].content;
        this.title = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
    }
};

module.exports = mongoose.model('Chat', chatSchema);
