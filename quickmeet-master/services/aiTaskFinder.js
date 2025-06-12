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
        const existingTaskTitles = existingTasks.map(task => task.title).join('; ');        const prompt = `
            Sen bir proje yönetim asistanısın. Aşağıdaki metni bir proje işbirliği aracından analiz et.
            Amacın, metnin henüz tamamlanmamış veya başlamamış yapılabilir bir görev içerip içermediğini tespit etmek.
            
            ÖNEMLİ: Aşağıdaki görevler bu projede zaten mevcut, bunları TEKRAR ÖNERMEYİN:
            Mevcut Görevler: [${existingTaskTitles}]
            
            Eğer metin mevcut görevlerle çakışmayan YENİ bir yapılabilir görev içeriyorsa, SADECE tek bir geçerli JSON nesnesi ile yanıt ver. Aksi takdirde SADECE {"isTask": false} yanıtını ver.            JSON Çıktı Formatı:
            {
              "isTask": true,
              "title": "Görev için kısa ve net bir başlık (maksimum 15 kelime).",
              "description": "Metne dayalı görevin kısa bir açıklaması.",
              "confidence": 0.85,
              "priority": "medium",
              "suggestedAssigneeUsername": "Eğer bu listeden [${memberInfo}] bir kişinin ismi geçiyorsa, kullanıcı adını buraya yaz. Aksi takdirde null.",
              "requiredSkills": ["Metne dayalı olarak, bu görevi tamamlamak için gerekli 1-3 temel yetkinliği tahmin et (örn: 'CSS', 'API')."]
            }

            Confidence: 0.0-1.0 arası güven skoru (ne kadar kesin olduğun).
            Priority: "low", "medium" veya "high" öncelik seviyesi.

            Bu metni analiz et: "${text}"
            
            UNUTMA: Tüm yanıtlarını Türkçe olarak ver.
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
                parsedResponse = JSON.parse(cleanedResponse);            } catch (e) {
                console.error("AI yanıtı geçerli JSON değil:", responseText);
                console.error("Temizlenmiş yanıt:", cleanedResponse);
                return { isTask: false, error: "AI'dan geçersiz JSON yanıtı." };
            }
            return parsedResponse;        } catch (error) {
            console.error("Gemini API çağrısında hata:", error);
            return { isTask: false, error: "API çağrısı başarısız." };
        }
    }

    async findPotentialTasks(projectId) {
        try {
            // Proje bilgilerini ve üyelerin skills bilgilerini çek
            const project = await Project.findById(projectId).populate('members.user', 'username skills');            if (!project) {
                console.error("AI görev bulma için proje bulunamadı:", projectId);
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
            });            if (textsToAnalyze.length === 0) {
                console.log(`${projectId} projesi için analiz edilecek metin bulunamadı`);
                return [];
            }              console.log(`[AI] ${projectId} projesi için ${textsToAnalyze.length} metin analiz ediliyor`);
            console.log(`[AI] Mevcut görev sayısı: ${existingTasks.length}`);
            
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
              console.log(`[AI] ${projectId} projesi için ${potentialTasks.length} potansiyel görev bulundu`);
            return potentialTasks.slice(0, 10); // Maksimum 10 öneri döndür
              } catch (error) {
            console.error("findPotentialTasks'da hata:", error);
            return [];
        }
    }
}

module.exports = new AITaskFinder();
