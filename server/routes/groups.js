const {DataTypes} = require('sequelize');
const sequelize = require('../config/database');

const Group = sequelize.define('Group', {
    name: {
        type: DataTypes.STRING, 
        allowNull: false
    },
    createdBy: {    
        type: DataTypes.INTEGER,
        allowNull: false
    },
    contributionAmount: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    payoutOrder: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        defaultValue: []
    },
    meetingFrequency: {
        type: DataTypes.ENUM('weekly', 'biweekly', 'monthly'),
        defaultValue: 'monthly'
    }
});