const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Dependent = require('../models/Dependent');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');

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

// Extract W-2 data (POST /api/dashboard/extract-w2)
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

// Get extracted W-2 data (GET /api/dashboard/w2-data)
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

// Update extracted W-2 data (PUT /api/dashboard/w2-data)
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

// Generate 1098 data (POST /api/dashboard/generate-1098) - NEW
router.post('/generate-1098', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user || !user.income?.w2Data) {
            return res.status(404).json({
                success: false,
                message: 'No W-2 data found. Please extract W-2 data first.'
            });
        }

        // Get W-2 data for calculations
        const w2Data = user.income.w2Data;

        // Calculate mortgage interest based on income (this is a simplified example)
        // In reality, this would come from actual mortgage documents or user input
        const estimatedMortgageInterest = Math.min(w2Data.box1_wages * 0.04, 10000); // 4% of wages, max $10k

        // Generate 1098 data using W-2 information and user profile
        const form1098 = {
            // Borrower Information (from user profile and W-2)
            borrowerName: w2Data.employeeName || (user.firstName + ' ' + user.lastName),
            borrowerSSN: w2Data.employeeSSN || user.ssn || '123-45-6789',
            borrowerAddress: w2Data.employeeAddress || user.address || {
                street: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zip: '12345'
            },

            // Lender Information (mocked)
            lenderName: 'First National Mortgage Bank',
            lenderTIN: '98-7654321',
            lenderAddress: {
                street: '789 Finance Blvd',
                city: 'Banking City',
                state: 'NY',
                zip: '10001'
            },

            // 1098 Form Data
            mortgageInterestReceived: estimatedMortgageInterest, // Box 1
            pointsPaid: 0.00, // Box 2
            refundOfOverpaidInterest: 0.00, // Box 3
            mortgageInsurancePremiums: w2Data.box1_wages * 0.005, // Box 4 - 0.5% of wages
            outstandingMortgagePrincipal: w2Data.box1_wages * 3.5, // Box 5 - estimated based on income

            // Property Information
            propertyAddress: w2Data.employeeAddress || user.address || {
                street: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zip: '12345'
            },

            // Form Metadata
            formYear: new Date().getFullYear(),
            generatedDate: new Date(),
            accountNumber: 'MTG-' + user.id.substring(0, 8).toUpperCase(),

            // Calculation Details (for reference)
            calculationBasis: {
                basedOnW2Income: w2Data.box1_wages,
                interestRate: 0.04, // 4% assumed rate
                estimationMethod: 'income_based'
            }
        };

        // Store 1098 data in user record
        await user.update({
            deductions: {
                ...user.deductions,
                form1098: form1098,
                last1098Generation: new Date()
            }
        });

        res.json({
            success: true,
            message: '1098 form data generated successfully',
            data: form1098,
            generatedDate: new Date()
        });

    } catch (error) {
        console.error('1098 generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during 1098 generation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get 1098 data (GET /api/dashboard/1098-data) - UPDATED
router.get('/1098-data', auth, async (req, res) => {
    try {
        const form1098 = await Form1098.findOne({ where: { userId: req.user.id } });
        
        if (!form1098) {
            return res.status(404).json({
                success: false,
                message: 'No 1098 data found. Please generate 1098 form first.'
            });
        }

        res.json({
            success: true,
            data: form1098,
            lastGeneration: form1098.generatedDate
        });

    } catch (error) {
        console.error('Get 1098 data error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

     catch (error) {
        console.error('Get 1098 data error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving 1098 data'
        });
    }
});

// Update 1098 data (PUT /api/dashboard/1098-data) - NEW
router.put('/1098-data', auth, [
    body('mortgageInterestReceived').optional().isNumeric(),
    body('pointsPaid').optional().isNumeric(),
    body('mortgageInsurancePremiums').optional().isNumeric(),
    body('lenderName').optional().trim(),
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

        const current1098Data = user.deductions?.form1098;
        if (!current1098Data) {
            return res.status(404).json({
                success: false,
                message: 'No 1098 data found to update. Please generate 1098 form first.'
            });
        }

        // Update 1098 data with provided fields
        const updated1098Data = {
            ...current1098Data,
            ...req.body,
            lastModified: new Date()
        };

        await user.update({
            deductions: {
                ...user.deductions,
                form1098: updated1098Data
            }
        });

        res.json({
            success: true,
            message: '1098 data updated successfully',
            data: updated1098Data
        });

    } catch (error) {
        console.error('Update 1098 data error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating 1098 data'
        });
    }
});

// Download 1098 PDF (GET /api/dashboard/download-1098) - NEW
router.get('/download-1098', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const form1098 = user.deductions?.form1098;
        if (!form1098) {
            return res.status(404).json({
                success: false,
                message: 'No 1098 data found. Please generate 1098 form first.'
            });
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Form1098_${form1098.formYear}_${user.firstName}_${user.lastName}.pdf"`);

        // Pipe the PDF to the response
        doc.pipe(res);

        // PDF Content
        // Header
        doc.fontSize(20).text('Form 1098', { align: 'center' });
        doc.fontSize(16).text('Mortgage Interest Statement', { align: 'center' });
        doc.fontSize(12).text(`Tax Year ${form1098.formYear}`, { align: 'center' });
        doc.moveDown(2);

        // Lender Information
        doc.fontSize(14).text('LENDER INFORMATION', { underline: true });
        doc.fontSize(11);
        doc.text(`Name: ${form1098.lenderName}`);
        doc.text(`TIN: ${form1098.lenderTIN}`);
        doc.text(`Address: ${form1098.lenderAddress.street}`);
        doc.text(`         ${form1098.lenderAddress.city}, ${form1098.lenderAddress.state} ${form1098.lenderAddress.zip}`);
        doc.moveDown();

        // Borrower Information
        doc.fontSize(14).text('BORROWER INFORMATION', { underline: true });
        doc.fontSize(11);
        doc.text(`Name: ${form1098.borrowerName}`);
        doc.text(`SSN: ${form1098.borrowerSSN}`);
        doc.text(`Address: ${form1098.borrowerAddress.street}`);
        doc.text(`         ${form1098.borrowerAddress.city}, ${form1098.borrowerAddress.state} ${form1098.borrowerAddress.zip}`);
        doc.moveDown();

        // Property Information
        doc.fontSize(14).text('PROPERTY INFORMATION', { underline: true });
        doc.fontSize(11);
        doc.text(`Property Address: ${form1098.propertyAddress.street}`);
        doc.text(`                  ${form1098.propertyAddress.city}, ${form1098.propertyAddress.state} ${form1098.propertyAddress.zip}`);
        doc.text(`Account Number: ${form1098.accountNumber}`);
        doc.moveDown();

        // Form Data
        doc.fontSize(14).text('MORTGAGE INTEREST INFORMATION', { underline: true });
        doc.fontSize(11);
        doc.text(`Box 1 - Mortgage Interest Received: $${form1098.mortgageInterestReceived.toFixed(2)}`);
        doc.text(`Box 2 - Points Paid: $${form1098.pointsPaid.toFixed(2)}`);
        doc.text(`Box 3 - Refund of Overpaid Interest: $${form1098.refundOfOverpaidInterest.toFixed(2)}`);
        doc.text(`Box 4 - Mortgage Insurance Premiums: $${form1098.mortgageInsurancePremiums.toFixed(2)}`);
        doc.text(`Box 5 - Outstanding Mortgage Principal: $${form1098.outstandingMortgagePrincipal.toFixed(2)}`);
        doc.moveDown();

        // Footer
        doc.fontSize(10);
        doc.text(`Generated on: ${new Date(form1098.generatedDate).toLocaleDateString()}`, { align: 'right' });
        doc.text('This is a computer-generated document.', { align: 'center' });

        // Calculation details (if needed for debugging)
        if (form1098.calculationBasis) {
            doc.moveDown();
            doc.fontSize(8).text('Calculation Details:', { underline: true });
            doc.text(`Based on W-2 Income: $${form1098.calculationBasis.basedOnW2Income.toFixed(2)}`);
            doc.text(`Estimation Method: ${form1098.calculationBasis.estimationMethod}`);
            doc.text(`Interest Rate Used: ${(form1098.calculationBasis.interestRate * 100).toFixed(2)}%`);
        }

        // Finalize the PDF
        doc.end();

    } catch (error) {
        console.error('Download 1098 PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating 1098 PDF',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
