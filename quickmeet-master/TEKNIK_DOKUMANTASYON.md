# KAŞIKMATE - TEKNIK DOKÜMANTASYON

## 📁 PROJE YAPISII

### Backend Yapısı
```
quickmeet-master/
├── server.js              # Ana sunucu dosyası
├── expressApp.js           # Express app konfigürasyonu
├── middleware/
│   └── auth.js            # Authentication middleware'leri
├── models/
│   ├── User.js            # Kullanıcı modeli (skills ile)
│   ├── Project.js         # Proje modeli (roller ile)
│   ├── ProjectNote.js     # Proje notları modeli
│   ├── ChatMessage.js     # Chat mesajları modeli
│   └── DrawingData.js     # Çizim verileri modeli
├── routes/               # Route dosyaları (oluşturulacak)
├── views/                # EJS template'leri
└── public/               # Statik dosyalar
```

### Veri Modelleri

#### User Model
```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  skills: [String] (trim),
  createdAt: Date
}
```

#### Project Model
```javascript
{
  name: String (required),
  description: String,
  owner: ObjectId (User ref, required),
  members: [{
    user: ObjectId (User ref, required),
    role: String enum ['owner', 'editor'] (default: 'editor')
  }],
  lastCanvasState: String,
  createdAt: Date
}
```

#### DrawingData Model
```javascript
{
  project: ObjectId (Project ref, required),
  user: ObjectId (User ref),
  data: Object (required),
  createdAt: Date
}
```

### API Endpoints

#### Authentication
- `POST /login` - Kullanıcı girişi
- `POST /register` - Kullanıcı kaydı
- `GET /logout` - Kullanıcı çıkışı

#### Projects
- `GET /dashboard` - Kullanıcının projeleri
- `POST /projects` - Yeni proje oluşturma
- `DELETE /projects/:id` - Proje silme (sadece owner)
- `POST /projects/:id/members` - Üye ekleme (sadece owner)
- `GET /projects/:id/room` - Proje çalışma alanı

#### Drawing & Notes
- `POST /projects/:id/drawing` - Canvas kaydetme
- `GET /projects/:id/drawing` - Canvas yükleme
- `POST /projects/:id/notes` - Not kaydetme
- `PUT /projects/:id/notes/:noteId` - Not güncelleme

### Socket.IO Events

#### Room Events
- `join-project` - Proje odasına katılma
- `leave-project` - Proje odasından ayrılma

#### Chat Events
- `chat-message` - Chat mesajı gönderme
- `chat-history` - Chat geçmişi

#### Drawing Events
- `drawing-data` - Çizim verisi paylaşma
- `canvas-update` - Canvas güncelleme

#### Note Events
- `note-updated` - Not güncellendi
- `note-saved` - Not kaydedildi

### Middleware Kullanımı

#### ensureAuthenticated
```javascript
// Giriş yapılmış kullanıcılar için
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  // Route logic
});
```

#### ensureProjectOwner
```javascript
// Sadece proje sahipleri için
app.delete('/projects/:id', ensureAuthenticated, ensureProjectOwner, (req, res) => {
  // Route logic
});
```

#### ensureProjectMemberOrOwner
```javascript
// Proje üyeleri ve sahipleri için
app.get('/projects/:id/room', ensureAuthenticated, ensureProjectMemberOrOwner, (req, res) => {
  // Route logic
});
```

## 🔧 KONFIGÜRASYON

### Gerekli Environment Variables
```
MONGODB_URI=mongodb://localhost:27017/kaşıkmate
SESSION_SECRET=your-secret-key
PORT=3000
```

### Gerekli npm Packages
```
express, mongoose, socket.io, bcryptjs, express-session
```

---
*Son güncelleme: 5 Haziran 2025*
