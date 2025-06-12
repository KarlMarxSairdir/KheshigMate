const mongoose = require('mongoose');
const Task = require('./models/Task');

async function debugTasks() {
    try {
        await mongoose.connect('mongodb://localhost:27017/quickmeet');
        console.log('📁 MongoDB connected');
        
        // Spesifik proje için görevleri ara
        const projectTasks = await Task.find({ project: '6843b71886120f0a9f6fe07e' });
        console.log('🔍 Tasks found for project:', projectTasks.length);
        
        if (projectTasks.length > 0) {
            console.log('📋 First task:', JSON.stringify(projectTasks[0], null, 2));
        }
        
        // Tüm görevleri ara
        const allTasks = await Task.find({});
        console.log('📊 Total tasks in database:', allTasks.length);
        
        if (allTasks.length > 0) {
            console.log('🎯 Sample task projects:');
            allTasks.slice(0, 5).forEach(task => {
                console.log(`- ID: ${task._id}, Project: ${task.project}, Title: ${task.title}`);
            });
        }
        
        // Proje ID'lerini kontrol et
        const uniqueProjects = [...new Set(allTasks.map(t => t.project.toString()))];
        console.log('🏗️ Unique project IDs in tasks:', uniqueProjects);
        
        // ObjectId formatında proje ID'yi kontrol et
        const projectObjectId = new mongoose.Types.ObjectId('6843b71886120f0a9f6fe07e');
        const tasksWithObjectId = await Task.find({ project: projectObjectId });
        console.log('🔍 Tasks found with ObjectId format:', tasksWithObjectId.length);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

debugTasks();
