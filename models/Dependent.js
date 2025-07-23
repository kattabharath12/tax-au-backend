const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Dependent = sequelize.define('Dependent', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    relationship: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ssn: {
        type: DataTypes.STRING,
        allowNull: true
    },
    birthDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'dependents',
    timestamps: true
});

module.exports = Dependent;
