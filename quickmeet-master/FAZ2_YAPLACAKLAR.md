# FAZ 2 İMPLEMENTASYON PLANI - GELİŞMİŞ GÖREV YÖNETİMİ
*Başlangıç Tarihi: 8 Haziran 2025*

## 🎯 FAZ 2 GENEL HEDEFLERİ

Bu faz, Kaşıkmate projesini basit proje yönetiminden **gelişmiş görev yönetimi** ve **iş akışı sistemine** dönüştürecek. Kullanıcılar artık:
- Detaylı profil yönetimi yapabilecek
- Kanban tahtası ile görevleri organize edebilecek  
- BPMN diyagramları ile iş akışları oluşturabilecek

---

## 📋 BÖLÜM-BÖLÜM DETAYLI PLAN

### BÖLÜM 0: KULLANICI PROFİLİ YÖNETİMİ ✅ (TAMAMLANDI)
**Durum:** %100 Tamamlandı  
**Tamamlanma Tarihi:** 8 Haziran 2025

#### Başarılı Çıktılar:
- Modern profil yönetimi arayüzü
- Skill sistemi (dynamik ekleme/çıkarma)
- Güvenli şifre değiştirme
- Card-based responsive UI

---

### BÖLÜM 1: KANBAN BOARD LAYOUT DÜZELTMELERİ ✅ (TAMAMLANDI)
**Başlangıç:** 8 Haziran 2025  
**Tamamlanma:** 8 Haziran 2025  
**Durum:** %100 Tamamlandı

#### Başarılı Çıktılar:
- Grid layout oranları düzeltildi (Video %60 + Kanban %40)
- Responsive breakpoint'ler optimize edildi
- Kanban board padding/margin değerleri iyileştirildi
- Horizontal scrolling sorunu çözüldü
- CSS derlemesi tamamlandı

---

### BÖLÜM 2: GELİŞMİŞ GÖREV YÖNETİM SİSTEMİ 🔧 (SONRAKİ HEDEF)
**Başlangıç:** 8 Haziran 2025  
**Hedef Tamamlanma:** 10 Haziran 2025  
**Tahmini Süre:** 2-3 gün

#### 2.1 Task Modeli Oluşturma (`models/Task.js`)
```javascript
// Planlanmış Schema Yapısı:
{
  title: String (required),
  description: String,
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  project: { type: ObjectId, ref: 'Project', required: true },
  assignedTo: { type: ObjectId, ref: 'User' },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  dueDate: Date,
  tags: [String],
  estimatedHours: Number,
  actualHours: Number,
  position: Number, // Kanban'da sıralama için
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### 1.2 API Endpoint'leri (`expressApp.js` içine eklenecek)
**Yeni Route Bloğu:** `// --- Task Management API Routes ---`

**Planlanmış Endpoint'ler:**
- `POST /projects/:projectId/tasks` - Yeni görev oluşturma
- `GET /projects/:projectId/tasks` - Proje görevlerini listeleme
- `PUT /projects/:projectId/tasks/:taskId` - Görev güncelleme
- `DELETE /projects/:projectId/tasks/:taskId` - Görev silme
- `PUT /projects/:projectId/tasks/:taskId/status` - Görev durum değiştirme
- `PUT /projects/:projectId/tasks/:taskId/assign` - Görev atama

#### 1.3 İlişkisel Veri Yapısı
- **Project ↔ Task:** One-to-Many ilişkisi
- **User ↔ Task:** Many-to-Many (assignedTo, createdBy)
- **Skill-based Assignment:** User skills ile task requirements eşleştirmesi

#### 1.4 Validasyon ve Güvenlik
- **Auth Middleware:** Tüm task API'leri kimlik doğrulama gerektirecek
- **Project Access Control:** Sadece proje üyeleri görevleri yönetebilecek
- **Owner Permissions:** Proje sahibi tüm yetkilere sahip olacak

---

