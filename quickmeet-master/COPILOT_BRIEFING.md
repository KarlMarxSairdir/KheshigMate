# COPILOT BRIEFING DOKÜMANI - KAŞIKMATE PROJESİ
*Copilot Chat için Kapsamlı Proje Briefing'i*  
*Son Güncelleme: 8 Haziran 2025, 15:00*
*Mevcut Faz: 2 - Görev Yönetimi Altyapısı*

---

## 📋 BU DOKÜMANI NASIL KULLANILIR?

Bu doküman, Copilot'a projenin tüm bağlamını, geçmişini, mevcut durumunu ve gelecek planlarını tek seferde aktarmak için hazırlanmıştır. Yeni bir Copilot chat session'ına aşağıdaki metni kopyalayıp yapıştırarak başlayın.

---

## 📢 COPİLOT CHAT'E YAPIŞTIRILACAK METİN

```
@workspace Merhaba Copilot! Kaşıkmate projemizin kapsamlı bir durumunu ve detaylı yol haritasını seninle paylaşıyorum. Bu doküman, projenin başından itibaren tüm mantığını, tamamlanan adımları, mevcut konumumuzu ve Faz 2'nin tüm detaylarını içermektedir. Lütfen bu planı bir referans olarak kullanarak sonraki adımlarda bana destek ol.

---

**KAŞIKMATE - KAPSAMLI PROJE DURUMU VE DETAYLI YOL HARİTASI**

**1. PROJE VİZYONU VE MİMARİSİ**

* **Vizyon:** Kaşıkmate, kullanıcıların projeler üzerinde işbirliği yapabildiği; gerçek zamanlı iletişim (Video, Chat, Çizim), proje bazlı not alma, iş akışı yönetimi (BPMN), görev yönetimi ve dağıtımı (Kanban, kullanıcı yetkinliklerine dayalı, AI destekli), proje zaman çizelgesi (Gantt) ve takvim özellikleri sunmayı hedefleyen, local ağ üzerinde çalışacak bir web uygulamasıdır.

* **Teknoloji Mimarisi:**
  * **Backend:** Node.js, Express.js
  * **Gerçek Zamanlı:** Socket.IO, PeerJS (WebRTC için)
  * **Veritabanı:** MongoDB (Mongoose ODM ile)
  * **Frontend:** EJS Templating, Vanilla JavaScript, SCSS (Modüler yapı: `base`, `components`, `pages`)
  * **Authentication:** `express-session` ve `bcryptjs` ile manuel oturum yönetimi.
  * **Routing Mimarisi:** Tüm route tanımlamaları (`app.get`, `app.post` vb.) merkezi olarak ana `server.js` dosyasında yönetilmektedir.

---

**2. TAMAMLANAN AŞAMALARIN ÖZETİ**

**✅ FAZ 1: TEMEL ALTYAPI VE KULLANICI YÖNETİMİ (TAMAMLANDI)**

Bu fazda, uygulamanın temel taşları döşendi.
* **Kullanıcı Yönetimi:** `User` modeli (`username`, `email`, `password`, `skills`) oluşturuldu. Kullanıcılar kayıt olup giriş yapabiliyor.
* **Proje Yönetimi:** `Project` modeli (`name`, `members` dizisinde rollerle birlikte: `owner`, `editor`) oluşturuldu. Proje oluşturma, listeleme ve üye ekleme altyapısı kuruldu.
* **Veri Kalıcılığı:** `ChatMessage`, `ProjectNote` (`Note.js`), ve `DrawingData` modelleri ile tüm anlık iletişim verileri proje bazlı olarak MongoDB'ye kaydediliyor ve yükleniyor.
* **Gerçek Zamanlı İletişim:** Socket.IO ve PeerJS ile proje bazlı odalarda Video, Chat, Çizim ve Ekran Paylaşımı temel düzeyde çalışır durumda.
* **CSS Mimarisi:** Stil yönetimi, tek ve büyük bir dosyadan, modüler ve bakımı kolay bir SCSS yapısına geçirildi.

**✅ FAZ 2 - BÖLÜM 0: KULLANICI PROFİLİ VE NAVİGASYON YÖNETİMİ (TAMAMLANDI)**

* **Kullanıcı Profil Yönetimi:** `/profile` endpoint'i ile modern card-based UI oluşturuldu. Kullanıcılar e-posta, şifre ve özellikle yetkinlik bazlı görev dağıtımı için kritik olan `skills` alanını güncelleyebiliyor.
* **Navigation Dropdown:** Tüm sayfalarda (`dashboard.ejs`, `profile.ejs`, `project-settings.ejs`) dinamik dropdown menü sistemi entegre edildi. Inline CSS ve onclick attribute'larından temizlenip modern EventListener pattern'ına geçildi.
* **CSS Mimarisi İyileştirmeleri:** User-dropdown component oluşturuldu, CSS variable circular references düzeltildi, !important rule'ları temizlendi.
* **JavaScript Event Handling:** Dropdown functionality, page detection logic, global error handling sistemleri geliştirildi.

---

**3. MEVCUT KONUM VE FAZ 2 EYLEM PLANI**

**✅ FAZ 2 - BÖLÜM 1: GÖREV YÖNETİMİ MODELİ VE TEMEL API'LER (TAMAMLANDI)**

* **Task Model Oluşturuldu:** `models/Task.js` dosyası tam kapsamlı task model'i ile oluşturuldu. Schema içeriği: `title`, `description`, `status` (todo/in-progress/done), `project` ref, `assignedTo`, `createdBy`, `priority`, `dueDate`, `requiredSkills`, `order`.
* **Task CRUD API'ları:** 6 adet complete endpoint eklendi: Create, Read, Update, Delete, Status Update, Assign Task.
* **Authorization:** Tüm endpoint'ler proje üyelik kontrolü ve yetkilendirme sistemi ile güvenli hale getirildi.
* **Database Performance:** Task model için uygun index'ler (project, assignedTo, createdBy) eklendi.

**✅ FAZ 2 - BÖLÜM 2: KANBAN TAHTASI UI GELİŞTİRME (TAMAMLANDI)**

* **Kanban UI Implementation:** `room.ejs`'e complete Kanban board HTML yapısı eklendi (3-column layout, task cards, modal).
* **CSS Architecture:** `_kanban.scss` modern responsive tasarım dosyası oluşturuldu, ana `style.scss`'e entegre edildi.
* **JavaScript Functionality:** `kanban.js` ile complete drag-and-drop, task CRUD operations, real-time updates, modal management implementasyonu.
* **Backend Integration:** Project details API endpoint eklendi, room.js tab sistemi güncellendi.
* **Testing:** CSS syntax hataları düzeltildi, browser'da test edildi, hatasız çalışır durumda.

---

**3. MEVCUT KONUM VE FAZ 2 EYLEM PLANI**

**📍 MEVCUT KONUMUMUZ: FAZ 2 - BÖLÜM 3'ÜN BAŞLANGICI**

Kanban temel altyapısı ve UI'ı tamamlandı. Şimdi sırada skills-based görev atama algoritmaları ve gelişmiş Kanban özelliklerinin implementasyonu var.

---

**📝 FAZ 2'NİN KALAN TÜM SÜREÇLERİ (DETAYLI PLAN):**

**BÖLÜM 3: SKILLS-BASED TASK ASSIGNMENT ALGORITHMS (ŞİMDİKİ GÖREV)**

* **Hedef:** Kullanıcı yetkinliklerine dayalı akıllı görev atama sistemi geliştirmek.

* **Teknik İsterler:**
  1. **Yeni `Task` Modeli (`models/Task.js`):** 
     ```javascript
     {
       title: String (required),
       description: String,
       status: String (enum: ['todo', 'in-progress', 'done'], default: 'todo'),
       project: ObjectId (ref: 'Project', required),
       assignedTo: ObjectId (ref: 'User'),
       createdBy: ObjectId (ref: 'User', required),
       priority: String (enum: ['low', 'medium', 'high'], default: 'medium'),
       dueDate: Date,
       requiredSkills: [String],  // User.skills ile eşleşecek
       order: Number (sürükle-bırak sıralaması için),
       timestamps: true
     }
     ```
  
  2. **Yeni Görev API'leri (`server.js` içine):** 
     - `POST /projects/:projectId/tasks` - Yeni görev oluştur
     - `GET /projects/:projectId/tasks` - Proje görevlerini listele
     - `PUT /projects/:projectId/tasks/:taskId` - Görevi güncelle  
     - `DELETE /projects/:projectId/tasks/:taskId` - Görevi sil
     - `PUT /projects/:projectId/tasks/:taskId/status` - Görev durumu güncelle (Kanban sürükle-bırak için)
     - `PUT /projects/:projectId/tasks/:taskId/assign` - Görev atama (skills matching için)
  
  3. **Yetkilendirme:** Tüm endpoint'ler `middleware/auth.js` ile korunacak. Sadece proje üyeleri (`owner` veya `editor`) erişebilecek. Görev oluşturma/düzenleme/silme yetkileri kontrol edilecek.

**BÖLÜM 2: KANBAN TAHTASI ARAYÜZÜ VE ETKİLEŞİMİ (SONRAKİ ADIM)**

* **Hedef:** `views/room.ejs` içine interaktif, gerçek zamanlı ve yetkinlik bazlı bir Kanban tahtası entegre etmek.

* **Teknik İsterler:**
  1. **Arayüz (`views/room.ejs` ve `_room.scss`):** "Yapılacak", "Yapılıyor", "Tamamlandı" sütunlarını içeren bir Kanban layout'u eklenecek.
  2. **Görev Dağıtımı:** Görev oluşturma/düzenleme modal'ında, proje üyelerini ve skills bilgilerini gösteren atama sistemi.
  3. **Sürükle-Bırak:** **SortableJS** kütüphanesi entegre edilecek.
  4. **Anlık Senkronizasyon (Socket.IO):** Görevlerdeki değişikliklerin tüm üyelere anlık yansıtılması.

**BÖLÜM 3: BPMN.IO ENTEGRASYONU (SONRAKİ ADIM)**

* **Hedef:** Proje çalışma alanına, iş akışlarının görsel olarak oluşturulup yönetilebileceği bir BPMN editörü entegre etmek.

* **Teknik İsterler:**
  1. **Yeni `BPMNDiagram` Modeli (`models/BPMNDiagram.js`):** `xmlData`, `project`, `lastUpdatedBy` alanları.
  2. **Yeni BPMN API'leri (`server.js` içine):** `GET /projects/:projectId/bpmn` ve `POST /projects/:projectId/bpmn`.
  3. **Arayüz Entegrasyonu:** **bpmn-js** kütüphanesi ile BPMN editörü.

---

**4. MEVCUT DOSYA YAPISI VE TEKNİK ALTYAPI**

**📁 Proje Dosya Organizasyonu:**
```
quickmeet-master/
├── server.js                 # Ana sunucu + TÜM routes burada
├── expressApp.js             # Express app konfigürasyonu  
├── models/                   # Mongoose modelleri
│   ├── User.js              # ✅ Kullanıcı modeli (skills dahil)
│   ├── Project.js           # ✅ Proje modeli (members + roles)
│   ├── ChatMessage.js       # ✅ Chat mesajları
│   ├── Note.js              # ✅ Proje notları (ProjectNote)
│   ├── DrawingData.js       # ✅ Çizim verileri
│   └── Task.js              # 🎯 SIRADAKİ: Görev modeli
├── middleware/
│   └── auth.js              # ✅ Authentication middleware
├── views/                   # EJS şablonları
│   ├── dashboard.ejs        # ✅ Ana dashboard (dropdown entegre)
│   ├── room.ejs            # ✅ Proje çalışma alanı
│   ├── profile.ejs         # ✅ Kullanıcı profili (modern cards)
│   └── project-settings.ejs # ✅ Proje ayarları (dropdown entegre)
└── public/
    ├── css/                 # ✅ Modüler SCSS yapısı
    │   ├── style.scss       # Ana stil dosyası
    │   ├── style.css        # Compiled CSS (v8.0.0)
    │   ├── base/           # _variables.scss, _global.scss
    │   ├── components/     # _cards.scss, _buttons.scss, _user-dropdown.scss
    │   └── pages/          # Sayfa özel stilleri
    └── js/                 # Frontend JavaScript
        ├── dashboard.js    # ✅ Dashboard + dropdown funktions
        ├── room.js        # Proje odası fonksiyonları
        └── auth.js        # ⚠️ Authentication JS (çakışma var)
