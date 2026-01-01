const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// All admin routes require auth + admin middleware
router.use(auth, admin);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

        // User statistics
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({
            lastActive: { $gte: fiveMinutesAgo },
            isActive: true
        });
        const bannedUsers = await User.countDocuments({ isBanned: true });
        const newUsersToday = await User.countDocuments({
            createdAt: { $gte: today }
        });

        // Chat statistics
        const totalChats = await Chat.countDocuments();

        // Message statistics
        const messageStats = await Chat.aggregate([
            { $unwind: '$messages' },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    userMessages: {
                        $sum: { $cond: [{ $eq: ['$messages.role', 'user'] }, 1, 0] }
                    },
                    aiMessages: {
                        $sum: { $cond: [{ $eq: ['$messages.role', 'assistant'] }, 1, 0] }
                    }
                }
            }
        ]);

        const messages = messageStats[0] || { total: 0, userMessages: 0, aiMessages: 0 };

        // Today's messages
        const todayMessages = await Chat.aggregate([
            { $unwind: '$messages' },
            { $match: { 'messages.createdAt': { $gte: today } } },
            { $count: 'count' }
        ]);

        // Top users by messages
        const topUsers = await User.find()
            .sort({ totalMessages: -1 })
            .limit(10)
            .select('username email totalMessages lastActive isActive');

        res.json({
            users: {
                total: totalUsers,
                active: activeUsers,
                banned: bannedUsers,
                newToday: newUsersToday
            },
            chats: {
                total: totalChats
            },
            messages: {
                total: messages.total,
                userMessages: messages.userMessages,
                aiMessages: messages.aiMessages,
                today: todayMessages[0]?.count || 0
            },
            topUsers
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Failed to fetch statistics.' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;

        const query = search
            ? {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }
            : {};

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-password');

        const total = await User.countDocuments(query);

        res.json({
            users,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

// Get single user details
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const chats = await Chat.find({ userId: user._id })
            .sort({ updatedAt: -1 })
            .limit(10);

        const messageCount = await Chat.aggregate([
            { $match: { userId: user._id } },
            { $unwind: '$messages' },
            { $count: 'total' }
        ]);

        res.json({
            user,
            stats: {
                chats: chats.length,
                messages: messageCount[0]?.total || 0
            },
            recentChats: chats
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch user details.' });
    }
});

// Ban/Unban user
router.put('/users/:id/ban', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot ban admin users.' });
        }

        user.isBanned = !user.isBanned;
        user.isActive = false;
        await user.save();

        res.json({
            message: user.isBanned ? 'User banned successfully.' : 'User unbanned successfully.',
            user: user.toJSON()
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update user status.' });
    }
});

// Reset user password
router.put('/users/:id/password', async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password reset successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to reset password.' });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete admin users.' });
        }

        // Delete user's chats
        await Chat.deleteMany({ userId: user._id });

        // Delete user
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'User and all associated data deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user.' });
    }
});

// Get message analytics
router.get('/analytics', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Messages per day (last 30 days)
        const dailyMessages = await Chat.aggregate([
            { $unwind: '$messages' },
            { $match: { 'messages.createdAt': { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$messages.createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // User registrations per day
        const dailyRegistrations = await User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            dailyMessages,
            dailyRegistrations
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch analytics.' });
    }
});

module.exports = router;
