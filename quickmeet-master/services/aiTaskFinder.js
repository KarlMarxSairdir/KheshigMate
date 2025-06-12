const { GoogleGenerativeAI } = require("@google/generative-ai");
const ProjectNote = require('../models/ProjectNote');
const ChatMessage = require('../models/ChatMessage');
const Project = require('../models/Project');

// .env dosyasından API anahtarını al
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AITaskFinder {
    constructor() {
        // Model yapılandırması - Gemini 1.5 Flash kullan
        this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }    async getSuggestionFromText(text, projectMembers, existingTasks = []) {
        const memberInfo = projectMembers.map(m => `${m.username} (Skills: ${m.skills.join(', ') || 'Belirtilmemiş'})`).join('; ');
        
        // Mevcut görevlerin başlıklarını topla
        const existingTaskTitles = existingTasks.map(task => task.title).join('; ');

        const prompt = `
            You are a project management assistant. Analyze the following text from a project collaboration tool.
            Your goal is to identify if the text contains an actionable task that is NOT already completed or in progress.
            
            IMPORTANT: The following tasks already exist in this project, DO NOT suggest these again:
            Existing Tasks: [${existingTaskTitles}]
            
            If the text contains a NEW actionable task that doesn't duplicate existing ones, respond ONLY with a single, valid JSON object. If not, respond ONLY with {"isTask": false}.

            JSON Output Format:
            {
              "isTask": true,
              "title": "A short, clear title for the task (max 15 words).",
              "description": "A brief description of the task based on the text.",
              "suggestedAssigneeUsername": "If a person's name from this list [${memberInfo}] is mentioned, put their username here. Otherwise, null.",
              "requiredSkills": ["Based on the text, predict 1-3 essential skills to complete this task (e.g., 'CSS', 'API')."]
            }

            Analyze this text: "${text}"
        `;

        try {
            const result = await this.model.generateContent(prompt);            const response = await result.response;
            const responseText = await response.text();
            
            // AI'ın markdown kod bloğu ile döndürdüğü JSON'u temizle
            let cleanedResponse = responseText.trim();
            
            // ```json ile başlayıp ``` ile bitiyorsa temizle
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            cleanedResponse = cleanedResponse.trim();
            
            // Yanıtın geçerli bir JSON olup olmadığını kontrol et
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(cleanedResponse);
            } catch (e) {
                console.error("AI response is not valid JSON:", responseText);
                console.error("Cleaned response:", cleanedResponse);
                return { isTask: false, error: "Invalid JSON response from AI." };
            }
            return parsedResponse;

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return { isTask: false, error: "API call failed." };
        }
    }

    async findPotentialTasks(projectId) {
        try {
            // Proje bilgilerini ve üyelerin skills bilgilerini çek
            const project = await Project.findById(projectId).populate('members.user', 'username skills');
            if (!project) {
                console.error("Project not found for AI task finding:", projectId);
                return [];
            }

            // Son 7 günlük verileri topla
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Proje notlarını çek
            const notes = await ProjectNote.find({
                project: projectId,
                updatedAt: { $gte: sevenDaysAgo }
            }).sort({ updatedAt: -1 });            // Chat mesajlarını çek
            const messages = await ChatMessage.find({
                project: projectId,
                createdAt: { $gte: sevenDaysAgo }
            }).sort({ createdAt: -1 });

            // Mevcut görevleri getir (duplicateları engellemek için)
            const Task = require('../models/Task');
            const existingTasks = await Task.find({ project: projectId }).select('title description');

            // Analiz edilecek metinleri topla
            const textsToAnalyze = [];
            
            // Not içeriklerini ekle
            notes.forEach(note => {
                if (note.content && note.content.trim() !== "") {
                    textsToAnalyze.push(note.content);
                }
                if (note.htmlContent && note.htmlContent.trim() !== "") {
                    // HTML içeriğinden metni çıkar (basit yöntem)
                    const textContent = note.htmlContent.replace(/<[^>]*>/g, '').trim();
                    if (textContent && textContent !== "") {
                        textsToAnalyze.push(textContent);
                    }
                }
            });
            
            // Chat mesajlarını ekle
            messages.forEach(msg => {
                if (msg.message && msg.message.trim() !== "") {
                    textsToAnalyze.push(msg.message);
                }
            });

            if (textsToAnalyze.length === 0) {
                console.log(`No texts to analyze for project ${projectId}`);
                return [];
            }
              console.log(`[AI] Analyzing ${textsToAnalyze.length} texts for project ${projectId}`);
            console.log(`[AI] Existing tasks count: ${existingTasks.length}`);
            
            // Her metin için AI analizi yap
            const potentialTasks = [];
            for (const text of textsToAnalyze) {
                if (text && text.trim() !== "") {
                    const suggestion = await this.getSuggestionFromText(text, project.members.map(m => m.user), existingTasks);
                    if (suggestion && suggestion.isTask) {
                        // Benzerlikleri önlemek için basit kontrol
                        const isDuplicate = potentialTasks.some(task => 
                            task.title && suggestion.title && 
                            task.title.toLowerCase().includes(suggestion.title.toLowerCase().substring(0, 10))
                        );
                        
                        if (!isDuplicate) {
                            potentialTasks.push({
                                ...suggestion,
                                sourceText: text.substring(0, 100) + (text.length > 100 ? '...' : '') // Kaynak metni de ekle
                            });
                        }
                    }
                }
                
                // API limitlerini aşmamak için küçük bir gecikme
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            console.log(`[AI] Found ${potentialTasks.length} potential tasks for project ${projectId}`);
            return potentialTasks.slice(0, 10); // Maksimum 10 öneri döndür
            
        } catch (error) {
            console.error("Error in findPotentialTasks:", error);
            return [];
        }
    }
}

module.exports = new AITaskFinder();