```

**📊 Mevcut Veritabanı Modelleri:**
```javascript
// ✅ User Model (Kullanıcı)
{
  username: String,
  email: String, 
  password: String (bcrypt hashed),
  skills: [String]  // 🎯 Görev dağıtımı için kritik
}

// ✅ Project Model (Proje)
{
  name: String,
  members: [{ 
    user: ObjectId (ref: 'User'),
    role: String  // 'owner' veya 'editor'
  }]
}

// ✅ Diğer Modeller: ChatMessage, Note, DrawingData
// Her biri project: ObjectId field'ı ile proje bazlı çalışıyor
```

**🔧 Mevcut Teknik Altyapi:**
- ✅ Express.js + EJS templating engine çalışır durumda
- ✅ MongoDB + Mongoose ODM yapılandırılmış
- ✅ Socket.IO gerçek zamanlı iletişim altyapısı kurulu
- ✅ Authentication middleware (`express-session` + `bcryptjs`) çalışıyor
- ✅ CSS modüler yapı (SCSS → CSS compilation) hazır
- ✅ Modern UI dropdown navigation sistemi entegre

---

**5. GELECEK VİZYONU (FAZ 3 VE SONRASI)**

* **FAZ 3:** Gantt şeması, takvim entegrasyonu ve AI destekli görev önerisi.
* **FAZ 4 & 5:** UX/UI iyileştirmeleri, bildirim sistemi, dosya paylaşımı.

---

**ŞİMDİKİ GÖREVİMİZ - BAŞLANGIÇ NOKTASI:**

🎯 **ODAK:** Faz 2 - Bölüm 1: Görev Yönetimi Modeli ve Temel API'ler

📋 **İLK ADIM:** `models/Task.js` dosyasını yukarıda belirtilen schema ile oluşturmak ve `server.js` dosyasına temel CRUD API endpoint'lerini eklemek.

🚀 **BAŞARILI TAMAMLAMA KRİTERLERİ:**
- [ ] Task modeli oluşturuldu ve MongoDB'ye kayıt/okuma test edildi  
- [ ] 6 temel endpoint çalışır durumda (`POST`, `GET`, `PUT`, `DELETE`, status update, assign)
- [ ] Yetkilendirme kontrolleri doğru çalışıyor (sadece proje üyeleri erişebiliyor)
- [ ] API'ler Postman/frontend ile test edildi
- [ ] Socket.IO ile gerçek zamanlı task güncellemeleri mümkün

💡 **ÖNEMLİ HATIRLATMALAR:**
- Tüm route'lar `server.js` dosyasında tanımlanır (ayrı routes klasörü yok)
- `middleware/auth.js` authentication kontrolü için kullanılır
- Task model'de `requiredSkills` field'ı, User model'deki `skills` array'i ile match edilecek
- Her API endpoint'i project member kontrolü yapmalı (`owner` veya `editor` rolü)

---

**6. TEKNİK BORÇLAR VE BİLİNEN SORUNLAR**

⚠️ **Mevcut Teknik Borçlar:**
- **CSS Styling Issues:** Modern card designs'ta beyaz background problemi mevcut
- **auth.js Conflict:** `/public/js/auth.js` ile `/middleware/auth.js` çakışması var
- **UI/UX Polish:** Profile page modern cards tam responsive değil

📌 **Faz 2 Sonrası Ele Alınacak:**
- Kapsamlı UI/UX iyileştirmeleri
- CSS çakışma problemlerinin çözümü  
- Responsive design optimization
- Performance optimization

---

**7. BAĞIMLILIKLAR VE KÜTÜPHANELER**

**✅ Mevcut:**
- `express`, `mongoose`, `express-session`, `socket.io`, `bcryptjs`, `multer`
- `ejs` (templating), SCSS compilation setup

**🎯 Eklenecek (Faz 2 ilerledikçe):**
- `sortablejs` (Kanban sürükle-bırak için)
- `bpmn-js` (BPMN editörü için)
- Potansiyel: `moment.js` veya `date-fns` (tarih işlemleri için)
```

