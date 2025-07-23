const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Tax Information as JSON fields
    filingStatus: {
        type: DataTypes.ENUM('single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_widow'),
        allowNull: true,
        defaultValue: 'single'
    },
    taxClassification: {
        type: DataTypes.ENUM('individual', 'sole_proprietor', 'c_corporation', 's_corporation', 'partnership', 'trust_estate', 'llc', 'other'),
        allowNull: true,
        defaultValue: 'individual'
    },
    businessName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ssn: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ein: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Address as JSON
    address: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    // Income as JSON
    income: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
            wages: 0,
            selfEmployment: 0,
            interest: 0,
            dividends: 0,
            capitalGains: 0,
            other: 0
        }
    },
    // Deductions as JSON
    deductions: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
            standardDeduction: true,
            itemizedDeductions: {
                mortgageInterest: 0,
                stateLocalTaxes: 0,
                charitableContributions: 0,
                medicalExpenses: 0
            }
        }
    },
    // W-9 Upload Status
    w9Uploaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    w9UploadDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    w9FileName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Form Completion Status
    formCompletionStatus: {
        type: DataTypes.ENUM('not_started', 'in_progress', 'completed', 'filed'),
        defaultValue: 'not_started'
    }
}, {
    tableName: 'users',
    timestamps: true, // This adds createdAt and updatedAt
    indexes: [
        {
            unique: true,
            fields: ['email']
        }
    ]
});

module.exports = User;
