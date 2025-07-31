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
        const memberInfo = projectMembers.map(m => `${m.username} (Skills: ${m.skills.join(', ') || 'Belirtilmemiş'})`).join('; ');        // Mevcut görevlerin başlıklarını ve açıklamalarını topla
        const existingTaskDetails = existingTasks.map(task => `"${task.title}" (${task.description || 'Açıklama yok'})`).join('; ');
        const existingTaskTitles = existingTasks.map(task => task.title).join('; ');
        
        // Debug: AI'ya gönderilen mevcut görevleri logla
        console.log(`[AI] Mevcut görevler AI'ya gönderiliyor: [${existingTaskTitles}]`);

        const prompt = `
            Sen gelişmiş bir proje yönetim AI asistanısın. Aşağıdaki metni analiz ederek görev tespiti ve yetenek bazlı otomatik atama yapacaksın.
            
            PROJE ÜYELERİ ve YETENEKLERİ:
            ${memberInfo}
              MEVCUT GÖREVLER (TEKRAR ÖNERMEYİN):
            ${existingTaskDetails}
            
            ÖNEMLİ UYARILAR:
            - Yukarıdaki mevcut görevlerle benzer, aynı ya da çakışan hiçbir görev önerme!
            - Mevcut görev başlıklarını ve açıklamalarını dikkatlice incele!
            - Sadece tamamen YENİ ve farklı görevler öner!
            
            GÖREV ANALIZ KRİTERLERİ:
            1. Metin bir yapılabilir görev içeriyor mu?
            2. Bu görev mevcut görevlerle çakışıyor mu?
            3. Hangi yetenekler gerekli?
            4. Hangi üye en uygun?
            
            YETENEK BAZLI ATAMA ALGORİTMASI:
            - Görevin gerektirdiği yetenekleri belirle
            - Üyelerin skills listesini analiz et
            - En yüksek yetenek eşleşmesine sahip üyeyi öner
            - Eğer hiçbir üyenin ilgili yeteneği yoksa, genel deneyime göre en uygun üyeyi seç
            - Metin içinde özel olarak bir isim geçiyorsa onu öncelik ver
            - Mümkünse bir üye ata. Atanamıyorsa, bu alanı boş bırakabilirsin.
            
            ÇIKTI FORMATI:
            Eğer geçerli bir görev tespit edersen, SADECE şu JSON formatında yanıt ver:
            {
              "isTask": true,
              "title": "Kısa ve açık görev başlığı (max 15 kelime)",
              "description": "Görevin detaylı açıklaması ve neyin yapılacağı",
              "confidence": 0.85,
              "priority": "low|medium|high",
              "suggestedAssigneeUsername": "En uygun üyenin username'i (Atama yapılamıyorsa boş bırakılabilir)",
              "requiredSkills": ["Gerekli yetenek 1", "Gerekli yetenek 2"],
              "assignmentReason": "Bu üyenin neden seçildiğinin kısa açıklaması",
              "skillMatchScore": 0.8
            }
            
            Eğer görev tespit edilmezse SADECE: {"isTask": false}
            
            CONFIDENCE SKORU: 0.0-1.0 (ne kadar emin olduğun)
            SKILL MATCH SCORE: 0.0-1.0 (önerilen üyenin yetenek uyumu)
            ASSIGNMENT REASON: Neden bu üyeyi önerdiğinin açıklaması
            
            ANALİZ EDİLECEK METİN: "${text}"
            
            UNUTMA: Tüm yanıtları Türkçe olarak ver.
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
                let contentToAnalyze = '';
                // Öncelik htmlContent'te, daha zengin veri içerir
                if (note.htmlContent && note.htmlContent.trim() !== "") {
                    // HTML'i temizle, etiketleri boşlukla değiştirerek kelimelerin birleşmesini önle
                    contentToAnalyze = note.htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s\s+/g, ' ').trim();
                } 
                // Eğer htmlContent yoksa veya boşsa, content'i kullan
                else if (note.content && note.content.trim() !== "") {
                    contentToAnalyze = note.content.trim();
                }

                if (contentToAnalyze) {
                    textsToAnalyze.push(contentToAnalyze);
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
            }            console.log(`[AI] ${projectId} projesi için ${textsToAnalyze.length} metin analiz ediliyor`);
            console.log(`[AI] Mevcut görev sayısı: ${existingTasks.length}`);
            
            // Debug: Mevcut görevleri listele
            if (existingTasks.length > 0) {
                console.log(`[AI] Mevcut görevler:`, existingTasks.map(task => task.title));
            } else {
                console.log(`[AI] Bu projede henüz hiç görev yok`);
            }
            
            // Her metin için AI analizi yap
            const potentialTasks = [];
            for (const text of textsToAnalyze) {
                if (text && text.trim() !== "") {                    const suggestion = await this.getSuggestionFromText(text, project.members.map(m => m.user), existingTasks);
                    if (suggestion && suggestion.isTask) {
                        console.log(`[AI] Yeni öneri oluşturuldu: "${suggestion.title}"`);
                        
                        // Benzerlikleri önlemek için basit kontrol
                        const isDuplicate = potentialTasks.some(task => 
                            task.title && suggestion.title && 
                            task.title.toLowerCase().includes(suggestion.title.toLowerCase().substring(0, 10))
                        );
                        
                        if (isDuplicate) {
                            console.log(`[AI] Duplikasyon tespit edildi, öneri atlanıyor: "${suggestion.title}"`);
                        } else {
                            console.log(`[AI] Öneri kabul edildi: "${suggestion.title}"`);
                        }
                        
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
