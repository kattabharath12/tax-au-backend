const { Sequelize } = require('sequelize');

// Initialize Sequelize with PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Test the connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected successfully!');

        // Sync all models (create tables if they don't exist)
        await sequelize.sync({ alter: true });
        console.log('Database synchronized!');
    } catch (error) {
        console.error('Unable to connect to PostgreSQL:', error);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
