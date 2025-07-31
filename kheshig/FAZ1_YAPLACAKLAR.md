# KAŞIKMATE FAZ 1 - YAPILACAKLAR LİSTESİ

## 🎯 ÖNCELIK SIRASI

### 1. PROJE ROUTE'LARINI GÜNCELLEME (YÜKSEKÖNCELİK)

#### Görev 1.1: Proje Oluşturma Route Güncelleme
- **Dosya**: `routes/projects.js` veya `expressApp.js`
- **İş**: Proje oluşturulurken owner'ı members dizisine otomatik ekleme
- **Durum**: ⏳ Bekliyor

#### Görev 1.2: Dashboard Route Güncelleme  
- **Dosya**: Dashboard route handler
- **İş**: Sadece kullanıcının owner/member olduğu projeleri getirme
- **Durum**: ⏳ Bekliyor

#### Görev 1.3: Proje Silme Route Güncelleme
- **Dosya**: DELETE projects route
- **İş**: Sadece owner'ın silme yetkisi kontrolü
- **Durum**: ⏳ Bekliyor

### 2. ÜYE EKLEME API'Sİ VE ARAYÜZÜ (YÜKSEKÖNCELİK)

#### Görev 2.1: Üye Ekleme API Endpoint
- **Dosya**: `routes/projects.js`
- **Endpoint**: `POST /projects/:id/members`
- **İş**: Kullanıcı adıyla üye ekleme API'si
- **Durum**: ⏳ Bekliyor

#### Görev 2.2: Proje Ayarları Sayfası
- **Dosya**: `views/project-settings.ejs` (yeni)
- **İş**: Üye ekleme formu ve mevcut üyeleri listeleme
- **Durum**: ⏳ Bekliyor

#### Görev 2.3: Frontend Üye Ekleme
- **Dosya**: Proje ayarları JS dosyası
- **İş**: Üye ekleme form işlevselliği
- **Durum**: ⏳ Bekliyor

### 3. DRAWINGDATA ENTEGRASYONU (ORTA ÖNCELİK)

#### Görev 3.1: Canvas Kaydetme API
- **Dosya**: `routes/projects.js`
- **Endpoint**: `POST /projects/:id/drawing`
- **İş**: Canvas verisini DrawingData'ya kaydetme
- **Durum**: ⏳ Bekliyor

#### Görev 3.2: Canvas Yükleme API
- **Dosya**: `routes/projects.js`
- **Endpoint**: `GET /projects/:id/drawing`
- **İş**: Son kaydedilen canvas verisini getirme
- **Durum**: ⏳ Bekliyor

#### Görev 3.3: Room.js Canvas Entegrasyonu
- **Dosya**: `public/js/room.js`
- **İş**: Sayfa yüklendiğinde canvas verisi çekme ve kaydetme
- **Durum**: ⏳ Bekliyor

### 4. NOTLAR SOCKET.IO SENKRONIZASYONU (ORTA ÖNCELİK)

#### Görev 4.1: Socket.IO Not Events
- **Dosya**: `server.js` veya `socket handler`
- **İş**: note-updated, note-saved events ekleme
- **Durum**: ⏳ Bekliyor

#### Görev 4.2: Frontend Not Senkronizasyonu
- **Dosya**: `public/js/room.js`
- **İş**: Socket.IO ile not güncellemelerini dinleme
- **Durum**: ⏳ Bekliyor

### 5. SKILLS KAYIT FORMU (DÜŞÜK ÖNCELİK)

#### Görev 5.1: Register Form Güncelleme
- **Dosya**: `views/register.ejs`
- **İş**: Skills input alanları ekleme
- **Durum**: ⏳ Bekliyor

#### Görev 5.2: Register Route Güncelleme
- **Dosya**: Register POST route
- **İş**: Skills verisini kaydetme logic'i
- **Durum**: ⏳ Bekliyor

## 📝 NOTLAR
- Her görev tamamlandıkça bu liste güncellenecek
- Test aşamaları her görev sonrası yapılacak
- Socket.IO odaları proje ID bazlı çalışacak

---
*Son güncelleme: 5 Haziran 2025*
