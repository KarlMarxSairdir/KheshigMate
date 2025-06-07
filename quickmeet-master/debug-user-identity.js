const mongoose = require('mongoose');
const User = require('./models/User');
const ProjectNote = require('./models/ProjectNote');

const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function debugUserIdentity() {
    try {
        console.log('🔄 MongoDB bağlantısı kuruluyor...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB bağlantısı başarılı');

        // Tüm kullanıcıları listele
        console.log('\n📋 KULLANICILAR:');
        const users = await User.find({}, 'username email _id');
        users.forEach(user => {
            console.log(`👤 ${user.username} (${user.email}) - ID: ${user._id}`);
        });

        // deneme3 kullanıcısını bul
        console.log('\n🔍 DENEME3 KULLANICISI:');
        const deneme3 = await User.findOne({ username: 'deneme3' });
        if (deneme3) {
            console.log(`✅ deneme3 bulundu - ID: ${deneme3._id}`);
        } else {
            console.log('❌ deneme3 bulunamadı');
        }

        // Kaan61 kullanıcısını bul
        console.log('\n🔍 KAAN61 KULLANICISI:');
        const kaan61 = await User.findOne({ username: 'Kaan61' });
        if (kaan61) {
            console.log(`✅ Kaan61 bulundu - ID: ${kaan61._id}`);
        } else {
            console.log('❌ Kaan61 bulunamadı');
        }

        // En son oluşturulan notları kontrol et
        console.log('\n📝 EN SON OLUŞTURULAN NOTLAR:');
        const recentNotes = await ProjectNote.find()
            .populate('user', 'username email _id')
            .sort({ createdAt: -1 })
            .limit(10);
          recentNotes.forEach(note => {
            if (note.user) {
                console.log(`📝 Not: "${note.content.substring(0, 50)}..." - Yazan: ${note.user.username} (ID: ${note.user._id}) - Tarih: ${note.createdAt}`);
            } else {
                console.log(`📝 Not: "${note.content.substring(0, 50)}..." - Yazan: KULLANICI BULUNAMADI (User ID: ${note.user}) - Tarih: ${note.createdAt}`);
            }
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

debugUserIdentity();
