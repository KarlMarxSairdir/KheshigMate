const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testLogin() {
    try {
        console.log('🔄 MongoDB bağlantısı kuruluyor...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB bağlantısı başarılı');

        // Test kullanıcısı oluştur
        console.log('🔄 Test kullanıcısı oluşturuluyor...');
        const testUser = new User({
            username: 'testuser',
            email: 'test@test.com',
            password: '123456'
        });

        // Kullanıcı var mı kontrol et
        const existingUser = await User.findOne({ email: 'test@test.com' });
        if (existingUser) {
            console.log('⚠️ Test kullanıcısı zaten mevcut');
        } else {
            await testUser.save();
            console.log('✅ Test kullanıcısı oluşturuldu');
        }

        // Login test et
        console.log('🔄 Login test ediliyor...');
        const user = await User.findOne({ email: 'test@test.com' });
        if (user) {
            const isMatch = await user.comparePassword('123456');
            console.log('✅ Şifre karşılaştırması:', isMatch);
        }

        // Tüm kullanıcıları listele
        const allUsers = await User.find();
        console.log('📋 Toplam kullanıcı sayısı:', allUsers.length);

        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

testLogin();
