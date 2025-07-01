🎓 Bitirme Projem: KheshigMate - Enterprise-Level ve Gerçek Zamanlı İşbirliği Platformu
Lisans bitirme projem olan KheshigMate'i tamamlamış olmanın gururunu yaşıyorum. Bu proje, standart işbirliği araçlarının ötesine geçerek, bir proje ekibinin tüm yaşam döngüsünü yönetebileceği, senkronize ve akıllı bir dijital çalışma alanı sunmayı hedeflemektedir. Platform, şu anda aynı yerel ağ (LAN) üzerindeki farklı kullanıcılar tarafından eş zamanlı olarak erişilebilir ve kullanılabilir durumdadır.
🔩 MİMARİ VE TEKNOLOJİ YIĞINI
Projenin temelinde, ölçeklenebilir ve sağlam bir mimari bulunmaktadır:
Backend: Node.js ve Express.js ile oluşturulmuş merkezi bir API katmanı.
Gerçek Zamanlı Katman: Proje bazlı odalar üzerinden anlık veri akışını yöneten Socket.IO ve P2P video/ses akışı için PeerJS (WebRTC).
Veritabanı: MongoDB ve Mongoose ODM, esnek ve ilişkisel veri yapısını (kullanıcılar, projeler, görevler, notlar vb.) yönetmek için kullanıldı.
Frontend: EJS Templating ile dinamik sayfa oluşturma ve Vanilla JavaScript ile modüler bir yapıda (gantt.js, kanban.js vb.) geliştirilmiş interaktif arayüzler. Stil yönetimi, modüler SCSS mimarisi ile sağlandı.
✨ MODÜLLER VE ÖZELLİKLERİN DETAYLI ANALİZİ
KheshigMate, birbiriyle tam entegre çalışan birden çok güçlü modülden oluşur:
1. Gelişmiş Görev Yönetimi (Kanban Tahtası):
Kullanıcılar, görevleri "Yapılacaklar", "Devam Ediyor" ve "Tamamlandı" sütunları arasında sürükleyip bırakabilir. Her görev kartı; başlık, açıklama, öncelik, sorumlu kişi ve son teslim tarihi gibi detayları içerir.
Tam Senkronizasyon: Kanban'da bir görevin durumu değiştirildiğinde, bu değişiklik anında veritabanına kaydedilir ve WebSocket üzerinden diğer tüm modüllere (Gantt, Takvim) yansıtılır.
2. Proje Zaman Çizelgesi (Gantt Şeması):
Projedeki tüm görevler, başlangıç ve bitiş tarihlerine göre interaktif bir Gantt şeması üzerinde görselleştirilir.
Kullanıcılar, görev çubuklarını doğrudan grafik üzerinden sürükleyerek görevlerin zaman aralığını veya ilerlemesini (progress) değiştirebilir.
Çift Yönlü Entegrasyon: Gantt şemasında yapılan bir tarih veya ilerleme değişikliği, anında veritabanını günceller ve bu değişiklik Kanban tahtasındaki görevin status'ünü (örn: %10 ilerleme -> "Devam Ediyor") ve Takvim'deki son teslim tarihini otomatik olarak senkronize eder.
3. İş Akışı Modelleme (BPMN Entegrasyonu):
bpmn-js kütüphanesi kullanılarak, proje ekiplerinin iş akışlarını standart BPMN 2.0 formatında tasarlayabildiği tam özellikli bir editör entegre edilmiştir.
Oluşturulan diyagramlar, proje bazlı olarak veritabanına XML formatında kaydedilir, böylece tüm ekip üyeleri tarafından görüntülenebilir ve düzenlenebilir. Değişiklikler gerçek zamanlı olarak diğer üyelere yansıtılır.
4. 🧠 AI Destekli Akıllı Asistan (Google Gemini Entegrasyonu):
Bu modül, projenin en yenilikçi katmanıdır ve diğer modüllerle tam entegre çalışır:
Analiz: Gemini 1.5 Flash modeli, proje notlarını ve sohbet mesajlarını sürekli analiz ederek, doğal dilde ifade edilmiş potansiyel görevleri tespit eder.
Yetenek Bazlı Atama Önerisi: AI, sadece görevi tespit etmekle kalmaz, aynı zamanda görevin içeriğini analiz ederek (Task modelindeki requiredSkills alanı için) tamamlanması için gereken yetkinlikleri tahmin eder. Ardından, proje üyelerinin profillerindeki (User modelindeki skills alanı) yetkinliklerle bu gereksinimleri karşılaştırarak görevi atamak için en uygun kişiyi önerir.
Tam Entegre İş Akışı: AI tarafından önerilen bir görev, kullanıcı tarafından tek tıkla kabul edildiğinde, doğrudan Kanban tahtasına doğru status ile eklenir, Gantt şemasında zaman çizelgesine yerleşir ve (eğer tarih varsa) Takvim'e işlenir.
Bu proje, bir fikrin nasıl tam teşekküllü, çok katmanlı ve akıllı bir uygulamaya dönüştürülebileceğinin bir kanıtıdır. Modern web teknolojilerini kullanarak karmaşık senkronizasyon ve entegrasyon problemlerini çözme konusunda bana derin bir tecrübe kazandırdı.
