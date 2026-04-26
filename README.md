# 🚀 Yapay Zeka Kod Açıklayıcı (AI Code Explainer)

Bu proje, yazılıma yeni başlayanlar veya karmaşık kod bloklarını anlamlandırmak isteyen geliştiriciler için tasarlanmış, web tabanlı akıllı bir **Kod Açıklama Asistanı**'dır. İstediğiniz kodu yapıştırarak satır satır, pedagojik ve anlaşılır Türkçe açıklamalar alabilir, anlamadığınız yerlerde kodun bağlamından kopmadan yapay zekaya doğrudan sorular sorabilirsiniz.

## ✨ Özellikler

- 🧠 **Çoklu AI Sağlayıcı Desteği:** İster **Groq** (Llama 3 vb. modeller ile yüksek hız) ister **Ollama** (bilgisayarınızda yerel ve ücretsiz çalışan modeller) üzerinden API bağlantısı kullanın.
- ✂️ **Akıllı Kod Parçalama (Chunking):** Kodları rastgele değil; JavaScript, Python ve HTML gibi dillerin yapılarına (fonksiyonlar, döngüler, DOM elemanları) uygun olarak mantıksal bütünlüğü bozmadan parçalara ayırır.
- 📖 **Satır Satır Açıklama:** Yapay zeka kodu özet geçmez, seçtiğiniz aralıktaki her bir satırı görsel referanslarla adım adım anlatır.
- 💬 **Bağlamsal Sohbet:** Sadece seçtiğiniz kod parçasının açıklaması üzerinden yapay zekaya dilediğiniz soruyu sorabileceğiniz etkileşimli "Soru Sor" arayüzü.
- 🎯 **Satır Aralığı Seçimi (Min/Max):** Dosya içinden sadece öğrenmek veya analiz etmek istediğiniz spesifik kod aralığını filtreleyebilirsiniz.

## 🛠️ Kullanılan Teknolojiler

- **Backend (Sunucu):** Node.js (Sadece yerleşik `http`, `https` ve `fs` modülleri ile hafif ve hızlı mimari)
- **Frontend (Önyüz):** HTML5, CSS3, Vanilla JavaScript (DOM Manipülasyonu)
- **Yapay Zeka API'leri:** Groq API, Ollama REST API

## 📂 Dosya Yapısı

- `server.js`: Web arayüzünü sunan ve Frontend ile Yapay Zeka servisi arasında köprü kuran ana Node.js sunucu dosyası.
- `ai-service.js`: Promt'ların (isteklerin) hazırlandığı ve Groq/Ollama servislerine HTTP isteklerinin atıldığı yapay zeka entegrasyon dosyası.
- `chunker.js`: Büyük boyutlu kod dosyalarını veya seçili satırları, anlam bütünlüğünü koruyarak küçük parçalara (chunk) bölen algoritma.
- `public/`: Kullanıcı arayüzünü oluşturan HTML, CSS ve İstemci (Client) taraflı JavaScript dosyalarını barındıran dizin.

## 🚀 Kurulum & Çalıştırma

Bu projeyi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

### 1. Gereksinimler
- Bilgisayarınızda [Node.js](https://nodejs.org/)'in (v20.6.0 veya üzeri) kurulu olduğundan emin olun.

### 2. Projeyi İndirin
Projeyi bilgisayarınıza klonlayın veya zip olarak indirerek bir klasöre çıkartın:
```bash
git clone https://github.com/KULLANICI_ADINIZ/kod-aciklayici.git
cd kod-aciklayici
```

### 3. Çevre Değişkenlerini Ayarlayın
Groq üzerinden yapay zekayı kullanacaksanız bir API anahtarına ihtiyacınız var. 
Proje ana dizininde (server.js ile aynı yerde) gizli bir `.env` dosyası oluşturun ve içine kendi API anahtarınızı yapıştırın:

```env
GROQ_API_KEY=sizin_groq_api_anahtariniz_buraya
```
*(Not: Eğer tamamen ücretsiz ve internetsiz çalışmak isterseniz `ai-service.js` dosyasından provider değerini `ollama` yapıp arka planda Ollama uygulamasını çalıştırabilirsiniz.)*

### 4. Sunucuyu Başlatın
Ekstra herhangi bir `npm install` paketine ihtiyaç yoktur. Sadece aşağıdaki komutu çalıştırarak sunucuyu başlatabilirsiniz:

```bash
node --env-file=.env server.js
```

Tarayıcınızı açın ve **http://localhost:3000** adresine giderek uygulamayı kullanmaya başlayın!

## 📜 Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Dilediğiniz gibi kullanabilir, kopyalayabilir, değiştirebilir ve kendi projelerinizde (ticari dahil) herhangi bir kısıtlama olmaksızın özgürce dağıtabilirsiniz. Daha fazla detay için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.
