const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Dependent = require('../models/Dependent');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/w2');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'w2-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        console.log('Uploaded file mimetype:', file.mimetype); // For debugging
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, PNG, DOC, DOCX files are allowed'), false);
        }
    }
});

// GET /api/dashboard/me - Get user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/dashboard/me - Update user profile
router.put('/me', auth, async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            filingStatus,
            taxClassification,
            businessName,
            ssn,
            ein,
            address,
            income,
            deductions
        } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user fields
        await user.update({
            firstName,
            lastName,
            filingStatus,
            taxClassification,
            businessName,
            ssn,
            ein,
            address,
            income,
            deductions,
            lastLogin: new Date()
        });

        // Return updated user without password
        const updatedUser = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// GET /api/dashboard/dependents - Get user's dependents
router.get('/dependents', auth, async (req, res) => {
    try {
        const dependents = await Dependent.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(dependents);
    } catch (error) {
        console.error('Get dependents error:', error);
        res.status(500).json({ message: 'Failed to fetch dependents' });
    }
});

// POST /api/dashboard/dependents - Add a new dependent
router.post('/dependents', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, relationship, ssn, birthDate } = req.body;

        const dependent = await Dependent.create({
            userId,
            name,
            relationship,
            ssn,
            birthDate
        });

        res.status(201).json(dependent);
    } catch (error) {
        console.error('Add dependent error:', error);
        res.status(500).json({ message: 'Failed to add dependent' });
    }
});

// DELETE /api/dashboard/dependents/:id - Delete a dependent
router.delete('/dependents/:id', auth, async (req, res) => {
    try {
        const dependent = await Dependent.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!dependent) {
            return res.status(404).json({ message: 'Dependent not found' });
        }

        await dependent.destroy();
        res.json({ message: 'Dependent deleted successfully' });
    } catch (error) {
        console.error('Delete dependent error:', error);
        res.status(500).json({ message: 'Failed to delete dependent' });
    }
});

// POST /api/dashboard/upload-w2 - Upload W-2 form
router.post('/upload-w2', auth, upload.single('w2File'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user with W-2 upload info
        await user.update({
            w2Uploaded: true,
            w2UploadDate: new Date(),
            w2FileName: req.file.filename
        });

        res.json({
            message: 'W-2 uploaded successfully',
            fileName: req.file.filename,
            uploadDate: new Date()
        });
    } catch (error) {
        console.error('W-2 upload error:', error);
        res.status(500).json({ message: 'Failed to upload W-2' });
    }
});

