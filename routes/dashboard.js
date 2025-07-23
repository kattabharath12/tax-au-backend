const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const Dependent = require('../models/Dependent');
const auth = require('../middleware/auth');

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
        cb(null, 'w9-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
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

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's dependents
        const dependents = await Dependent.findAll({
            where: { userId: req.user.userId },
            order: [['createdAt', 'ASC']]
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                taxInfo: {
                    filingStatus: user.filingStatus,
                    taxClassification: user.taxClassification,
                    businessName: user.businessName,
                    ssn: user.ssn,
                    ein: user.ein,
                    address: user.address,
                    income: user.income,
                    deductions: user.deductions,
                    w9Uploaded: user.w9Uploaded,
                    w9UploadDate: user.w9UploadDate,
                    w9FileName: user.w9FileName,
                    formCompletionStatus: user.formCompletionStatus,
                    dependents: dependents
                },
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update tax information
router.put('/tax-info', auth, [
    body('filingStatus').optional().isIn(['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_widow']),
    body('taxClassification').optional().isIn(['individual', 'sole_proprietor', 'c_corporation', 's_corporation', 'partnership', 'trust_estate', 'llc', 'other']),
    body('businessName').optional().trim(),
    body('ssn').optional().trim(),
    body('ein').optional().trim()
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

        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update tax information
        const {
            filingStatus,
            taxClassification,
            businessName,
            ssn,
            ein,
            address,
            income,
            deductions
        } = req.body;

        const updateData = {};

        if (filingStatus) updateData.filingStatus = filingStatus;
        if (taxClassification) updateData.taxClassification = taxClassification;
        if (businessName !== undefined) updateData.businessName = businessName;
        if (ssn !== undefined) updateData.ssn = ssn;
        if (ein !== undefined) updateData.ein = ein;

        if (address) {
            updateData.address = { ...user.address, ...address };
        }

        if (income) {
            updateData.income = { ...user.income, ...income };
        }

        if (deductions) {
            updateData.deductions = { ...user.deductions, ...deductions };
        }

        // Update completion status
        updateData.formCompletionStatus = 'in_progress';

        await user.update(updateData);

        res.json({
            success: true,
            message: 'Tax information updated successfully',
            taxInfo: {
                filingStatus: user.filingStatus,
                taxClassification: user.taxClassification,
                businessName: user.businessName,
                ssn: user.ssn,
                ein: user.ein,
                address: user.address,
                income: user.income,
                deductions: user.deductions,
                formCompletionStatus: user.formCompletionStatus
            }
        });

    } catch (error) {
        console.error('Tax info update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during update'
        });
    }
});

// Upload W-9 form
router.post('/upload-w9', auth, upload.single('w9Form'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user's W-9 upload status
        await user.update({
            w9Uploaded: true,
            w9UploadDate: new Date(),
            w9FileName: req.file.filename,
            formCompletionStatus: 'in_progress'
        });

        res.json({
            success: true,
            message: 'W-9 form uploaded successfully',
            fileName: req.file.filename,
            uploadDate: user.w9UploadDate
        });

    } catch (error) {
        console.error('W-9 upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during file upload'
        });
    }
});

// Add dependent
router.post('/add-dependent', auth, [
    body('name').notEmpty().trim().withMessage('Dependent name is required'),
    body('relationship').notEmpty().trim().withMessage('Relationship is required'),
    body('ssn').optional().trim(),
    body('birthDate').optional().isISO8601().withMessage('Invalid birth date')
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

        const { name, relationship, ssn, birthDate } = req.body;

        // Create new dependent
        const dependent = await Dependent.create({
            userId: req.user.userId,
            name,
            relationship,
            ssn,
            birthDate: birthDate ? new Date(birthDate) : null
        });

        // Get all dependents for this user
        const dependents = await Dependent.findAll({
            where: { userId: req.user.userId },
            order: [['createdAt', 'ASC']]
        });

        res.json({
            success: true,
            message: 'Dependent added successfully',
            dependent,
            dependents
        });

    } catch (error) {
        console.error('Add dependent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Remove dependent
router.delete('/remove-dependent/:dependentId', auth, async (req, res) => {
    try {
        const dependent = await Dependent.findOne({
            where: {
                id: req.params.dependentId,
                userId: req.user.userId
            }
        });

        if (!dependent) {
            return res.status(404).json({
                success: false,
                message: 'Dependent not found'
            });
        }

        await dependent.destroy();

        // Get remaining dependents
        const dependents = await Dependent.findAll({
            where: { userId: req.user.userId },
            order: [['createdAt', 'ASC']]
        });

        res.json({
            success: true,
            message: 'Dependent removed successfully',
            dependents
        });

    } catch (error) {
        console.error('Remove dependent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get tax calculation (placeholder for future implementation)
router.get('/calculate-tax', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get dependents count
        const dependentsCount = await Dependent.count({
            where: { userId: req.user.userId }
        });

        // Placeholder tax calculation logic
        const income = user.income || {};
        const totalIncome = Object.values(income).reduce((sum, val) => sum + (val || 0), 0);

        // Simple tax calculation (this would be much more complex in reality)
        let taxOwed = 0;
        if (totalIncome > 0) {
            if (totalIncome <= 10275) {
                taxOwed = totalIncome * 0.10;
            } else if (totalIncome <= 41775) {
                taxOwed = 1027.50 + (totalIncome - 10275) * 0.12;
            } else if (totalIncome <= 89450) {
                taxOwed = 4807.50 + (totalIncome - 41775) * 0.22;
            } else {
                taxOwed = 15213.50 + (totalIncome - 89450) * 0.24;
            }
        }

        // Apply dependent deductions (simplified)
        const dependentDeduction = dependentsCount * 2000;
        taxOwed = Math.max(0, taxOwed - dependentDeduction);

        res.json({
            success: true,
            calculation: {
                totalIncome,
                dependentsCount,
                dependentDeduction,
                taxOwed: Math.round(taxOwed * 100) / 100,
                effectiveRate: totalIncome > 0 ? Math.round((taxOwed / totalIncome) * 10000) / 100 : 0
            }
        });

    } catch (error) {
        console.error('Tax calculation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during calculation'
        });
    }
});

module.exports = router;
