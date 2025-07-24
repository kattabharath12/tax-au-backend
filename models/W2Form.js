const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const W2Form = sequelize.define('W2Form', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    filePath: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Employer Information
    employer: {
        type: DataTypes.STRING,
        allowNull: true
    },
    employerAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    employerEIN: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Employee Information
    employeeName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    employeeSSN: {
        type: DataTypes.STRING,
        allowNull: true
    },
    employeeAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Box 1: Wages, tips, other compensation
    wages: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 2: Federal income tax withheld
    federalTaxWithheld: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 3: Social security wages
    socialSecurityWages: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 4: Social security tax withheld
    socialSecurityTax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 5: Medicare wages and tips
    medicareWages: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 6: Medicare tax withheld
    medicareTax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 7: Social security tips
    socialSecurityTips: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 8: Allocated tips
    allocatedTips: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 10: Dependent care benefits
    dependentCareBenefits: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 11: Nonqualified plans
    nonqualifiedPlans: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 12: Codes and amounts (stored as JSON)
    box12: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    // Box 13: Checkboxes
    statutoryEmployee: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    retirementPlan: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    thirdPartySickPay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Box 14: Other (stored as JSON for multiple entries)
    other: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    // State tax information
    stateTaxInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    // Local tax information
    localTaxInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    // Processing status
    isProcessed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    extractedData: {
        type: DataTypes.JSON,
        allowNull: true
    },
    processingNotes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'w2forms',
    timestamps: true
});

module.exports = W2Form;
