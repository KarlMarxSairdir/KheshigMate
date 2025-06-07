const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
    try {
        console.log('🔄 MongoDB bağlantısı test ediliyor...');
        await mongoose.connect(MONGO_URI, { connectTimeoutMS: 5000 });
        console.log('✅ MongoDB bağlantısı başarılı');
        await mongoose.disconnect();
        console.log('🔌 Bağlantı kapatıldı');
        process.exit(0);
    } catch (error) {
        console.error('❌ Bağlantı hatası:', error.message);
        process.exit(1);
    }
}

testConnection();
