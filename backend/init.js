// Database initialization script
const sequelize = require('./config/database');

// Import all models to register them
require('./models/User');
require('./models/Chef');
require('./models/Dish');
require('./models/Order');
require('./models/OrderItem');
require('./models/Review');

const { syncDatabase, setupRelationships } = require('./config/syncDatabase');

// Initialize database
syncDatabase()
    .then(() => {
        console.log('✅ Database initialization complete!');
        console.log('\n📝 Default admin credentials:');
        console.log('   Email: admin@homeychef.com');
        console.log('   Password: admin123\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    });