// POST /api/dashboard/extract-w2 - Extract data from uploaded W-2 PDF
router.post('/extract-w2', auth, async (req, res) => {
    try {
        // Find the user and check if they have uploaded a W-2
        const user = await User.findByPk(req.user.id);
        if (!user || !user.w2FileName) {
            return res.status(400).json({ 
                message: 'No W-2 file uploaded. Please upload a W-2 form first.' 
            });
        }

        // Construct the path to the uploaded W-2 file
        const w2Path = path.join(__dirname, '../uploads/w2', user.w2FileName);

        // Check if file exists
        if (!fs.existsSync(w2Path)) {
            return res.status(404).json({ 
                message: 'W-2 file not found. Please re-upload your W-2 form.' 
            });
        }

        // Read and parse the PDF
        const dataBuffer = fs.readFileSync(w2Path);
        const pdfData = await pdfParse(dataBuffer);
        const text = pdfData.text;

        console.log('PDF Text Content:', text); // For debugging - remove in production

        // Extract W-2 data using regex patterns
        // Note: These patterns may need adjustment based on your specific W-2 format

        // Employee information
        const employeeName = extractField(text, [
            /Employee's name[:\s]*([A-Za-z\s,.-]+?)(?:\n|$)/i,
            /Employee[:\s]*([A-Za-z\s,.-]+?)(?:\n|Employer)/i,
            /^([A-Za-z\s,.-]+?)(?:\n.*?SSN|Social Security)/im
        ]);

        // Employer information
        const employerName = extractField(text, [
            /Employer's name[:\s]*([A-Za-z\s,.-]+?)(?:\n|$)/i,
            /Employer[:\s]*([A-Za-z\s,.-]+?)(?:\n|EIN)/i,
            /Company[:\s]*([A-Za-z\s,.-]+?)(?:\n|$)/i
        ]);

        // Box 1: Wages, tips, other compensation
        const box1_wages = extractMoneyField(text, [
            /1\s*Wages,?\s*tips,?\s*other\s*compensation[:\s]*\$?([\d,]+\.?\d*)/i,
            /Box\s*1[:\s]*\$?([\d,]+\.?\d*)/i,
            /Wages[:\s]*\$?([\d,]+\.?\d*)/i
        ]);

        // Box 2: Federal income tax withheld
        const box2_federalTax = extractMoneyField(text, [
            /2\s*Federal\s*income\s*tax\s*withheld[:\s]*\$?([\d,]+\.?\d*)/i,
            /Box\s*2[:\s]*\$?([\d,]+\.?\d*)/i,
            /Federal\s*tax\s*withheld[:\s]*\$?([\d,]+\.?\d*)/i
        ]);

        // Box 3: Social security wages
        const box3_socialSecurityWages = extractMoneyField(text, [
            /3\s*Social\s*security\s*wages[:\s]*\$?([\d,]+\.?\d*)/i,
            /Box\s*3[:\s]*\$?([\d,]+\.?\d*)/i,
            /Social\s*security\s*wages[:\s]*\$?([\d,]+\.?\d*)/i
        ]);

        // Box 4: Social security tax withheld
        const box4_socialSecurityTax = extractMoneyField(text, [
            /4\s*Social\s*security\s*tax\s*withheld[:\s]*\$?([\d,]+\.?\d*)/i,
            /Box\s*4[:\s]*\$?([\d,]+\.?\d*)/i,
            /Social\s*security\s*tax[:\s]*\$?([\d,]+\.?\d*)/i
        ]);

        // Box 5: Medicare wages and tips
        const box5_medicareWages = extractMoneyField(text, [
            /5\s*Medicare\s*wages\s*and\s*tips[:\s]*\$?([\d,]+\.?\d*)/i,
            /Box\s*5[:\s]*\$?([\d,]+\.?\d*)/i,
            /Medicare\s*wages[:\s]*\$?([\d,]+\.?\d*)/i
        ]);

        // Box 6: Medicare tax withheld
        const box6_medicareTax = extractMoneyField(text, [
            /6\s*Medicare\s*tax\s*withheld[:\s]*\$?([\d,]+\.?\d*)/i,
            /Box\s*6[:\s]*\$?([\d,]+\.?\d*)/i,
            /Medicare\s*tax[:\s]*\$?([\d,]+\.?\d*)/i
        ]);

        // Create the extracted data object
        const extractedData = {
            employeeName: employeeName || 'Not found',
            employerName: employerName || 'Not found',
            box1_wages: box1_wages || '0.00',
            box2_federalTax: box2_federalTax || '0.00',
            box3_socialSecurityWages: box3_socialSecurityWages || '0.00',
            box4_socialSecurityTax: box4_socialSecurityTax || '0.00',
            box5_medicareWages: box5_medicareWages || '0.00',
            box6_medicareTax: box6_medicareTax || '0.00',
            extractionDate: new Date().toISOString(),
            fileName: user.w2FileName
        };

        // Optionally, save the extracted data to the user record
        await user.update({
            income: {
                ...user.income,
                w2Data: extractedData
            }
        });

        res.json({
            success: true,
            message: 'W-2 data extracted successfully',
            data: extractedData
        });

    } catch (error) {
        console.error('W-2 extraction error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to extract W-2 data. Please ensure the file is a valid PDF.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/dashboard/w2-data - Get extracted W-2 data
router.get('/w2-data', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const w2Data = user.income?.w2Data || null;

        if (!w2Data) {
            return res.status(404).json({ 
                message: 'No W-2 data found. Please upload and extract W-2 data first.' 
            });
        }

        res.json({
            success: true,
            data: w2Data
        });
    } catch (error) {
        console.error('Get W-2 data error:', error);
        res.status(500).json({ message: 'Failed to retrieve W-2 data' });
    }
});

// POST /api/dashboard/generate-1098 - Generate 1098 form
router.post('/generate-1098', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get W-2 data if available
        const w2Data = user.income?.w2Data || {};

        // Generate 1098 data based on user information and W-2 data
        const form1098Data = {
            taxYear: new Date().getFullYear() - 1,
            payerName: 'Auto Tax Filing Service',
            payerTIN: '12-3456789',
            recipientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
            recipientTIN: user.ssn || 'N/A',
            recipientAddress: user.address || {},

            // Box 1: Student loan interest received by lender
            box1_studentLoanInterest: calculateStudentLoanInterest(w2Data),

            // Box 2: If checked, box 1 does not include loan origination fees
            box2_excludesOriginationFees: false,

            // Additional information
            generatedDate: new Date().toISOString(),
            formType: '1098-E',
            corrected: false
        };

        // Save the 1098 data to user record
        await user.update({
            deductions: {
                ...user.deductions,
                form1098Data: form1098Data
            }
        });

        res.json({
            success: true,
            message: '1098 form generated successfully',
            data: form1098Data
        });
    } catch (error) {
        console.error('Generate 1098 error:', error);
        res.status(500).json({ message: 'Failed to generate 1098 form' });
    }
});

