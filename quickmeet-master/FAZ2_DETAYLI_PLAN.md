# FAZ 2 DETAYLI PLAN - PROFİL YÖNETİMİ VE GELİŞMİŞ GÖREV SİSTEMİ
*Oluşturulma Tarihi: 8 Haziran 2025*
*Son Güncelleme: 8 Haziran 2025*

## 🎯 FAZ 2 VİZYONU
Kaşıkmate projesinin proje yönetimi yeteneklerini derinleştirmek ve kullanıcıların skills-based görev dağıtımı, Kanban tabanlı proje takibi ve BPMN iş akışı yönetimi yapabilmesini sağlamak.

---

## 📋 FAZ 2 BÖLÜM ÇİZELGESİ

### ✅ BÖLÜM 0: KULLANICI PROFİLİ YÖNETİMİ (TAMAMLANDI)
**Başlangıç:** 8 Haziran 2025  
**Bitiş:** 8 Haziran 2025  
**Süre:** 1 gün  
**Durum:** %100 Tamamlandı

### 🔧 BÖLÜM 1: GÖREV YÖNETİMİ MODELİ VE TEMEL API'LER (AKTİF)
**Başlangıç:** 8 Haziran 2025  
**Tahmini Bitiş:** 10 Haziran 2025  
**Tahmini Süre:** 2-3 gün  
**Durum:** %0 - Henüz başlamadı

### ⏳ BÖLÜM 2: KANBAN TAHTASI ARAYÜZÜ VE ETKİLEŞİMİ (BEKLEMEDE)
**Tahmini Başlangıç:** 11 Haziran 2025  
**Tahmini Bitiş:** 13 Haziran 2025  
**Tahmini Süre:** 2-3 gün  

### ⏳ BÖLÜM 3: BPMN.IO ENTEGRASYONU (BEKLEMEDE)
**Tahmini Başlangıç:** 14 Haziran 2025  
**Tahmini Bitiş:** 15 Haziran 2025  
**Tahmini Süre:** 1-2 gün  

---

## 🔧 BÖLÜM 1 DETAYLI PLAN (AKTİF BÖLÜM)

### 📊 Hedef ve Kapsam
**Ana Hedef:** Kanban tahtasının temelini oluşturacak görev yönetimi altyapısını kurmak  
**Alt Hedefler:**
- Task veri modeli oluşturmak
- CRUD API'leri geliştirmek
- Project-Task ilişkisini kurmak
- Yetkilendirme sistemini entegre etmek
- Skills-based assignment altyapısını hazırlamak

### 📝 Yapılacaklar Listesi

#### 1. Task Model Oluşturma (`models/Task.js`)
**Öncelik:** Yüksek  
**Tahmini Süre:** 2-3 saat  

**Schema Gereksinimleri:**
```javascript
{
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 1000 },
  status: { 
    type: String, 
    enum: ['todo', 'in-progress', 'done'], 
    default: 'todo' 
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  dueDate: { type: Date },
  requiredSkills: [{ type: String }],
  order: { type: Number, default: 0 }
}
```

**Ek Özellikler:**
- `timestamps: true` - Otomatik createdAt/updatedAt
- Pre/post middleware'ler için hook noktaları
- Validation kuralları

#### 2. Task API Endpoint'leri (`server.js`)
**Öncelik:** Yüksek  
**Tahmini Süre:** 4-5 saat  

