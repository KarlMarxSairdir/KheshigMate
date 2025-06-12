# KAŞIKMATE - FAZ 3.5 DETAYLI EYLEM PLANI VE TEKNİK İSTERLER

**Ana Hedef:** Proje üyelerinin proje özelinde dosya paylaşabilmesini sağlamak ve her projenin ilerleyişi hakkında (görev durumu, üye katkısı vb.) görsel ve istatistiksel raporlar sunan bir sayfa oluşturmak.

**Mimari Hatırlatması:** Modüler SCSS mimarisi (`base`, `components`, `pages` klasörleri) kullanılıyor. Tüm route'lar merkezi olarak `server.js` dosyasında yönetiliyor.

---

## BÖLÜM 1: PROJE BAZLI DOSYA PAYLAŞIMI

**Durum:** ✅ TAMAMLANDI

**Hedef:** Kullanıcıların her projeye özel dosyalar (resimler, PDF'ler, dokümanlar vb.) yükleyebilmesi, görüntüleyebilmesi ve silebilmesi.

### Teknik İsterler:

#### 1. Dependency Kurulumu
- [x] `npm install multer` - Dosya yükleme middleware'i ✅

#### 2. Dosya Saklama Yapısı
- [x] Proje kök dizininde `uploads/` klasörü oluşturulması ✅
- [x] Her proje için dinamik alt klasör yapısı (`uploads/:projectId/`) ✅
- [x] Güvenlik ve dosya boyut limitleri ✅

#### 3. Yeni Veritabanı Modeli (`models/ProjectFile.js`)
- [x] ProjectFile modeli oluşturulması ✅
- [x] Alanlar: `originalName`, `serverFilename`, `path`, `mimetype`, `size`, `project`, `uploadedBy` ✅
- [x] `timestamps: true` eklenmesi ✅

#### 4. Backend API Endpoint'leri (`server.js`)
- [x] Multer middleware yapılandırması ✅
- [x] `POST /projects/:projectId/files` - Dosya yükleme ✅
- [x] `GET /projects/:projectId/files` - Dosya listesi ✅
- [x] `GET /projects/:projectId/files/:fileId/download` - Dosya indirme ✅
- [x] `DELETE /projects/:projectId/files/:fileId` - Dosya silme ✅
- [x] Rol bazlı yetkilendirme (owner/editor yükleyebilir, uploader/owner silebilir) ✅

#### 5. Arayüz Entegrasyonu (`views/room.ejs`)
- [x] "Dosyalar" sekmesi eklenmesi ✅
- [x] Dosya yükleme formu (`<input type="file">`) ✅
- [x] Yüklenmiş dosyaların listesi (ikon, dosya adı, boyut, yükleyen, tarih) ✅
- [x] İndirme ve silme butonları ✅

#### 6. Frontend Mimarisi
- [x] `public/css/components/_file-manager.scss` dosyası oluşturulması ✅
- [x] `public/js/file-manager.js` dosyası oluşturulması ✅
- [x] Ana `style.scss` dosyasına import edilmesi ✅

---

## BÖLÜM 2: DİNAMİK PROJE RAPORLAMASI

**Durum:** 🚀 BAŞLANIYOR

**Hedef:** Her proje için, görevlerin durumunu, üye bazında görev dağılımını ve genel ilerlemeyi gösteren basit ama etkili bir raporlama sayfası oluşturmak.

### Teknik İsterler:

#### 1. Dependency Kurulumu
- [ ] `npm install chart.js` - Grafik kütüphanesi

#### 2. Raporlama API Endpoint'i (`server.js`)
- [ ] `GET /projects/:projectId/report` - Proje istatistikleri
- [ ] MongoDB Aggregation Framework kullanımı
- [ ] Hesaplanacak veriler:
  - `totalTasks`: Toplam görev sayısı
  - `statusCounts`: Görev durum dağılımı
  - `priorityCounts`: Öncelik dağılımı
  - `tasksPerMember`: Üye başına görev sayısı
  - `overallProgress`: Genel ilerleme yüzdesi

#### 3. Arayüz Entegrasyonu
- [ ] "Raporlar" sekmesi eklenmesi
- [ ] `public/js/reporting.js` dosyası oluşturulması
- [ ] `public/css/pages/_reporting.scss` dosyası oluşturulması

#### 4. Görselleştirmeler (Chart.js)
- [ ] Pasta Grafiği - Görev durum dağılımı
- [ ] Çubuk Grafik - Üye başına görev dağılımı
- [ ] İstatistik Kartları - Anahtar metrikler

---

## İLERLEME TAKIP

**Başlangıç:** 12 Haziran 2025
**Mevcut Bölüm:** Bölüm 1 - Proje Bazlı Dosya Paylaşımı
**Son Güncelleme:** 12 Haziran 2025

### ⏳ Devam Eden Görevler:
- **Bölüm 2: Dinamik Proje Raporlaması** (Başlangıç aşaması)
  - Chart.js kurulumu ve yapılandırması
  - Raporlama API endpoint'i geliştirimi

### 🎯 Sonraki Adımlar:
1. Chart.js dependency kurulumu
2. Raporlama API endpoint'i oluşturulması
3. MongoDB Aggregation Framework kullanımı
4. Frontend raporlama arayüzü

---

**GÜNCEL DURUM:** Faz 3.5'e başladık. İlk hedefimiz proje bazlı dosya paylaşımı modülünü inşa etmek. Multer kurulumu ve ProjectFile modeli oluşturulması ile başlıyoruz.