// GET /api/dashboard/1098-data - Get generated 1098 data
router.get('/1098-data', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const form1098Data = user.deductions?.form1098Data || null;

        if (!form1098Data) {
            return res.status(404).json({ 
                message: 'No 1098 data found. Please generate 1098 form first.' 
            });
        }

        res.json({
            success: true,
            data: form1098Data
        });
    } catch (error) {
        console.error('Get 1098 data error:', error);
        res.status(500).json({ message: 'Failed to retrieve 1098 data' });
    }
});

// GET /api/dashboard/download-1098 - Download 1098 as PDF
router.get('/download-1098', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const form1098Data = user.deductions?.form1098Data;
        if (!form1098Data) {
            return res.status(404).json({ 
                message: 'No 1098 data found. Please generate 1098 form first.' 
            });
        }

        // Create PDF document
        const doc = new PDFDocument();

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="1098-E-${form1098Data.taxYear}.pdf"`);

        // Pipe the PDF to the response
        doc.pipe(res);

        // Generate PDF content
        doc.fontSize(16).text('Form 1098-E', 50, 50);
        doc.fontSize(12).text(`Student Loan Interest Statement - ${form1098Data.taxYear}`, 50, 80);

        doc.text(`Payer: ${form1098Data.payerName}`, 50, 120);
        doc.text(`Payer TIN: ${form1098Data.payerTIN}`, 50, 140);

        doc.text(`Recipient: ${form1098Data.recipientName}`, 50, 180);
        doc.text(`Recipient TIN: ${form1098Data.recipientTIN}`, 50, 200);

        doc.text(`Box 1 - Student loan interest: $${form1098Data.box1_studentLoanInterest}`, 50, 240);

        doc.text(`Generated on: ${new Date(form1098Data.generatedDate).toLocaleDateString()}`, 50, 300);

        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error('Download 1098 error:', error);
        res.status(500).json({ message: 'Failed to download 1098 form' });
    }
});

// Helper function to extract text fields
function extractField(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return null;
}

// Helper function to extract and format money fields
function extractMoneyField(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            // Remove commas and ensure proper decimal format
            const amount = match[1].replace(/,/g, '');
            // If no decimal point, add .00
            return amount.includes('.') ? amount : amount + '.00';
        }
    }
    return null;
}

// Helper function to calculate student loan interest (simplified calculation)
function calculateStudentLoanInterest(w2Data) {
    // This is a simplified calculation - in reality, this would be more complex
    const wages = parseFloat(w2Data.box1_wages || '0');

    // Simple calculation: if wages are above certain threshold, assume some student loan interest
    if (wages > 30000) {
        return '2500.00'; // Maximum deductible amount
    } else if (wages > 20000) {
        return '1500.00';
    } else if (wages > 10000) {
        return '800.00';
    } else {
        return '0.00';
    }
}

module.exports = router;
