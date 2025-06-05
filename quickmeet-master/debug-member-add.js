const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');

// MongoDB Connection URI
const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function debugMemberAdd() {
    try {
        console.log('🔍 MongoDB bağlantısı kuruluyor...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB bağlantısı başarılı');
        
        // Test project ID
        const projectId = '6840f1a98cb52bebecd6fb72';
        
        console.log('🔍 Proje aranıyor:', projectId);
        const project = await Project.findById(projectId).populate('owner', 'username email');
        
        if (!project) {
            console.log('❌ Proje bulunamadı');
            return;
        }
        
        console.log('✅ Proje bulundu:', project.name);
        console.log('👤 Proje sahibi:', project.owner.username);
        console.log('👥 Mevcut üye sayısı:', project.members.length);
        
        // List all users
        console.log('\n🔍 Tüm kullanıcılar:');
        const users = await User.find({}, 'username email');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username} (${user.email})`);
        });
        
        // Test adding a user (if exists)
        if (users.length > 1) {
            const testUser = users.find(u => u._id.toString() !== project.owner._id.toString());
            if (testUser) {
                console.log('\n🧪 Test kullanıcısı ile üye ekleme simülasyonu:');
                console.log('Test kullanıcısı:', testUser.username);
                
                // Check if already member
                const isAlreadyMember = project.members.some(member => 
                    member.user.toString() === testUser._id.toString()
                );
                
                if (isAlreadyMember) {
                    console.log('⚠️  Bu kullanıcı zaten üye');
                } else {
                    console.log('✅ Bu kullanıcı eklenebilir');
                }
            }
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Test tamamlandı');
        
    } catch (error) {
        console.error('❌ Test hatası:', error);
    }
}

debugMemberAdd();
