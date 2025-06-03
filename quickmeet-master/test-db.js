const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('Testing MongoDB connection...');

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    });
