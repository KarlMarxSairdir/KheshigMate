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

**Durum:** 🚧 AKTİF

**Hedef:** Proje bazlı etkinlikleri ve görev son tarihlerini gösteren interaktif bir takvim oluşturmak.

### Teknik İsterler:

#### 1. Yeni Veritabanı Modeli (`models/CalendarEvent.js`)
- [ ] CalendarEvent modeli oluştur
- [ ] Alanlar: `title`, `description`, `startDate`, `endDate`, `allDay`, `project`, `createdBy`

#### 2. Yeni API Endpoint'leri (`server.js`)
- [ ] `GET /projects/:projectId/events` - Etkinlikler + görevleri birleştir
- [ ] `POST /projects/:projectId/events` - Yeni etkinlik oluştur
- [ ] `PUT /projects/:projectId/events/:eventId` - Etkinlik güncelle
- [ ] `DELETE /projects/:projectId/events/:eventId` - Etkinlik sil

#### 3. Frontend Kütüphane Kurulumu
- [ ] FullCalendar kütüphaneleri kur

#### 4. Arayüz ve Frontend Entegrasyonu
- [ ] "Takvim" sekmesi ekle
- [ ] `public/css/components/_calendar.scss` oluştur
- [ ] `public/js/calendar.js` dosyası oluştur

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
**Mevcut Bölüm:** Bölüm 2 - Takvim Entegrasyonu
**Son Güncelleme:** 10 Haziran 2025

### ✅ Tamamlanan Görevler:
- Bölüm 1: Gantt Şeması Entegrasyonu (%100 tamamlandı)
  - Task modelinde startDate/endDate eklendi
  - Backend tarih dönüşümleri ve validasyonlar
  - Frappe Gantt entegrasyonu
  - Real-time senkronizasyon
  - Safe re-rendering stratejisi

### 🎯 Sonraki Adım:
- **Bölüm 2: CalendarEvent modeli oluşturma**

---

**NOT:** Gantt şeması entegrasyonu başarıyla tamamlandı. Artık kullanıcılar görevleri hem Kanban hem Gantt görünümünde görebilir ve güncelleyebilir. Sistem real-time senkronizasyon ile mükemmel çalışıyor.
