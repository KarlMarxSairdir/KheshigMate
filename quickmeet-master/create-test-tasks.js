const mongoose = require('mongoose');
const Task = require('./models/Task');

// MongoDB bağlantısı
mongoose.connect('mongodb://localhost:27017/quickmeet', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function createTestTasks() {
    // BU SCRIPT GEÇİCİ OLARAK DEVRE DIŞI BIRAKILDI
    // Sabit kodlanmış projectId nedeniyle Gantt şemasında hatalara yol açıyordu.
    // Yeniden etkinleştirmeden önce projectId'nin doğru ve geçerli olduğundan emin olun.
    try {
        console.log('🔄 Creating test tasks... (DEVRE DIŞI)');
        
        // Önce mevcut tüm görevleri temizle
        // await Task.deleteMany({}); // DEVRE DIŞI BIRAKILDI
        // console.log('🗑️ Cleared existing tasks (DEVRE DIŞI)');
        
        // Test görevleri oluştur
        const testTasks = [
            {
                title: 'Proje Planlama',
                description: 'Proje gereksinimlerini analiz et ve plan oluştur',
                status: 'todo',
                priority: 'high',
                startDate: new Date('2025-06-09'),
                dueDate: new Date('2025-06-15'),
                projectId: new mongoose.Types.ObjectId('6843b71886120f0a9f6fe07e'),
                createdBy: new mongoose.Types.ObjectId()
            },
            {
                title: 'UI/UX Tasarım',
                description: 'Kullanıcı arayüzü tasarımını oluştur',
                status: 'in-progress',
                priority: 'medium',
                startDate: new Date('2025-06-10'),
                dueDate: new Date('2025-06-20'),
                projectId: new mongoose.Types.ObjectId('6843b71886120f0a9f6fe07e'),
                createdBy: new mongoose.Types.ObjectId()
            },
            {
                title: 'Backend Geliştirme',
                description: 'API endpointlerini ve veritabanı yapısını oluştur',
                status: 'todo',
                priority: 'high',
                startDate: new Date('2025-06-12'),
                dueDate: new Date('2025-06-25'),
                projectId: new mongoose.Types.ObjectId('6843b71886120f0a9f6fe07e'),
                createdBy: new mongoose.Types.ObjectId()
            },
            {
                title: 'Frontend Geliştirme',
                description: 'React komponentlerini oluştur',
                status: 'todo',
                priority: 'medium',
                startDate: new Date('2025-06-16'),
                dueDate: new Date('2025-06-30'),
                projectId: new mongoose.Types.ObjectId('6843b71886120f0a9f6fe07e'),
                createdBy: new mongoose.Types.ObjectId()
            },
            {
                title: 'Test ve QA',
                description: 'Uygulamayı test et ve hataları düzelt',
                status: 'todo',
                priority: 'medium',
                startDate: new Date('2025-06-28'),
                dueDate: new Date('2025-07-05'),
                projectId: new mongoose.Types.ObjectId('6843b71886120f0a9f6fe07e'),
                createdBy: new mongoose.Types.ObjectId()
            },
            {
                title: 'Deployment',
                description: 'Uygulamayı production ortamına deploy et',
                status: 'todo',
                priority: 'high',
                startDate: new Date('2025-07-03'),
                dueDate: new Date('2025-07-08'),
                projectId: new mongoose.Types.ObjectId('6843b71886120f0a9f6fe07e'),
                createdBy: new mongoose.Types.ObjectId()
            }
        ];
        
        // Görevleri veritabanına ekle
        if (testTasks.length > 0) {
            // await Task.insertMany(testTasks); // DEVRE DIŞI BIRAKILDI
            // console.log(`✅ Successfully created ${testTasks.length} test tasks. (DEVRE DIŞI)`);
            console.log('ℹ️ Test task creation is currently disabled.');
        } else {
            console.log('No test tasks to create.');
        }
        
        console.log('\n📊 Summary:');
        console.log(`Total tasks: ${testTasks.length}`);
        console.log(`Project ID: 6843b71886120f0a9f6fe07e`);
        console.log('All tasks have proper start and due dates for Gantt chart');
        
    } catch (error) {
        console.error('❌ Error creating test tasks:', error);
    } finally {
        mongoose.connection.close();
    }
}

createTestTasks();
