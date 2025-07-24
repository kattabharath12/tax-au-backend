const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Form1098 = sequelize.define('Form1098', {
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
    // Lender Information (Boxes 1-4)
    lenderName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lenderAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    lenderTIN: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lenderPhone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Borrower Information (Boxes 5-7)
    borrowerName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    borrowerSSN: {
        type: DataTypes.STRING,
        allowNull: true
    },
    borrowerAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Account Information
    accountNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Box 1: Mortgage interest received from payer(s)/borrower(s)
    mortgageInterestReceived: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    // Box 2: Outstanding mortgage principal
    outstandingPrincipal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 3: Mortgage origination date
    originationDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    // Box 4: Refund of overpaid interest
    refundOverpaidInterest: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 5: Mortgage insurance premiums
    mortgageInsurancePremiums: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 6: Points paid on purchase of principal residence
    pointsPaidPurchase: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 7: Address or description of property
    propertyAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Box 8: Other
    otherAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    otherDescription: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Box 9: Number of properties
    numberOfProperties: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1
    },
    // Box 10: Other real estate taxes
    realEstateTaxes: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Box 11: Acquisition cost
    acquisitionCost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    // Tax year for this form
    taxYear: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: new Date().getFullYear()
    },
    // Form generation details
    generatedDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    pdfPath: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Status and notes
    status: {
        type: DataTypes.ENUM('draft', 'generated', 'sent', 'filed'),
        defaultValue: 'draft'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Additional metadata
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
    }
}, {
    tableName: 'form1098s',
    timestamps: true
});

module.exports = Form1098;
