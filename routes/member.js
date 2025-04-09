const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

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