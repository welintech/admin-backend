const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// GET /api/members - Get list of members with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Sorting options
        const sortField = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

        // Search filter
        const searchQuery = {};
        if (req.query.search) {
            searchQuery.$or = [
                { memberName: { $regex: req.query.search, $options: 'i' } },
                { memberNumber: { $regex: req.query.search, $options: 'i' } }
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

// POST /api/members - Create a new member
router.post('/', async (req, res) => {
    try {
        const memberData = req.body;
        
        // Convert date strings to Date objects
        memberData.dob = new Date(memberData.dob);
        memberData.policyStartDate = new Date(memberData.policyStartDate);
        memberData.policyEndDate = new Date(memberData.policyEndDate);

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

module.exports = router; 