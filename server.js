const http = require('http');
const fs = require('fs');
const path = require('path');
const { chunkCode } = require('./chunker');
const aiService = require('./ai-service');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Temel MIME tipleri
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
};

const server = http.createServer((req, res) => {
    // Statik dosya sunumu
    if (req.method === 'GET') {
        let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
        
        // Güvenlik: Dizin dışına çıkmayı engelle
        const extname = path.extname(filePath);
        let contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
        return;
    }

    // JSON gövdesini okumak için yardımcı fonksiyon
    const readJsonBody = (req) => {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try { resolve(JSON.parse(body)); } 
                catch (e) { reject(e); }
            });
        });
    };

    const sendJson = (res, statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    // 1. Kodu parçalara bölme API'si
    if (req.method === 'POST' && req.url === '/api/chunk') {
        readJsonBody(req).then(data => {
            if (!data.content) return sendJson(res, 400, { error: 'İçerik eksik' });
            const chunks = chunkCode(data.content, data.filename, data.minLine, data.maxLine);
            sendJson(res, 200, { chunks });
        }).catch(err => sendJson(res, 400, { error: 'Geçersiz İstek' }));
        return;
    }

    // 2. Parça açıklama API'si
    if (req.method === 'POST' && req.url === '/api/explain') {
        readJsonBody(req).then(async data => {
            if (!data.chunk || !data.filename) return sendJson(res, 400, { error: 'Eksik veri' });
            try {
                const explanation = await aiService.explainCodeChunk(data.chunk, data.filename);
                sendJson(res, 200, { explanation });
            } catch (err) {
                console.error(err);
                sendJson(res, 500, { error: 'Yapay zeka hatası: ' + err.message });
            }
        }).catch(err => sendJson(res, 400, { error: 'Geçersiz İstek' }));
        return;
    }

    // 3. Chat API'si
    if (req.method === 'POST' && req.url === '/api/chat') {
        readJsonBody(req).then(async data => {
            if (!data.question) return sendJson(res, 400, { error: 'Eksik veri' });
            try {
                const answer = await aiService.askQuestion(data.codeLines, data.explanationContext, data.question);
                sendJson(res, 200, { answer });
            } catch (err) {
                console.error(err);
                sendJson(res, 500, { error: 'Yapay zeka hatası: ' + err.message });
            }
        }).catch(err => sendJson(res, 400, { error: 'Geçersiz İstek' }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
});

server.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}/`);
});
