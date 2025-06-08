# FAZ 2 - BÖLÜM 1: GÖREV YÖNETİMİ ALTYAPIsı
## Detaylı İmplementasyon Rehberi
*Başlangıç: 8 Haziran 2025, 15:00*

---

## 🎯 BÖLÜM 1 HEDEF ve ÖZETİ

**Ana Görev:** Kanban tahtasının temelini oluşturacak görev yönetimi altyapısını kurmak.

**Kapsamı:**
1. `Task` modelini oluşturmak
2. 6 temel Task API endpoint'ini `server.js`'e eklemek
3. Yetkilendirme kontrollerini yapmak
4. API testlerini gerçekleştirmek

**Başarı Kriterleri:**
- [x] Task modeli MongoDB'de çalışır durumda
- [x] CRUD API'ler çalışıyor ve test edildi
- [x] Sadece proje üyeleri API'lere erişebiliyor
- [x] Socket.IO entegrasyonu temel düzeyde hazır

---

## 📋 ADIM ADIM İMPLEMENTASYON

### ADIM 1: TASK MODELİ OLUŞTURMA

**Dosya:** `models/Task.js`

**Schema Detayları:**
```javascript
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
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
    dueDate: {
        type: Date
    },
    requiredSkills: [{
        type: String,
        trim: true
    }],
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexler (Performans için)
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Task', taskSchema);
```

**✅ Tamamlama Kontrolü:**
- Schema tanımlandı ✓
- Validation kuralları eklendi ✓
- İndeksler tanımlandı ✓
- Model export edildi ✓
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  requiredSkills: [{
    type: String,
    trim: true
  }],
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ project: 1, order: 1 });

module.exports = mongoose.model('Task', TaskSchema);
```

#### Validation ve Middleware:
- Required field validations
- String length validations  
- Enum validations
- Custom validation functions (gerekirse)

### ADIM 2: API Endpoint'leri Oluşturma
**Dosya:** `server.js`  
**Konum:** Project routes'dan sonra  
**Öncelik:** YÜKSEK  
**Tahmini Süre:** 4-5 saat

#### Route Bloğu Başlığı:
```javascript
// ==============================================
// TASK API ROUTES
// ==============================================
```

#### Endpoint'ler Listesi:
1. `GET /projects/:projectId/tasks` - Proje görevlerini listele
2. `POST /projects/:projectId/tasks` - Yeni görev oluştur  
3. `GET /projects/:projectId/tasks/:taskId` - Görev detayı
4. `PUT /projects/:projectId/tasks/:taskId` - Görev güncelle
5. `DELETE /projects/:projectId/tasks/:taskId` - Görev sil
6. `PUT /projects/:projectId/tasks/:taskId/status` - Durum güncelle
7. `PUT /projects/:projectId/tasks/:taskId/assign` - Görev atama

#### Örnek Endpoint Implementation:
```javascript
// GET /projects/:projectId/tasks - List project tasks
app.get('/projects/:projectId/tasks', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;
    
    // Check project membership
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const isMember = project.members.some(member => 
      member.user.toString() === req.session.user.id &&
      ['owner', 'editor'].includes(member.role)
    );
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Build query
    const query = { project: projectId };
    if (status) query.status = status;
    
    // Get tasks
    const tasks = await Task.find(query)
      .populate('assignedTo', 'username email skills')
      .populate('createdBy', 'username email')
      .sort({ order: 1, createdAt: -1 });
    
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
```

### ADIM 3: Middleware Geliştirmeleri
**Dosya:** `middleware/auth.js` (gerekirse yeni functions)  
**Öncelik:** ORTA  
**Tahmini Süre:** 2 saat

#### Yeni Helper Functions:
```javascript
// Check if user is project member with specific roles
const checkProjectMembership = (allowedRoles = ['owner', 'editor']) => {
  return async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const member = project.members.find(m => 
        m.user.toString() === req.session.user.id
      );
      
      if (!member || !allowedRoles.includes(member.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      req.project = project;
      req.userRole = member.role;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  };
};
```

### ADIM 4: Error Handling ve Validation
**Öncelik:** ORTA  
**Tahmini Süre:** 2 saat

#### Error Response Formatı:
```javascript
// Standardized error responses
const sendError = (res, status, message, details = null) => {
  const response = { 
    error: message,
    timestamp: new Date().toISOString()
  };
  if (details) response.details = details;
  res.status(status).json(response);
};
```

#### Validation Functions:
```javascript
// Task data validation
const validateTaskData = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (data.title && data.title.length > 100) {
    errors.push('Title cannot exceed 100 characters');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }
  
  if (data.status && !['todo', 'in-progress', 'done'].includes(data.status)) {
    errors.push('Invalid status value');
  }
  
  return errors;
};
```

---

## 🧪 TEST STRATEJİSİ

### Manuel Test Senaryoları:

#### Test 1: Task Oluşturma
```bash
# Valid task creation
curl -X POST http://localhost:3000/projects/[PROJECT_ID]/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "description": "Test description",
    "priority": "high",
    "requiredSkills": ["JavaScript", "Node.js"]
  }'
