// delete-test-user.js
const mongoose = require('mongoose');
const User = require('./models/User'); // Kullanıcı modelinizin doğru yolu

// MongoDB Bağlantı URI'niz (server.js dosyanızdaki ile aynı olmalı)
const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function deleteTestUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB bağlantısı başarılı.');

    // Kullanıcıyı username alanına göre bul ve sil
    // Hata mesajındaki ObjectId sorunu _id alanı ile ilgili olsa da,
    // "test" kullanıcısını username ile silmek daha olası bir senaryo.
    // Eğer _id'si "test" olan bir kayıt varsa, sorguyu ona göre değiştirebiliriz.
    const result = await User.deleteOne({ username: 'test' });

    if (result.deletedCount > 0) {
      console.log('Başarıyla "test" kullanıcısı silindi.');
    } else {
      console.log('"test" kullanıcısı bulunamadı veya zaten silinmiş.');
    }

  } catch (error) {
    console.error('Hata oluştu:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kesildi.');
  }
}

deleteTestUser();
