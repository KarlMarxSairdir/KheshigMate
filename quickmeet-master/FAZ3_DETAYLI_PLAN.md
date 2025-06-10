# KAŞIKMATE - FAZ 3 DETAYLI EYLEM PLANI VE TEKNİK İSTERLER

**Ana Hedef:** Proje yönetimi yeteneklerimizi, görevlerin zaman çizelgesini görselleştiren bir Gantt şeması ve proje etkinliklerini takip eden interaktif bir takvim ile zenginleştirmek. Ayrıca, mevcut verileri (notlar, chat, kullanıcı yetkinlikleri) kullanarak akıllı görev önerileri sunan bir AI katmanı eklemek.

**Mimari Hatırlatması:** Modüler SCSS mimarisi (`base`, `components`, `pages` klasörleri) kullanılıyor. Tüm route'lar merkezi olarak `server.js` dosyasında yönetiliyor.

---

## BÖLÜM 1: GANTT ŞEMASI ENTEGRASYONU

**Durum:** ✅ TAMAMLANDI

**Hedef:** Projedeki görevleri, başlangıç ve bitiş tarihlerine göre interaktif ve görsel bir zaman çizelgesi üzerinde göstermek.

### Teknik İsterler:

#### 1. Veritabanı Güncellemesi (`models/Task.js`)
- [x] `startDate: { type: Date }` alanını Task şemasına ekle ✅
- [x] `endDate: { type: Date }` alanını Task şemasına ekle ✅
- **Hatırlatma:** `dueDate` bitiş tarihi, `startDate` ve `dueDate` opsiyonel (tarihsiz görevler için)

#### 2. API Güncellemesi (`server.js`)
- [x] `PUT /projects/:projectId/tasks/:taskId` endpoint'ini `startDate` kabul edecek şekilde güncelle ✅
- [x] `POST /projects/:projectId/tasks` endpoint'ini `startDate` kabul edecek şekilde güncelle ✅
- [x] Tarih alanlarını (startDate, dueDate, endDate) otomatik olarak Date objesine dönüştürme ✅
- [x] Progress ve status alanları arasında bidirectional senkronizasyon ✅

#### 3. Frontend Kütüphane Kurulumu
- [x] Frappe Gantt kütüphanesi yüklendi ✅

#### 4. Arayüz Entegrasyonu (`views/room.ejs`)
- [x] "Zaman Çizelgesi" sekmesi eklendi (Kanban ve BPMN yanına) ✅
- [x] Gantt container eklendi ✅
- [x] Kanban modalına startDate alanı eklendi ✅

#### 5. Frontend Mimarisi
- [x] `public/css/components/_gantt.scss` dosyası oluşturuldu ✅
- [x] Ana `style.scss` dosyasına import edildi ✅

#### 6. Frontend Mantığı (`public/js/gantt.js`)
- [x] `gantt.js` dosyası oluşturuldu ✅
- [x] Kanban ve Gantt arasında real-time senkronizasyon ✅
- [x] `GET /projects/:projectId/tasks` API çağrısı ✅
- [x] Veri dönüşüm fonksiyonu: Task verilerini Frappe Gantt formatına çevir ✅
- [x] Gantt render işlemi: `new Gantt("#gantt-chart", tasks, options)` ✅
- [x] Görünüm modu kontrolleri (Day/Week/Month) ✅
- [x] Drag & drop ile tarih güncelleme ✅
- [x] Progress çubuğu ile ilerleme güncelleme ✅
- [x] WebSocket ile real-time güncellemeler ✅
- [x] Safe re-rendering stratejisi ile kararlı görüntü ✅

### ✅ Tamamlanan Ek Özellikler:
- [x] Backend'de akıllı status-progress senkronizasyonu
- [x] Frontend'de safe re-rendering stratejisi (t is undefined hatası çözüldü)
- [x] Kanban'dan yapılan değişiklikler Gantt'da anlık görünüyor
- [x] Gantt'dan yapılan değişiklikler Kanban'da anlık görünüyor
- [x] Context7 uyumlu Frappe Gantt formatı
- [x] Hata handling ve validation

---

## BÖLÜM 2: TAKVİM ENTEGRASYONU

**Durum:** ✅ TAMAMLANDI

**Hedef:** Proje bazlı etkinlikleri ve görev son tarihlerini gösteren interaktif bir takvim oluşturmak.

### Teknik İsterler:

#### 1. Yeni Veritabanı Modeli (`models/CalendarEvent.js`)
- [x] CalendarEvent modeli oluşturuldu ✅
- [x] Alanlar: `title`, `description`, `startDate`, `endDate`, `allDay`, `project`, `createdBy` ✅

#### 2. Yeni API Endpoint'leri (`server.js`)
- [x] `GET /projects/:projectId/events` - Etkinlikler + görevleri birleştir ✅
- [x] `POST /projects/:projectId/events` - Yeni etkinlik oluştur ✅
- [x] `PUT /projects/:projectId/events/:eventId` - Etkinlik güncelle ✅
- [x] `DELETE /projects/:projectId/events/:eventId` - Etkinlik sil ✅

#### 3. Frontend Kütüphane Kurulumu
- [x] FullCalendar kütüphaneleri kuruldu ✅

#### 4. Arayüz ve Frontend Entegrasyonu
- [x] "Takvim" sekmesi eklendi ✅
- [x] `public/css/components/_calendar.scss` oluşturuldu (premium design) ✅
- [x] `public/js/calendar.js` dosyası oluşturuldu ✅
- [x] Room.js'de sekme entegrasyonu tamamlandı ✅

