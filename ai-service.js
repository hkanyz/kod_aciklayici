const https = require('https');
const http = require('http');

// Ayarlar
const CONFIG = {
    provider: 'groq', // 'groq' veya 'ollama' yapılabilir
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: 'llama-3.3-70b-versatile',
    ollamaUrl: 'http://localhost:11434/api/generate',
    ollamaModel: 'llama3'
};

async function explainCodeChunk(chunk, filename) {
    const prompt = `Sen uzman ve sabırlı bir yazılım eğitmenisin. Aşağıdaki kodu, yazılıma yeni başlayan birine anlatır gibi SATIR SATIR Türkçe açıkla. 

ÇOK ÖNEMLİ KURAL 1: Açıklamalarını KESİNLİKLE aşağıdaki şablona göre yapmalısın. Önce satır numarasını yaz, sonra o satırın kodunu göster, en son açıklamasını yap. Sakın kodları özetleyerek geçme.

ÇOK ÖNEMLİ KURAL 2: Yanıtın TAMAMI kusursuz ve doğal bir TÜRKÇE ile yazılmalıdır. İngilizce yazılım terimlerini (arrow function, event listener vb.) kullanabilirsin ancak Rusça, İspanyolca gibi alakasız dillerde kelimeler KESİNLİKLE kullanma. Hata yapmamaya çok dikkat et.

Şablon Örneği:
**Satır X:**
\`\`\`javascript
(O satırın kodu)
\`\`\`
(Detaylı ve anlaşılır açıklamanız)

**Satır Y-Z:** (Eğer bir kod bloğu ise)
\`\`\`javascript
(Kodlar)
\`\`\`
(Açıklamanız)

Dosya: ${filename}
Satır aralığı: ${chunk.startLine} - ${chunk.endLine}
İncelenecek Kod:
\`\`\`
${chunk.code}
\`\`\`
`;

    return await callAI(prompt, "explain");
}

async function askQuestion(codeLines, explanationContext, question) {
    const prompt = `Sen bağımsız bir kod analiz asistanısın. Görevin sadece verilen kod ve açıklamaya göre kullanıcının sorusunu yanıtlamaktır. Başka konularda cevap verme.

[KOD SATIRLARI (Açıklamanın Ait Olduğu Satırlar)]
\`\`\`
${codeLines}
\`\`\`

[KODA YAPILAN AÇIKLAMA (Kullanıcının Seçtiği Kısım)]
"${explanationContext}"

[KULLANICI SORUSU]
"${question}"

Lütfen yukarıdaki bağlamlar ışığında kullanıcıya Türkçe ve net bir şekilde cevap ver.`;

    return await callAI(prompt, "chat");
}

function callAI(prompt, type) {
    return new Promise((resolve, reject) => {
        if (CONFIG.provider === 'groq') {
            if (!CONFIG.groqApiKey) {
                // API key yoksa test amaçlı mock yanıt dönelim
                console.warn("GROQ_API_KEY bulunamadı, mock yanıt dönülüyor.");
                return resolve(getMockResponse(type));
            }
            callGroqAPI(prompt, resolve, reject);
        } else if (CONFIG.provider === 'ollama') {
            callOllamaAPI(prompt, resolve, reject);
        } else {
            reject(new Error('Geçersiz AI sağlayıcısı'));
        }
    });
}

function callGroqAPI(prompt, resolve, reject) {
    const data = JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: CONFIG.groqModel,
        temperature: 0.2 // Halüsinasyonu engellemek ve daha net cevaplar almak için düşük tutuldu
    });

    const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CONFIG.groqApiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                if (parsed.choices && parsed.choices.length > 0) {
                    resolve(parsed.choices[0].message.content);
                } else {
                    reject(new Error("Groq API geçersiz yanıt döndü: " + body));
                }
            } catch (e) {
                reject(e);
            }
        });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
}

function callOllamaAPI(prompt, resolve, reject) {
    const data = JSON.stringify({
        model: CONFIG.ollamaModel,
        prompt: prompt,
        stream: false
    });

    const url = new URL(CONFIG.ollamaUrl);
    const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                resolve(parsed.response);
            } catch (e) {
                reject(e);
            }
        });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
}

function getMockResponse(type) {
    if (type === "explain") {
        return `**Satırlar:**\n- Bu kod parçasında önemli bir algoritma başlatılmış.\n- Değişkenler tanımlanmış ve döngüye girilmiş. *(Not: Bu mesaj Groq API Key girilmediği için test amacıyla oluşturulmuştur.)*`;
    } else {
        return `Bu sorunuzu anladım. Ancak şu an Groq API Key girilmediği için size test mesajı gösteriyorum. Sisteminizi API Key ile güncellediğinizde gerçek yapay zeka cevapları alacaksınız.`;
    }
}

module.exports = { explainCodeChunk, askQuestion, CONFIG };