```

#### Test 2: Task Listeleme  
```bash
# List all tasks
curl http://localhost:3000/projects/[PROJECT_ID]/tasks

# Filter by status
curl http://localhost:3000/projects/[PROJECT_ID]/tasks?status=todo
```

#### Test 3: Task Güncelleme
```bash
# Update task status
curl -X PUT http://localhost:3000/projects/[PROJECT_ID]/tasks/[TASK_ID]/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

#### Test 4: Yetkilendirme Testleri
```bash
# Test unauthorized access
curl http://localhost:3000/projects/[OTHER_PROJECT_ID]/tasks
# Should return 403 Forbidden
```

---

## ✅ BAŞARI KRİTERLERİ

### Teknik Kriterler:
- [ ] Task modeli başarıyla oluşturuldu
- [ ] Tüm CRUD endpoint'leri çalışıyor
- [ ] Populate relationships düzgün çalışıyor
- [ ] Validation kuralları uygulanıyor
- [ ] Error handling comprehensive
- [ ] Yetkilendirme sistemi çalışıyor

### Fonksiyonel Kriterler:
- [ ] Proje üyeleri görevleri görebiliyor
- [ ] Sadece authorized users görev oluşturabiliyor
- [ ] Task durumları değiştirilebiliyor
- [ ] Görev atama çalışıyor
- [ ] Skill-based filtering hazır

### Performance Kriterler:
- [ ] Database queries optimize edildi
- [ ] Index'ler uygun şekilde eklendi
- [ ] Response time'lar kabul edilebilir

---

## 🚨 POTANSIYEL SORUNLAR VE ÇÖZÜMLER

### Sorun 1: Performance Issues
**Belirti:** Görev listesi yavaş yükleniyor  
**Çözüm:** Pagination ekle, query optimization

### Sorun 2: Authorization Complexity
**Belirti:** Karmaşık permission logic  
**Çözüm:** Middleware functions'ı basitleştir

### Sorun 3: Data Validation Errors
**Belirti:** Invalid data geçiyor  
**Çözüm:** Schema validation'ı güçlendir

---

## 📝 IMPLEMENTATION CHECKLIST

### Pre-Implementation:
- [ ] Mevcut code base review edildi
- [ ] Dependencies kontrol edildi
- [ ] Test environment hazır

### During Implementation:
- [ ] Task model oluşturuldu
- [ ] API endpoints yazıldı
- [ ] Middleware functions eklendi
- [ ] Error handling implementasyonu
- [ ] Basic testing yapıldı

### Post-Implementation:
- [ ] Comprehensive testing
- [ ] Documentation güncellendi
- [ ] Code review yapıldı
- [ ] Next phase için hazırlık

---

## 🔄 NEXT STEPS (Bölüm 2 Hazırlığı)

### Frontend Hazırlık:
- UI mockup'ları hazırla
- SortableJS integration planla
- Socket.IO events tasarla

### Integration Points:
- Room.ejs integration noktalarını belirle
- CSS component'leri planla
- Real-time sync strategy

---

*Bu rehber, Bölüm 1'in sistematik ve hatasız implementasyonu için hazırlanmıştır.*  
*Son Güncelleme: 8 Haziran 2025*
