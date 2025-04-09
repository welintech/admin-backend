const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Member = require('../models/Member');
const passport = require('passport');

// GET /api/users - Get list of all users (admin only)
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search filter
        const searchQuery = {};
        if (req.query.search) {
            searchQuery.username = { $regex: req.query.search, $options: 'i' };
        }

        const users = await User.find(searchQuery)
            .select('-password') // Exclude password from response
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(searchQuery);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
});

// GET /api/users/:userId/members - Get members for a specific user (admin only)
router.get('/:userId/members', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Search filter
        const searchQuery = { user: userId };
        if (req.query.search) {
            searchQuery.$and = [
                { user: userId },
                {
                    $or: [
                        { memberName: { $regex: req.query.search, $options: 'i' } },
                        { memberNumber: { $regex: req.query.search, $options: 'i' } }
                    ]
                }
            ];
        }

        const members = await Member.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Member.countDocuments(searchQuery);

        res.status(200).json({
            success: true,
            data: members,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching user members:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user members',
            error: error.message
        });
    }
});

module.exports = router; 