---

## 📝 COPILOT KULLANIM TALİMATLARI

### 1. Yeni Session Başlatırken:
- Yukarıdaki metni tam olarak kopyalayın
- Copilot Chat'e yapıştırın
- Projenin tüm konteksti yüklenmiş olur

### 2. Devam Eden Session'larda:
- Bu dokümanı referans olarak kullanın
- Spesifik sorular için ilgili bölümleri hatırlatın
- Plan değişikliklerini bu dokümana yansıtın

### 3. Güncellemeler:
- Her major milestone sonrası bu dokümanı güncelleyin
- Yeni özellikler eklendiğinde "Tamamlanan Aşamalar" bölümünü genişletin
- Plan değişikliklerini "Mevcut Konum" ve "Eylem Planı" bölümlerinde yansıtın

---

## 🔄 DOKÜMAN GÜNCELLEME TAKVİMİ

- **8 Haziran 2025, 15:00:** Kapsamlı briefing güncellemesi tamamlandı
- **Bölüm 1 Tamamlandığında:** Task API implementation success report eklenecek
- **Bölüm 2 Tamamlandığında:** Kanban UI implementation detayları eklenecek  
- **Bölüm 3 Tamamlandığında:** BPMN integration detayları eklenecek
- **Faz 2 Bitiminde:** Final recap ve Faz 3 detaylı planlaması yapılacak

---

**📋 COPILOT KULLANIM REHBERİ**

✅ **Yeni Session Başlatırken:**
1. `@workspace` komutunu kullan
2. "Kaşıkmate projesinin Faz 2 Bölüm 1 görevlerine başlayacağız" şeklinde belirt
3. Bu briefing dokümanını referans olarak kullan

✅ **Devam Eden Session'larda:**  
- Specific sorular için ilgili bölümleri hatırlat
- Plan değişikliklerini kayıt altına al
- Başarı kriterlerini takip et

✅ **Her Major Milestone Sonrası:**
- Bu dokümanı güncelle
- Tamamlanan görevleri ✅ işaretle
- Karşılaşılan problemleri "Teknik Borçlar" bölümüne ekle
