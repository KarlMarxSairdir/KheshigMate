// Fix Task Dates - Add startDate to existing tasks
const mongoose = require('mongoose');
const Task = require('./models/Task');

// MongoDB bağlantısı
mongoose.connect('mongodb://localhost:27017/quickmeet', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function fixTaskDates() {
    try {
        console.log('🔧 Starting task date fix...');
        
        // Find tasks without startDate
        const tasksWithoutStartDate = await Task.find({ 
            startDate: { $exists: false } 
        });
        
        console.log(`📋 Found ${tasksWithoutStartDate.length} tasks without startDate`);
        
        if (tasksWithoutStartDate.length === 0) {
            console.log('✅ All tasks already have startDate');
            return;
        }
        
        // Update each task
        for (const task of tasksWithoutStartDate) {
            // Use dueDate minus 7 days, or createdAt, or current date
            let startDate;
            
            if (task.dueDate) {
                startDate = new Date(task.dueDate);
                startDate.setDate(startDate.getDate() - 7); // 7 days before due date
            } else {
                startDate = task.createdAt || new Date();
            }
            
            await Task.findByIdAndUpdate(task._id, {
                startDate: startDate
            });
            
            console.log(`✅ Updated task "${task.title}" with startDate: ${startDate.toISOString().split('T')[0]}`);
        }
        
        console.log('🎉 Task date fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing task dates:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the fix
fixTaskDates();
