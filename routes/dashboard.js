dashboard_js_content = '''const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const Dependent = require('../models/Dependent');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads', 'w9-forms');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'w9-' + req.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Word documents are allowed'));
        }
    }
});

// Get user profile data (GET /api/dashboard/me)
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            filingStatus: user.filingStatus,
            dependents: user.dependents,
            w9Uploaded: user.w9Uploaded,
            w2Uploaded: user.w2Uploaded,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update user profile (PUT /api/dashboard/me)
router.put('/me', auth, [
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('filingStatus').optional().isIn(['single', 'married-joint', 'married-separate', 'head-of-household'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user information
        const { firstName, lastName, filingStatus } = req.body;
        const updateData = {};

        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (filingStatus !== undefined) updateData.filingStatus = filingStatus;

        await user.update(updateData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                filingStatus: user.filingStatus
            }
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during update'
        });
    }
});

// Get user's dependents (GET /api/dashboard/dependents)
router.get('/dependents', auth, async (req, res) => {
    try {
        const dependents = await Dependent.findAll({
            where: { userId: req.userId },
            order: [['createdAt', 'ASC']]
        });

        res.json(dependents);
    } catch (error) {
        console.error('Get dependents error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Add dependent (POST /api/dashboard/dependents)
router.post('/dependents', auth, [
    body('name').notEmpty().trim().withMessage('Dependent name is required'),
    body('relationship').optional().trim(),
    body('dob').optional().isISO8601().withMessage('Invalid date of birth'),
    body('ssn').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, relationship, dob, ssn } = req.body;

        // Create new dependent
        const dependent = await Dependent.create({
            userId: req.userId,
            name,
            relationship,
            dob: dob ? new Date(dob) : null,
            ssn
        });

        res.status(201).json({
            success: true,
            message: 'Dependent added successfully',
            id: dependent.id,
            userId: dependent.userId,
            name: dependent.name,
            relationship: dependent.relationship,
            dob: dependent.dob,
            ssn: dependent.ssn
        });

    } catch (error) {
        console.error('Add dependent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Remove dependent (DELETE /api/dashboard/dependents/:id)
router.delete('/dependents/:id', auth, async (req, res) => {
    try {
        const dependent = await Dependent.findOne({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });

        if (!dependent) {
            return res.status(404).json({
                success: false,
                message: 'Dependent not found'
            });
        }

        await dependent.destroy();

        res.json({
            success: true,
            message: 'Dependent removed successfully'
        });

    } catch (error) {
        console.error('Remove dependent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Upload W-9 form (POST /api/dashboard/upload-w9)
router.post('/upload-w9', auth, upload.single('w9Form'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user's W-9 upload status
        await user.update({
            w9Uploaded: true
        });

        res.json({
            success: true,
            message: 'W-9 form uploaded successfully',
            fileName: req.file.filename,
            uploadDate: new Date()
        });

    } catch (error) {
        console.error('W-9 upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during file upload'
        });
    }
});

module.exports = router;
'''

# Write the file
with open('dashboard.js', 'w') as f:
    f.write(dashboard_js_content)

print("dashboard.js file created successfully!")