### BÖLÜM 2: KANBAN TAHTASI ARAYÜZÜ VE ETKİLEŞİMİ 🔄
**Başlangıç:** 10 Haziran 2025  
**Hedef Tamamlanma:** 13 Haziran 2025  
**Tahmini Süre:** 3-4 gün

#### 2.1 UI/UX Tasarımı (`views/room.ejs` güncellemesi)
**Kanban Layout Planı:**
```html
<!-- Planlanmış Kanban Yapısı -->
<div class="kanban-board">
  <div class="kanban-column" data-status="todo">
    <div class="column-header">📋 Yapılacaklar</div>
    <div class="task-cards-container" id="todo-tasks"></div>
  </div>
  <div class="kanban-column" data-status="in-progress">
    <div class="column-header">⚡ Devam Eden</div>
    <div class="task-cards-container" id="progress-tasks"></div>
  </div>
  <div class="kanban-column" data-status="review">
    <div class="column-header">👁️ İnceleme</div>
    <div class="task-cards-container" id="review-tasks"></div>
  </div>
  <div class="kanban-column" data-status="done">
    <div class="column-header">✅ Tamamlanan</div>
    <div class="task-cards-container" id="done-tasks"></div>
  </div>
</div>
```

#### 2.2 Sürükle-Bırak Functionality (SortableJS)
**Teknoloji:** SortableJS kütüphanesi  
**Özellikler:**
- Cross-column task taşıma
- Position/order kaydetme
- Gerçek zamanlı senkronizasyon
- Touch device desteği

#### 2.3 Task Card Component
**Card İçeriği:**
- Task başlığı ve açıklaması
- Atanan kullanıcı avatarı
- Öncelik badge'i (low/medium/high/critical)
- Due date countdown
- Progress indicator
- Quick action buttons (edit, delete, assign)

#### 2.4 Görev Yönetimi Modal'ları
- **Create Task Modal:** Yeni görev oluşturma
- **Edit Task Modal:** Görev düzenleme
- **Assign Task Modal:** Kullanıcı atama (skill-based)
- **Task Details Modal:** Detaylı görüntüleme

#### 2.5 Skill-Based Assignment System
**Özellik:** Görev gereksinimleri ile kullanıcı yeteneklerini eşleştirme
- Task'a gerekli skill'ler tanımlanabilecek
- Assignment sırasında uygun kullanıcılar önerilecek
- Skill match score gösterilecek

---

### BÖLÜM 3: BPMN.IO ENTEGRASYONU VE İŞ AKIŞI YÖNETİMİ 🔄
**Başlangıç:** 13 Haziran 2025  
**Hedef Tamamlanma:** 15 Haziran 2025  
**Tahmini Süre:** 2-3 gün

#### 3.1 BPMN Modeli (`models/BPMNDiagram.js`)
```javascript
// Planlanmış Schema:
{
  name: String (required),
  description: String,
  xmlData: String (required), // BPMN XML content
  project: { type: ObjectId, ref: 'Project', required: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: ObjectId, ref: 'User' },
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  metadata: {
    processElements: Number,
    gateways: Number,
    tasks: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### 3.2 BPMN API'leri (`expressApp.js` içine eklenecek)
**Yeni Route Bloğu:** `// --- BPMN Workflow API Routes ---`

**Planlanmış Endpoint'ler:**
- `GET /projects/:projectId/bpmn` - BPMN diyagramlarını listele
- `POST /projects/:projectId/bpmn` - Yeni BPMN diyagramı oluştur
- `PUT /projects/:projectId/bpmn/:diagramId` - BPMN güncelle
- `DELETE /projects/:projectId/bpmn/:diagramId` - BPMN sil
- `GET /projects/:projectId/bpmn/:diagramId/xml` - XML data al

#### 3.3 BPMN.js Editör Entegrasyonu
**Teknoloji:** bpmn-js kütüphanesi  
**Özellikler:**
- Visual BPMN editörü
- Process modeling tools
- XML import/export
- Custom BPMN elements (isteğe göre)

