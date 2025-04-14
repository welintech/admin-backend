const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Member = require('../models/Member');
const passport = require('passport');

// GET /api/vendors - Get list of all vendors
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search filter
        const searchQuery = { role: 'vendor' };
        if (req.query.search) {
            searchQuery.username = { $regex: req.query.search, $options: 'i' };
        }

        const vendors = await User.find(searchQuery)
            .select('-password') // Exclude password from response
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(searchQuery);

        res.status(200).json({
            success: true,
            data: vendors,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendors',
            error: error.message
        });
    }
});

// GET /api/vendors/:vendorId/members - Get members for a specific vendor
router.get('/:vendorId/members', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { vendorId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Verify vendor exists
        const vendor = await User.findById(vendorId);
        if (!vendor || vendor.role !== 'vendor') {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        // Search filter
        const searchQuery = { user: vendorId };
        if (req.query.search) {
            searchQuery.$and = [
                { user: vendorId },
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
        console.error('Error fetching vendor members:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendor members',
            error: error.message
        });
    }
});

module.exports = router; 