**Route Bloğu Konumu:** `// --- Task API Routes ---` (Project routes'tan sonra)

**Oluşturulacak Endpoint'ler:**
```javascript
// GET /projects/:projectId/tasks - Proje görevlerini listele
// POST /projects/:projectId/tasks - Yeni görev oluştur
// PUT /projects/:projectId/tasks/:taskId - Görev güncelle
// DELETE /projects/:projectId/tasks/:taskId - Görev sil
// PUT /projects/:projectId/tasks/:taskId/status - Görev durumu güncelle
// PUT /projects/:projectId/tasks/:taskId/assign - Görev atama
```

**Yetkilendirme Kuralları:**
- Sadece proje üyeleri (`owner` veya `editor`) görevleri görebilir
- Sadece proje sahipleri ve editörler görev oluşturabilir/düzenleyebilir
- Görev sahibi kendi görevinin durumunu değiştirebilir

#### 3. Project Model Güncellemesi
**Öncelik:** Orta  
**Tahmini Süre:** 1 saat  

**Eklenecek Alanlar:**
- `taskCount` field'i (opsiyonel, cache için)
- Task referansları için virtual populate

#### 4. Middleware Geliştirmeleri
**Öncelik:** Orta  
**Tahmini Süre:** 2 saat  

**Yeni Middleware'ler:**
- `validateProjectMembership` - Proje üyelik kontrolü
- `validateTaskOwnership` - Görev sahiplik kontrolü
- `validateTaskData` - Görev veri doğrulama

#### 5. Error Handling ve Validation
**Öncelik:** Orta  
**Tahmini Süre:** 2 saat  

**Kapsam:**
- Comprehensive error responses
- Input validation ve sanitization
- Database constraint handling

### 🧪 Test Stratejisi

#### Manuel Test Senaryoları:
1. **Task Oluşturma:**
   - Valid data ile görev oluşturma
   - Required field'ların kontrolü
   - Proje üyelik kontrolü

2. **Task Listeleme:**
   - Proje bazlı filtreleme
   - Pagination (gelecek için hazırlık)
   - Status bazlı filtreleme

3. **Task Güncelleme:**
   - Status değiştirme
   - Atama değiştirme
   - Yetkilendirme kontrolü

4. **Task Silme:**
   - Sahiplik kontrolü
   - Soft delete vs hard delete

#### API Test Endpoint'leri:
```bash
# Test için kullanılacak curl komutları hazırlanacak
# Postman collection oluşturulacak (opsiyonel)
```

### 📁 Dosya Yapısı Değişiklikleri

**Yeni Dosyalar:**
- `models/Task.js` - Yeni model
- (Gerekirse) `middleware/taskAuth.js` - Task specific middleware

**Güncellenecek Dosyalar:**
- `server.js` - Yeni API routes
- `models/Project.js` - Virtual relations (opsiyonel)
- `middleware/auth.js` - Yeni helper functions (gerekirse)

---

## 🔄 BÖLÜM 2 ÖN PLANI (Referans)

### Hedef
Room.ejs'e interaktif Kanban tahtası entegrasyonu

### Ana Gereksinimler
- SortableJS entegrasyonu
- Socket.IO ile real-time synchronization
- Skills-based assignment interface
- Responsive design

### Teknik Hazırlık
- Frontend JS için `kanban.js` modülü
- CSS için `_kanban.scss` komponenti
- Socket event handlers genişletmesi

---

## 🔄 BÖLÜM 3 ÖN PLANI (Referans)

### Hedef
BPMN.io iş akışı editörü entegrasyonu

### Ana Gereksinimler
- bpmn-js kütüphanesi entegrasyonu
- BPMNDiagram model ve API'leri
- Real-time collaboration
- XML data persistence

---

## 📊 BAŞARI KRİTERLERİ

### Bölüm 1 İçin:
- [ ] Task modeli başarıyla oluşturuldu ve test edildi
- [ ] Tüm CRUD API'leri çalışır durumda
- [ ] Yetkilendirme sistemi düzgün çalışıyor
- [ ] Error handling comprehensive
- [ ] Manuel testler %100 başarılı

### Genel Faz 2 İçin:
- [ ] Profil yönetimi tam işlevsel ✅
- [ ] Task yönetimi altyapısı hazır
- [ ] Kanban tahtası interaktif ve real-time
- [ ] BPMN editörü entegre ve kullanılabilir

---

## 🚨 RİSKLER VE ÖNLEMLER

### Teknik Riskler:
1. **Database Performance:** Task sayısı artınca sorgu performansı
   - **Önlem:** Indexing strategy, pagination hazırlığı

2. **Real-time Synchronization:** Çok sayıda eş zamanlı kullanıcı
   - **Önlem:** Event throttling, optimistic updates

3. **Third-party Dependencies:** SortableJS, bpmn-js uyumluluğu
   - **Önlem:** Version pinning, fallback strategies

### Zaman Riskleri:
1. **Scope Creep:** Özellik eklemelerinin planı bozması
   - **Önlem:** Katı plan takibi, phase gates

2. **Integration Complexity:** Mevcut sistemle entegrasyon zorlukları
   - **Önlem:** Incremental development, early testing

---

## 📝 NOTLAR

### Mimari Kararlar:
- Route'lar server.js'de merkezi tutulacak (routes klasörü yok)
- CSS modüler SCSS yapısı korunacak
- MongoDB + Mongoose pattern sürdürülecek
- Socket.IO altyapısı genişletilecek

### Bağımlılıklar:
- Bölüm 1 → Bölüm 2 (Task model → Kanban UI)
- Bölüm 2 → Bölüm 3 (UI framework → BPMN integration)

### Referanslar:
- [FAZ2_DURUM_RAPORU.md](./FAZ2_DURUM_RAPORU.md) - Güncel durum takibi
- [FAZ1_FINAL_RAPOR.md](./FAZ1_FINAL_RAPOR.md) - Önceki faz deneyimleri

---

*Doküman Sahibi: Development Team*  
*Son Güncelleme: 8 Haziran 2025, 15:00*
