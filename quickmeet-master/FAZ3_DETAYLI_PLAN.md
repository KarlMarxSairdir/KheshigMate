# KAŞIKMATE - FAZ 3 DETAYLI EYLEM PLANI VE TEKNİK İSTERLER

**Ana Hedef:** Proje yönetimi yeteneklerimizi, görevlerin zaman çizelgesini görselleştiren bir Gantt şeması ve proje etkinliklerini takip eden interaktif bir takvim ile zenginleştirmek. Ayrıca, mevcut verileri (notlar, chat, kullanıcı yetkinlikleri) kullanarak akıllı görev önerileri sunan bir AI katmanı eklemek.

**Mimari Hatırlatması:** Modüler SCSS mimarisi (`base`, `components`, `pages` klasörleri) kullanılıyor. Tüm route'lar merkezi olarak `server.js` dosyasında yönetiliyor.

---

## BÖLÜM 1: GANTT ŞEMASI ENTEGRASYONU

**Durum:** 🚧 DEVAM EDİYOR

**Hedef:** Projedeki görevleri, başlangıç ve bitiş tarihlerine göre interaktif ve görsel bir zaman çizelgesi üzerinde göstermek.

### Teknik İsterler:

#### 1. Veritabanı Güncellemesi (`models/Task.js`)
- [ ] `startDate: { type: Date }` alanını Task şemasına ekle
- **Hatırlatma:** `dueDate` bitiş tarihi, `startDate` ve `dueDate` opsiyonel (tarihsiz görevler için)

#### 2. API Güncellemesi (`server.js`)
- [ ] `PUT /projects/:projectId/tasks/:taskId` endpoint'ini `startDate` kabul edecek şekilde güncelle
- [ ] `POST /projects/:projectId/tasks` endpoint'ini `startDate` kabul edecek şekilde güncelle
- [ ] Validation ekle: `startDate` < `dueDate` kontrolü, hata durumunda `400 Bad Request`

#### 3. Frontend Kütüphane Kurulumu
- [ ] `npm install frappe-gantt` komutu ile kütüphane kurulumu

#### 4. Arayüz Entegrasyonu (`views/room.ejs`)
- [ ] "Zaman Çizelgesi" sekmesi ekle (Kanban ve BPMN yanına)
- [ ] Gantt container ekle: `<div id="gantt-chart-container"><svg id="gantt-chart"></svg></div>`

#### 5. Frontend Mimarisi
- [ ] `public/css/components/_gantt.scss` dosyası oluştur
- [ ] Ana `style.scss` dosyasına import et

#### 6. Frontend Mantığı (`public/js/gantt.js` - YENİ DOSYA)
- [ ] `gantt.js` dosyası oluştur
- [ ] `room.ejs`'e script tag ile dahil et
- [ ] `GET /projects/:projectId/tasks` API çağrısı
- [ ] Veri dönüşüm fonksiyonu: Task verilerini Frappe Gantt formatına çevir
- [ ] Gantt render işlemi: `new Gantt("#gantt-chart", tasks, options)`
- [ ] Görünüm modu kontrolleri (Day/Week/Month)

---

## BÖLÜM 2: TAKVİM ENTEGRASYONU

**Durum:** ⏳ BEKLİYOR

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
**Mevcut Bölüm:** Bölüm 1 - Gantt Şeması Entegrasyonu
**Son Güncelleme:** 9 Haziran 2025

### Tamamlanan Görevler:
- Faz 3 plan dosyası oluşturuldu

### Sonraki Adım:
- `models/Task.js` dosyasını `startDate` alanı ile güncelle

---

**NOT:** Her bölüm sonunda test ve onay beklenecek. Bölümler arası geçiş sadece onay sonrası yapılacak.