#### 3.4 Gerçek Zamanlı Collaboration
**Socket.IO Events:**
- `bpmn:join-editing` - Kullanıcı editöre katıldı
- `bpmn:element-changed` - Element değiştirildi
- `bpmn:diagram-saved` - Diyagram kaydedildi
- `bpmn:user-cursor` - Kullanıcı cursor pozisyonu

#### 3.5 Workflow-Task Integration
**Gelecek Özellik (Faz 3'te):**
- BPMN task'larını Kanban görevleri ile eşleştirme
- Process-driven task oluşturma
- Workflow status tracking

---

## 🛠️ TEKNİK REQUİREMENT'LAR

### Yeni Bağımlılıklar
```json
{
  "sortablejs": "^1.15.0",
  "bpmn-js": "^11.0.0",
  "uuid": "^9.0.0"
}
```

### Dosya Yapısı Değişiklikleri
```
quickmeet-master/
├── models/
│   ├── Task.js (YENİ)
│   └── BPMNDiagram.js (YENİ)
├── public/
│   ├── css/components/
│   │   ├── _kanban.scss (YENİ)
│   │   └── _bpmn.scss (YENİ)
│   └── js/
│       ├── kanban.js (YENİ)
│       └── bpmn.js (YENİ)
└── views/
    └── room.ejs (GÜNCELLENECEK)
```

### Veritabanı İndeksleri
```javascript
// Performans için eklenecek indeksler:
Task.createIndex({ project: 1, status: 1 });
Task.createIndex({ assignedTo: 1 });
Task.createIndex({ createdBy: 1 });
BPMNDiagram.createIndex({ project: 1 });
```

---

## 📊 BAŞARI KRİTERLERİ

### Bölüm 1 Kriterleri:
- [ ] Task modeli MongoDB'de oluşturulmuş
- [ ] Tüm CRUD API'leri çalışıyor
- [ ] Postman testleri %100 başarılı
- [ ] Project-Task ilişkisi kurulmuş

### Bölüm 2 Kriterleri:
- [ ] Kanban tahtası responsive çalışıyor
- [ ] Sürükle-bırak functionality çalışıyor
- [ ] Gerçek zamanlı senkronizasyon active
- [ ] Task assignment sistemi çalışıyor

### Bölüm 3 Kriterleri:
- [ ] BPMN editörü entegre edilmiş
- [ ] XML kaydetme/yükleme çalışıyor
- [ ] Multi-user editing destekleniyor
- [ ] Process versioning aktif

---

## ⚠️ RİSKLER VE MİTİGASYON

### Yüksek Risk:
1. **BPMN.js Complexity:** Öğrenme eğrisi yüksek
   - **Mitigation:** Basit örneklerle başlama, kademeli genişletme

2. **Real-time Conflict Resolution:** Aynı anda editing
   - **Mitigation:** Lock mechanism veya operational transform

### Orta Risk:
1. **Performance:** Çok sayıda task ile Kanban yavaşlayabilir
   - **Mitigation:** Pagination, lazy loading

2. **Mobile UX:** Sürükle-bırak mobilde zorlanabilir
   - **Mitigation:** Touch-friendly alternatives

---

## 📅 ZAMAN ÇİZELGESİ

```
8 Haz  |████████████| Bölüm 0 ✅ (Tamamlandı)
9 Haz  |████████████| Bölüm 1 Başlangıç
10 Haz |████████████| Bölüm 1 Devam
11 Haz |████████████| Bölüm 2 Başlangıç  
12 Haz |████████████| Bölüm 2 Devam
13 Haz |████████████| Bölüm 2 Bitiş / Bölüm 3 Başlangıç
14 Haz |████████████| Bölüm 3 Devam
15 Haz |████████████| Bölüm 3 Bitiş / Test & Debug
```

---

## 📋 SONRAKİ ADIMLAR (Bugün)

1. **İlk Görev:** `models/Task.js` oluşturmak
2. **İkinci Görev:** Task API endpoint'lerini `expressApp.js`'e eklemek
3. **Üçüncü Görev:** Temel CRUD işlemlerini test etmek

---

*Son Güncelleme: 8 Haziran 2025, 14:45*
