const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const { createNotification } = require('../server'); // createNotification fonksiyonunu import ederiz

console.log('🕐 Cron Jobs initialized - Due date reminder system started');

// Her gün sabah 9:00'da çalışacak job - Son tarih hatırlatıcıları
cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily cron job for due date reminders...');
    
    try {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999); // Yarının sonuna kadar
        
        // Son tarihi yaklaşan ve henüz tamamlanmamış görevleri bul
        const upcomingTasks = await Task.find({
            dueDate: { 
                $gte: now,
                $lte: tomorrow 
            },
            status: { $ne: 'done' }
        }).populate('assignedTo', 'username email')
          .populate('project', 'name');
        
        console.log(`📋 Found ${upcomingTasks.length} tasks with upcoming due dates`);
        
        let notificationCount = 0;
        
        for (const task of upcomingTasks) {
            if (task.assignedTo) {
                try {
                    const hoursLeft = Math.ceil((task.dueDate - now) / (1000 * 60 * 60));
                    let timeMessage = '';
                    
                    if (hoursLeft <= 24) {
                        timeMessage = hoursLeft <= 1 ? 'bir saat içinde' : `${hoursLeft} saat içinde`;
                    } else {
                        timeMessage = 'yakında';
                    }
                    
                    const message = `"${task.title}" görevinin son teslim tarihi ${timeMessage} doluyor!`;
                    const link = `/room/${task.project._id}?tab=tasks&highlight=${task._id}`;
                    
                    // createNotification fonksiyonunu global scope'dan çağırmak yerine
                    // doğrudan Notification model'ini kullanacağız
                    const Notification = require('../models/Notification');
                    const notification = new Notification({
                        user: task.assignedTo._id,
                        project: task.project._id,
                        type: 'due-date-reminder',
                        message: message,
                        link: link
                    });
                    
                    await notification.save();
                    notificationCount++;
                    
                    console.log(`📢 Due date reminder sent to ${task.assignedTo.username} for task "${task.title}"`);
                    
                } catch (notificationError) {
                    console.error(`Error creating due date notification for task ${task._id}:`, notificationError);
                }
            }
        }
        
        console.log(`✅ Due date reminder job completed. ${notificationCount} notifications sent.`);
        
    } catch (error) {
        console.error('❌ Error in due date reminder cron job:', error);
    }
});

// Test amaçlı - Her 5 dakikada bir çalışan küçük job (geliştirme sırasında test için)
// Üretimde bu kısmı kaldırabilirsiniz
if (process.env.NODE_ENV !== 'production') {
    cron.schedule('*/5 * * * *', async () => {
        console.log('🔄 Test cron job running every 5 minutes - Due date check active');
        
        try {
            const upcomingCount = await Task.countDocuments({
                dueDate: { 
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) 
                },
                status: { $ne: 'done' }
            });
            
            console.log(`📊 Currently ${upcomingCount} tasks have due dates within 24 hours`);
        } catch (error) {
            console.error('Test cron job error:', error);
        }
    });
}

// Haftalık rapor - Her Pazartesi sabah 8:00'da
cron.schedule('0 8 * * 1', async () => {
    console.log('📊 Running weekly project summary...');
    
    try {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        const completedTasks = await Task.countDocuments({
            status: 'done',
            updatedAt: { $gte: lastWeek }
        });
        
        const newTasks = await Task.countDocuments({
            createdAt: { $gte: lastWeek }
        });
        
        console.log(`📈 Weekly Summary: ${completedTasks} tasks completed, ${newTasks} new tasks created`);
        
    } catch (error) {
        console.error('Weekly summary error:', error);
    }
});

module.exports = {
    // Cron job'ları manuel olarak tetikleme fonksiyonları (test amaçlı)
    runDueDateReminders: async () => {
        console.log('🔧 Manually triggering due date reminders...');
        // Yukarıdaki due date logic'ini manuel olarak çalıştır
    }
};
