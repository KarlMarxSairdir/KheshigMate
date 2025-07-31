const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB Connection URI
const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testMongoDB() {
    try {
        console.log('🔍 MongoDB bağlantısı test ediliyor...');
        
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB bağlantısı başarılı');
        
        // Test user query
        const users = await User.find().limit(5);
        console.log(`📊 Toplam kullanıcı sayısı: ${users.length}`);
        
        if (users.length > 0) {
            console.log('👤 İlk kullanıcı:', users[0].username);
        }
        
        await mongoose.disconnect();
        console.log('✅ Test tamamlandı');
        
    } catch (error) {
        console.error('❌ MongoDB test hatası:', error.message);
    }
}

testMongoDB();
