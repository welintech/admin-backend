const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');

// GET /api/vendors - Get list of all vendors (no authentication)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search filter
        const searchQuery = {};
        if (req.query.search) {
            searchQuery.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
                { phone: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const vendors = await Vendor.find(searchQuery)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Vendor.countDocuments(searchQuery);

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

// GET /api/vendors/:vendorId - Get a specific vendor by ID
router.get('/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        res.status(200).json({
            success: true,
            data: vendor
        });
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendor',
            error: error.message
        });
    }
});

module.exports = router; 