### ✅ Tamamlanan Ek Özellikler:
- [x] Modern glassmorphism tasarım ile premium kalender UI
- [x] Real-time etkinlik senkronizasyonu
- [x] Responsive design ve mobil uyumluluk
- [x] Tab sistemi entegrasyonu ile seamless geçişler
- [x] Kalender header UI basitleştirmesi (duplikasyon giderme)

---

## BÖLÜM 2.5: GELİŞMİŞ NOT EDİTÖRÜ SİSTEMİ

**Durum:** 🚧 AKTİF

**Hedef:** Mevcut basit textarea not sistemini, zengin metin düzenleme özellikleri ve rol bazlı izinlerle donatılmış profesyonel bir editör sistemine dönüştürmek.

### Teknik İsterler:

#### 1. Rich Text Editor Entegrasyonu
- [ ] `npm install quill` - Quill.js WYSIWYG editor kurulumu
- [ ] Quill.js CDN entegrasyonu (`views/room.ejs`)
- [ ] Toolbar konfigürasyonu: Bold, Italic, Underline, Lists, Headers, Links
- [ ] Custom tema ve stil entegrasyonu

#### 2. Veritabanı Güncellemesi (`models/ProjectNote.js`)
- [ ] `content` alanını String'den Mixed'e çevir (JSON Delta formatı)
- [ ] `contentType` alanı ekle: 'text' | 'rich'
- [ ] `lastEditedBy` alanı ekle (kullanıcı takibi için)
- [ ] `editHistory` alanı ekle (versiyon kontrolü için)

#### 3. Rol Bazlı İzin Sistemi
- [ ] Role enum güncelleme: 'viewer', 'editor', 'owner'
- [ ] Permission middleware oluştur
- [ ] Editor rolü: Sadece kendi notlarını düzenleyebilir
- [ ] Owner rolü: Tüm notları düzenleyebilir
- [ ] Viewer rolü: Sadece okuma yetkisi

#### 4. API Endpoint Güncellemeleri (`server.js`)
- [ ] `PUT /projects/:projectId/notes/:noteId` - İzin kontrolü ekle
- [ ] `POST /projects/:projectId/notes` - Content type validation
- [ ] Delta format desteği (Quill'in native formatı)
- [ ] Real-time synchronization için WebSocket eventi

#### 5. Frontend Geliştirmeleri
- [ ] `public/js/noteEditor.js` dosyası oluştur
- [ ] Quill editor initialization
- [ ] Auto-save functionality (5 saniyede bir)
- [ ] Collaborative editing indicators
- [ ] Edit conflict resolution
- [ ] Rich content preview modu

#### 6. UI/UX Güncellemeleri
- [ ] `public/css/components/_note-editor.scss` oluştur
- [ ] Modern editor toolbar tasarımı
- [ ] Loading states ve edit indicators
- [ ] Permission-based UI rendering
- [ ] Mobile-responsive editor design

#### 7. Real-time Collaboration
- [ ] WebSocket note edit events
- [ ] Operational Transform (OT) algoritması
- [ ] Concurrent editing conflict resolution
- [ ] "User is typing..." indicators
- [ ] Auto-merge ve conflict detection

### 🎯 Beklenen Faydalar:
- **Gelişmiş İçerik:** Bold, italic, listeler, başlıklar ile zengin notlar
- **Güvenlik:** Rol bazlı düzenleme izinleri
- **Collaboration:** Real-time çoklu kullanıcı düzenleme
- **User Experience:** Modern, profesyonel editör arayüzü
- **AI Hazırlığı:** Yapılandırılmış içerik AI analizi için ideal

---

## BÖLÜM 3: AI DESTEKLİ GÖREV ÖNERİSİ

**Durum:** ⏳ BEKLİYOR

**Hedef:** Proje metinlerini analiz ederek potansiyel görevleri tespit eden ve kullanıcı yetkinliklerine göre öneren AI modülü.

### Teknik İsterler:

#### 1. AI Servis Modülü (`services/aiTaskFinder.js`)
- [ ] AI servis dosyası oluştur
- [ ] `findPotentialTasks(projectId)` fonksiyonu
- [ ] Metin analizi ve görev tespiti

#### 2. AI API Endpoint'i
- [ ] `GET /projects/:projectId/ai-suggestions` endpoint'i

#### 3. Arayüz Entegrasyonu
- [ ] "Akıllı Öneriler ✨" bölümü
- [ ] `public/js/ai-suggestions.js` dosyası

---

## İLERLEME TAKIP

**Başlangıç:** 9 Haziran 2025
**Mevcut Bölüm:** Bölüm 2.5 - Gelişmiş Not Editörü Sistemi
**Son Güncelleme:** 10 Haziran 2025

### ✅ Tamamlanan Görevler:
- **Bölüm 1: Gantt Şeması Entegrasyonu** (%100 tamamlandı)
  - Task modelinde startDate/endDate eklendi
  - Backend tarih dönüşümleri ve validasyonlar
  - Frappe Gantt entegrasyonu
  - Real-time senkronizasyon
  - Safe re-rendering stratejisi

- **Bölüm 2: Takvim Entegrasyonu** (%100 tamamlandı)
  - CalendarEvent modeli ve API endpoint'leri
  - FullCalendar entegrasyonu
  - Premium glassmorphism tasarım
  - Room.js tab sistemi entegrasyonu
  - Real-time etkinlik senkronizasyonu

### 🎯 Sonraki Adım:
- **Bölüm 2.5: Quill.js kurulumu ve Rich Text Editor entegrasyonu**

---

**GÜNCEL DURUM:** Gantt şeması ve Takvim entegrasyonları başarıyla tamamlandı. Şimdi not sistemini güçlendirmek için gelişmiş editör modülüne geçiyoruz. Bu, AI modülünün daha kaliteli veri analizi yapmasını sağlayacak.
