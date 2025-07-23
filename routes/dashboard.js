const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Dependent = require('../models/Dependent');
const auth = require('../middleware/auth');

const router = express.Router();

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, '..', 'uploads', 'w9-forms');
const w2UploadsDir = path.join(__dirname, '..', 'uploads', 'w2-forms');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(w2UploadsDir)) {
    fs.mkdirSync(w2UploadsDir, { recursive: true });
}

// Configure multer for W-9 file uploads
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

// Configure multer for W-2 file uploads
const w2Storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, w2UploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'w2-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadW2 = multer({
    storage: w2Storage,
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
        const user = await User.findByPk(req.user.userId, {
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
            w9UploadDate: user.w9UploadDate,
            w9FileName: user.w9FileName,
            w2Uploaded: user.w2Uploaded,
            w2UploadDate: user.w2UploadDate,
            w2FileName: user.w2FileName,
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

        const user = await User.findByPk(req.user.userId);
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
            where: { userId: req.user.userId },
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
            userId: req.user.userId,
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
            w9FileName: req.file.filename
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

// Upload W-2 form (POST /api/dashboard/upload-w2)
router.post('/upload-w2', auth, uploadW2.single('w2Form'), async (req, res) => {
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

        // Update user's W-2 upload status
        await user.update({
            w2Uploaded: true,
            w2UploadDate: new Date(),
            w2FileName: req.file.filename
        });

        res.json({
            success: true,
            message: 'W-2 form uploaded successfully',
            fileName: req.file.filename,
            uploadDate: new Date()
        });

    } catch (error) {
        console.error('W-2 upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during file upload'
        });
    }
});

// Extract W-2 data (POST /api/dashboard/extract-w2) - NEW
router.post('/extract-w2', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user || !user.w2FileName) {
            return res.status(404).json({
                success: false,
                message: 'No W-2 file found for this user. Please upload a W-2 form first.'
            });
        }

        // Path to the uploaded W-2 file
        const w2Path = path.join(__dirname, '..', 'uploads', 'w2-forms', user.w2FileName);

        // Check if file exists
        if (!fs.existsSync(w2Path)) {
            return res.status(404).json({
                success: false,
                message: 'W-2 file not found on server.'
            });
        }

        // --- MOCKED DATA EXTRACTION ---
        // This simulates extracting data from the W-2 form
        // In a real implementation, you would use OCR or PDF parsing libraries
        const extractedData = {
            // Employee Information
            employeeName: user.firstName + ' ' + user.lastName || 'John Doe',
            employeeSSN: user.ssn || '123-45-6789',
            employeeAddress: user.address || {
                street: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zip: '12345'
            },

            // Employer Information
            employerName: 'Sample Employer Inc.',
            employerEIN: '12-3456789',
            employerAddress: {
                street: '456 Business Ave',
                city: 'Corporate City',
                state: 'CA',
                zip: '54321'
            },

            // W-2 Box Data (simulated)
            box1_wages: 65000.00,           // Wages, tips, other compensation
            box2_federalTax: 8500.00,       // Federal income tax withheld
            box3_socialSecurityWages: 65000.00, // Social security wages
            box4_socialSecurityTax: 4030.00,    // Social security tax withheld
            box5_medicareWages: 65000.00,       // Medicare wages and tips
            box6_medicareTax: 942.50,           // Medicare tax withheld
            box7_socialSecurityTips: 0.00,      // Social security tips
            box8_allocatedTips: 0.00,           // Allocated tips
            box9_verificationCode: '',          // Verification code
            box10_dependentCareBenefits: 0.00,  // Dependent care benefits
            box11_nonqualifiedPlans: 0.00,      // Nonqualified plans
            box12_codes: [],                    // Box 12 codes and amounts
            box13_statutoryEmployee: false,     // Statutory employee
            box13_retirementPlan: true,         // Retirement plan
            box13_thirdPartySickPay: false,     // Third-party sick pay
            box14_other: [],                    // Other deductions/income

            // Additional calculated fields
            taxableIncome: 65000.00,
            totalTaxWithheld: 8500.00,
            netPay: 56500.00,

            // Extraction metadata
            extractionDate: new Date(),
            extractionMethod: 'mocked', // In real implementation: 'ocr', 'pdf-parse', etc.
            confidence: 0.95 // Confidence score for real extraction
        };

        // Store extracted data in user record (optional)
        await user.update({
            income: {
                ...user.income,
                w2Data: extractedData,
                lastW2Extraction: new Date()
            }
        });

        res.json({
            success: true,
            message: 'W-2 data extracted successfully',
            data: extractedData,
            fileName: user.w2FileName,
            extractionDate: new Date()
        });

    } catch (error) {
        console.error('W-2 extraction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during W-2 data extraction',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get extracted W-2 data (GET /api/dashboard/w2-data) - NEW
router.get('/w2-data', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const w2Data = user.income?.w2Data;
        if (!w2Data) {
            return res.status(404).json({
                success: false,
                message: 'No extracted W-2 data found. Please extract W-2 data first.'
            });
        }

        res.json({
            success: true,
            data: w2Data,
            lastExtraction: user.income?.lastW2Extraction
        });

    } catch (error) {
        console.error('Get W-2 data error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving W-2 data'
        });
    }
});

// Update extracted W-2 data (PUT /api/dashboard/w2-data) - NEW
router.put('/w2-data', auth, [
    body('box1_wages').optional().isNumeric(),
    body('box2_federalTax').optional().isNumeric(),
    body('employerName').optional().trim(),
    // Add more validation as needed
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

        const currentW2Data = user.income?.w2Data;
        if (!currentW2Data) {
            return res.status(404).json({
                success: false,
                message: 'No W-2 data found to update. Please extract W-2 data first.'
            });
        }

        // Update W-2 data with provided fields
        const updatedW2Data = {
            ...currentW2Data,
            ...req.body,
            lastModified: new Date()
        };

        await user.update({
            income: {
                ...user.income,
                w2Data: updatedW2Data
            }
        });

        res.json({
            success: true,
            message: 'W-2 data updated successfully',
            data: updatedW2Data
        });

    } catch (error) {
        console.error('Update W-2 data error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating W-2 data'
        });
    }
});

module.exports = router;
