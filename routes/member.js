const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const passport = require('passport');

// GET /api/members - Get list of members with pagination (for authenticated user)
router.get('/',async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Sorting options
        const sortField = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

        // Search filter
        const searchQuery = { user: req.user._id }; // Only get members for the authenticated user
        if (req.query.search) {
            searchQuery.$and = [
                { user: req.user._id },
                {
                    $or: [
                        { memberName: { $regex: req.query.search, $options: 'i' } },
                        { memberNumber: { $regex: req.query.search, $options: 'i' } }
                    ]
                }
            ];
        }

        const members = await Member.find(searchQuery)
            .sort({ [sortField]: sortOrder })
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
        console.error('Error fetching members:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching members',
            error: error.message
        });
    }
});

// POST /api/members - Create a new member (for authenticated user)
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const memberData = req.body;
        
        // Convert date strings to Date objects
        memberData.dob = new Date(memberData.dob);
        memberData.policyStartDate = new Date(memberData.policyStartDate);
        memberData.policyEndDate = new Date(memberData.policyEndDate);

        // Add the user ID to the member data
        memberData.user = req.user._id;

        const member = new Member(memberData);
        await member.save();

        res.status(201).json({
            success: true,
            message: 'Member created successfully',
            data: member
        });
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating member',
            error: error.message
        });
    }
});

// GET /api/members - Get all members (for authenticated users)
router.get('/all',
      async (req, res) => {
    try {
        const members = await Member.find(); // Fetch all members from the collection

        res.status(200).json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching members',
            error: error.message
        });
    }
});

module.exports = router; 