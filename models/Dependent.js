const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Dependent = sequelize.define('Dependent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    relationship: {
        type: DataTypes.ENUM('child', 'spouse', 'parent', 'other'),
        allowNull: false
    },
    dob: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: 'dependents',
    timestamps: true
});

module.exports = Dependent;
