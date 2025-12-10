const path = require('path');

module.exports = {
  filename: process.env.DB_PATH || path.join(__dirname, '../../data/analytics-service.db'),
  mode: process.env.DB_MODE || 'rwc',
  dbName: 'analytics-service'
}; 