const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    filingStatus: {
        type: DataTypes.ENUM('single', 'married-joint', 'married-separate', 'head-of-household', 'qualifying-widow'),
        allowNull: true,
    },
    // W-9 related fields
    taxClassification: {
        type: DataTypes.ENUM('individual', 'sole_proprietor', 'c_corporation', 's_corporation', 'partnership', 'trust_estate', 'llc', 'other'),
        allowNull: true,
    },
    businessName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ssn: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ein: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    address: {
        type: DataTypes.JSONB, // Store address as a JSON object
        allowNull: true,
        defaultValue: {} // e.g., { street: '', city: '', state: '', zip: '' }
    },
    income: {
        type: DataTypes.JSONB, // Store income details as a JSON object
        allowNull: true,
        defaultValue: {} // e.g., { w2Wages: 0, otherIncome: 0 }
    },
    deductions: {
        type: DataTypes.JSONB, // Store deductions as a JSON object
        allowNull: true,
        defaultValue: {} // e.g., { studentLoanInterest: 0, medicalExpenses: 0 }
    },
    w9Uploaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    w9UploadDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    w9FileName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // W-2 related fields (NEW)
    w2Uploaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    w2UploadDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    w2FileName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Form completion status
    formCompletionStatus: {
        type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
        defaultValue: 'not_started',
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'users',
    timestamps: true,
});

module.exports = User;
