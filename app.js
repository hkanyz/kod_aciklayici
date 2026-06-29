document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elementleri ---
    const uploadSection = document.getElementById('upload-section');
    const explanationSection = document.getElementById('explanation-section');
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const explanationContent = document.getElementById('explanation-content');
    const newFileBtn = document.getElementById('new-file-btn');
    
    // Chat & Tooltip Elementleri
    const tooltipBtn = document.getElementById('tooltip-btn');
    const chatContext = document.getElementById('chat-context');
    const contextText = document.getElementById('context-text');
    const clearContextBtn = document.getElementById('clear-context');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');

    const fileExplorer = document.getElementById('file-explorer');
    const fileList = document.getElementById('file-list');
    const newFolderBtn = document.getElementById('new-folder-btn');
    const continueContainer = document.getElementById('continue-container');
    const continueBtn = document.getElementById('continue-btn');

    // Filtreleme Elementleri
    const lineFilter = document.getElementById('line-filter');
    const minLineInput = document.getElementById('min-line');
    const maxLineInput = document.getElementById('max-line');
    const applyFilterBtn = document.getElementById('apply-filter-btn');

    // Toggle Elementleri
    const toggleExplorerBtn = document.getElementById('toggle-explorer-btn');
    const toggleChatBtn = document.getElementById('toggle-chat-btn');
    const chatPanel = document.getElementById('chat-panel');

    // Editor ve Bağlam Menüsü (Context Menu) Elementleri
    const contextMenu = document.getElementById('context-menu');
    const menuInspect = document.getElementById('menu-inspect');
    const menuExplain = document.getElementById('menu-explain');
    const editorTabsBar = document.getElementById('editor-tabs-bar');
    const editorViewSection = document.getElementById('editor-view-section');
    const editorCodeContent = document.getElementById('editor-code-content');
    const mainHeader = document.querySelector('.main-content header');
    const editorPane = document.getElementById('editor-pane');

    let openedTabs = []; // { id, name, content, file }
    let activeTabId = null;
    let rightClickedFile = null;
    let rightClickedElement = null;

    let currentSelectedText = "";
    let currentSelectedChunkCode = "";
    let currentChunks = [];
    let currentChunkIndex = 0;
    let currentActiveFile = null;
    let loadedFiles = []; // Klasördeki tüm dosyalar

    // --- STATE MANAGEMENT ---
    function saveAppState() {
        if (!currentActiveFile) return;
        const state = {
            activeFilePath: currentActiveFile.webkitRelativePath || currentActiveFile.name,
            explanationHTML: explanationContent.innerHTML,
            chatHTML: chatMessages.innerHTML,
            currentChunks: currentChunks,
            currentChunkIndex: currentChunkIndex,
            currentSelectedChunkCode: currentSelectedChunkCode,
            currentSelectedText: currentSelectedText,
            lineFilterMin: minLineInput.value,
            lineFilterMax: maxLineInput.value
        };
        localStorage.setItem('codeExplainerState', JSON.stringify(state));
    }

    setInterval(saveAppState, 1000);

    function restoreAppState() {
        const stateStr = localStorage.getItem('codeExplainerState');
        if (!stateStr) return;
        try {
            const state = JSON.parse(stateStr);
            if (state.activeFilePath) {
                const fileToSelect = loadedFiles.find(f => (f.webkitRelativePath || f.name) === state.activeFilePath);
                if (fileToSelect) {
                    // Update UI manually without triggering selectFile's reset
                    document.querySelectorAll('.file-item').forEach(el => {
                        if ((el.textContent || el.title) === state.activeFilePath) {
                            el.classList.add('active');
                        } else {
                            el.classList.remove('active');
                        }
                    });

                    currentActiveFile = fileToSelect;
                    fileNameDisplay.textContent = fileToSelect.name;
                    lineFilter.style.display = 'flex';
                    minLineInput.value = state.lineFilterMin || '';
                    maxLineInput.value = state.lineFilterMax || '';

                    explanationContent.innerHTML = state.explanationHTML || '';
                    chatMessages.innerHTML = state.chatHTML || '';
                    currentChunks = state.currentChunks || [];
                    currentChunkIndex = state.currentChunkIndex || 0;
                    currentSelectedChunkCode = state.currentSelectedChunkCode || "";
                    currentSelectedText = state.currentSelectedText || "";
                    
                    if (currentChunks.length > 0 && currentChunkIndex < currentChunks.length) {
                        continueContainer.style.display = 'block';
                    } else {
                        continueContainer.style.display = 'none';
                    }
                    
                    if (currentSelectedText) {
                        chatContext.style.display = 'block';
                        contextText.textContent = currentSelectedText;
                        chatInput.disabled = false;
                        sendBtn.disabled = false;
                    }

                    // Re-highlight code blocks after restoring innerHTML
                    document.querySelectorAll('#explanation-content pre code, #chat-messages pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                    
                    setTimeout(() => {
                        explanationSection.scrollTo(0, explanationSection.scrollHeight);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }, 100);
                } else {
                    localStorage.removeItem('codeExplainerState');
                }
            }
        } catch (err) {
            console.error("State restore error:", err);
        }
    }

    // Toggle İşlemleri
    if(toggleExplorerBtn) {
        toggleExplorerBtn.addEventListener('click', () => {
            fileExplorer.classList.toggle('active');
            toggleExplorerBtn.classList.toggle('active');
        });
    }

    if(toggleChatBtn) {
        toggleChatBtn.addEventListener('click', () => {
            chatPanel.classList.toggle('active');
            toggleChatBtn.classList.toggle('active');
        });
    }

    // Marked.js Ayarları
    marked.setOptions({
        breaks: true // Satır sonlarını <br>'ye çevirir
    });

    // --- Dosya Yükleme İşlemleri ---
    const restoreSection = document.getElementById('restore-section');
    const restoreBtn = document.getElementById('restore-btn');

    // Kendi idb-keyval implementasyonumuz (CDN engellemelerine karşı)
    const localDB = {
        get(key) {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('code-explainer-db', 1);
                request.onupgradeneeded = e => e.target.result.createObjectStore('keyval');
                request.onsuccess = e => {
                    const db = e.target.result;
                    const tx = db.transaction('keyval', 'readonly');
                    const store = tx.objectStore('keyval');
                    const getReq = store.get(key);
                    getReq.onsuccess = () => resolve(getReq.result);
                    getReq.onerror = () => reject(getReq.error);
                };
                request.onerror = () => reject(request.error);
            });
        },
        set(key, val) {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('code-explainer-db', 1);
                request.onupgradeneeded = e => e.target.result.createObjectStore('keyval');
                request.onsuccess = e => {
                    const db = e.target.result;
                    const tx = db.transaction('keyval', 'readwrite');
                    const store = tx.objectStore('keyval');
                    const putReq = store.put(val, key);
                    putReq.onsuccess = () => resolve();
                    putReq.onerror = () => reject(putReq.error);
                };
                request.onerror = () => reject(request.error);
            });
        }
    };

    // Sayfa açıldığında daha önce kaydedilmiş bir handle var mı kontrol et
    checkSavedDirectory();

    async function checkSavedDirectory() {
        try {
            const handle = await localDB.get('savedDirectoryHandle');
            if (handle && restoreSection) {
                restoreSection.style.display = 'block';
            }
        } catch (err) {
            console.error("IndexedDB okuma hatası:", err);
        }
    }

    if (restoreBtn) {
        restoreBtn.addEventListener('click', async () => {
            try {
                const handle = await localDB.get('savedDirectoryHandle');
                if (handle) {
                    if (await verifyPermission(handle)) {
                        await loadDirectory(handle);
                    }
                }
            } catch (err) {
                console.error("Geri yükleme hatası:", err);
                alert("Geri yükleme başarısız oldu. Lütfen klasörü yeniden seçin.");
            }
        });
    }

    async function verifyPermission(fileHandle) {
        const options = { mode: 'read' };
        if ((await fileHandle.queryPermission(options)) === 'granted') {
            return true;
        }
        if ((await fileHandle.requestPermission(options)) === 'granted') {
            return true;
        }
        return false;
    }

    uploadBox.addEventListener('click', async () => {
        try {
            if (!window.showDirectoryPicker) {
                alert("Tarayıcınız 'Gelişmiş Klasör Seçimi' özelliğini desteklemiyor veya güvenlik ayarlarından kapalı.\nBu sebeple dosyalarınız kalıcı olarak kaydedilemeyecek (sayfayı yenileyince silinecek).\nEski yöntemle dosya yükleme penceresi açılıyor...");
                fileInput.click(); // Fallback
                return;
            }
            
            const directoryHandle = await window.showDirectoryPicker();
            await localDB.set('savedDirectoryHandle', directoryHandle);
            
            await loadDirectory(directoryHandle);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Klasör seçimi başarısız:', err);
                alert("Klasör seçilirken bir hata oluştu: " + err.message + "\nEski yönteme dönülüyor...");
                fileInput.click(); // Fallback
            }
        }
    });

    async function loadDirectory(directoryHandle) {
        const originalContent = uploadBox.innerHTML;
        uploadBox.innerHTML = '<div style="text-align:center; padding: 20px;"><p style="color:var(--accent);">Dosyalar yerel diskinizden güncel olarak okunuyor...</p></div>';
        const files = [];
        
        async function readDir(dirHandle, path = '') {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    if (entry.name.match(/\.(js|css|html|md|py|java|c|cpp|cs|php|go|rs|ts|jsx|tsx)$/i)) {
                        const file = await entry.getFile();
                        // Webkit relative path özelliği kazandırıyoruz
                        Object.defineProperty(file, 'webkitRelativePath', {
                            value: path + entry.name,
                            writable: false
                        });
                        files.push(file);
                    }
                } else if (entry.kind === 'directory') {
                    if (!entry.name.match(/^(node_modules|\.git|\.vscode|\.idea)$/)) {
                        await readDir(entry, path + entry.name + '/');
                    }
                }
            }
        }
        
        await readDir(directoryHandle);
        uploadBox.innerHTML = originalContent; // Eski haline geri getir
        if(restoreSection) restoreSection.style.display = 'none';
        
        handleFiles(files);
    }

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--accent)';
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.style.borderColor = 'var(--panel-border)';
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--panel-border)';
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });

    newFolderBtn.addEventListener('click', () => {
        uploadBox.click();
    });

    function handleFiles(files) {
        loadedFiles = Array.from(files).filter(f => f.name.match(/\.(js|css|html|md|py|java|c|cpp|cs|php|go|rs|ts|jsx|tsx)$/i));
        
        if (loadedFiles.length === 0) {
            alert("Desteklenen bir kod dosyası bulunamadı.");
            return;
        }

        uploadSection.style.display = 'none';
        explanationSection.style.display = 'block';
        fileExplorer.style.display = 'flex';
        
        renderFileList();
        restoreAppState();
    }

    function renderFileList() {
        fileList.innerHTML = '';
        loadedFiles.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.textContent = file.webkitRelativePath || file.name;
            div.title = div.textContent;
            div.addEventListener('click', () => selectFile(file, div));
            div.addEventListener('contextmenu', (e) => handleContextMenu(e, file, div));
            fileList.appendChild(div);
        });
    }

    function selectFile(file, element) {
        // Aktif sınıfı temizle ve yeniye ekle
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');

        currentActiveFile = file;
        fileNameDisplay.textContent = file.name;
        
        // Filtreyi göster ve sıfırla
        lineFilter.style.display = 'flex';
        minLineInput.value = '';
        maxLineInput.value = '';
        
        explanationContent.innerHTML = `
            <div class="empty-state" style="text-align: center; margin-top: 50px;">
                <p style="color: var(--text-main); font-size: 1.1rem; margin-bottom: 10px;">Dosya seçildi: <b>${file.name}</b></p>
                <p style="color: var(--text-muted); font-size: 0.9rem;">
                    Yukarıdaki menüden incelemek istediğiniz satır aralığını seçebilirsiniz.<br>
                    Tüm dosyayı incelemek veya aralığı onaylamak için <b>Başlat</b> butonuna basın.
                </p>
            </div>
        `;
    }

    applyFilterBtn.addEventListener('click', () => {
        if (!currentActiveFile) return;
        loadChunksForFile();
    });

    function loadChunksForFile() {
        if (!currentActiveFile) return;

        explanationContent.innerHTML = '';
        continueContainer.style.display = 'none';
        
        const minLine = minLineInput.value ? parseInt(minLineInput.value) : null;
        const maxLine = maxLineInput.value ? parseInt(maxLineInput.value) : null;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            explanationContent.innerHTML = '<p class="loading-text">Dosya filtrelenip parçalanıyor...</p>';

            try {
                const chunkRes = await fetch('/api/chunk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, minLine, maxLine, filename: currentActiveFile.name })
                });
                const chunkData = await chunkRes.json();
                
                if (chunkData.error) throw new Error(chunkData.error);
                
                currentChunks = chunkData.chunks;
                currentChunkIndex = 0;
                explanationContent.innerHTML = ''; // Temizle
                
                if (currentChunks.length > 0) {
                    // İlk parçayı otomatik açıkla
                    explainNextChunk();
                } else {
                    explanationContent.innerHTML = '<p class="loading-text" style="color:var(--text-muted);">Belirtilen aralıkta kod bulunamadı.</p>';
                }

            } catch (err) {
                explanationContent.innerHTML = `<p style="color: #ef4444;">İşlem sırasında hata oluştu: ${err.message}</p>`;
            }
        };
        reader.readAsText(currentActiveFile);
    }

    continueBtn.addEventListener('click', () => {
        explainNextChunk();
    });

    async function explainNextChunk() {
        if (currentChunkIndex >= currentChunks.length) return;

        const chunk = currentChunks[currentChunkIndex];
        const loadingId = `loading-chunk-${currentChunkIndex}`;
        
        continueContainer.style.display = 'none';
        explanationContent.insertAdjacentHTML('beforeend', `<p id="${loadingId}" class="loading-text" style="color:var(--accent);">Satır ${chunk.startLine}-${chunk.endLine} inceleniyor...</p>`);
        explanationSection.scrollTo(0, explanationSection.scrollHeight);

        try {
            const explainRes = await fetch('/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunk, filename: currentActiveFile.name })
            });
            const explainData = await explainRes.json();
            
            document.getElementById(loadingId).remove();
            
            if (explainData.error) {
                explanationContent.insertAdjacentHTML('beforeend', `<p style="color:#ef4444;">Satır ${chunk.startLine}-${chunk.endLine} hata: ${explainData.error}</p>`);
            } else {
                // Açıklamayı ekrana bas
                const newChunkId = `chunk-exp-${currentChunkIndex}`;
                explanationContent.insertAdjacentHTML('beforeend', `
                    <div id="${newChunkId}" class="chunk-explanation" data-chunk-index="${currentChunkIndex}" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--panel-border);">
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">Satır ${chunk.startLine} - ${chunk.endLine}</div>
                        ${formatMarkdown(explainData.explanation)}
                    </div>
                `);

                // Kod bloklarını renklendir
                setTimeout(() => {
                    document.querySelectorAll(`#${newChunkId} pre code`).forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }, 10);
            }

            currentChunkIndex++;

            if (currentChunkIndex < currentChunks.length) {
                continueContainer.style.display = 'block';
            } else {
                explanationContent.insertAdjacentHTML('beforeend', `<p style="text-align:center; color:var(--text-muted); margin-top: 20px;">✓ Dosyanın sonuna ulaşıldı.</p>`);
            }

            explanationSection.scrollTo(0, explanationSection.scrollHeight);

        } catch (err) {
            document.getElementById(loadingId)?.remove();
            explanationContent.insertAdjacentHTML('beforeend', `<p style="color: #ef4444;">İşlem sırasında hata oluştu: ${err.message}</p>`);
            continueContainer.style.display = 'block'; // Hatada tekrar deneyebilsin diye butonu göster
        }
    }

    // Markdown parse fonksiyonu (Marked.js kullanır)
    function formatMarkdown(text) {
        if (!text) return "";
        return marked.parse(text);
    }

    // --- Metin Seçimi ve Tooltip (Soru Sor) İşlemleri ---
    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        // Eğer seçim açıklama alanı içindeyse ve boş değilse
        if (text.length > 0 && explanationSection.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Tooltip'i seçimin hemen üstüne ortala
            tooltipBtn.style.display = 'block';
            tooltipBtn.style.top = `${rect.top + window.scrollY - 35}px`;
            tooltipBtn.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltipBtn.offsetWidth / 2)}px`;
            
            currentSelectedText = text;
            
            // Hangi kod bloğuna ait olduğunu bul
            let node = selection.anchorNode;
            let chunkDiv = node.nodeType === 3 ? node.parentNode.closest('.chunk-explanation') : node.closest('.chunk-explanation');
            if (chunkDiv) {
                let chunkIndex = chunkDiv.getAttribute('data-chunk-index');
                if (currentChunks[chunkIndex]) {
                    currentSelectedChunkCode = currentChunks[chunkIndex].code;
                }
            }
        } else {
            // Seçim yoksa butonu gizle (butona tıklandığı anı kaçırmamak için hafif gecikme eklenebilir, şimdilik tıklamayı engellememesi için mousedown'da hallediyoruz)
        }
    });

    // Mousedown ile tooltip dışında bir yere tıklanınca gizle
    document.addEventListener('mousedown', (e) => {
        if (e.target.id !== 'tooltip-btn') {
            tooltipBtn.style.display = 'none';
        }
    });

    // --- Chat İşlemleri ---
    tooltipBtn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Metin seçiminin kaybolmasını engelle
        
        // Chat bağlamını ayarla
        chatContext.style.display = 'block';
        contextText.textContent = currentSelectedText;
        chatInput.disabled = false;
        sendBtn.disabled = false;
        
        // Tooltip'i gizle ve inputa odaklan
        tooltipBtn.style.display = 'none';
        chatInput.focus();
    });

    clearContextBtn.addEventListener('click', () => {
        chatContext.style.display = 'none';
        currentSelectedText = "";
        currentSelectedChunkCode = "";
        // Eğer bağlamsız soru sorulmasını istemiyorsak disable edebiliriz:
        // chatInput.disabled = true; 
        // sendBtn.disabled = true;
    });

    function addMessage(text, isAi = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isAi ? 'ai-message' : 'user-message'}`;
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendBtn.addEventListener('click', async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, false);
        chatInput.value = '';
        chatInput.disabled = true;
        sendBtn.disabled = true;

        const loadingId = 'chat-loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.id = loadingId;
        msgDiv.className = 'message ai-message';
        msgDiv.style.opacity = '0.7';
        msgDiv.textContent = 'Düşünüyor...';
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    codeLines: currentSelectedChunkCode,
                    explanationContext: currentSelectedText, 
                    question: text 
                })
            });
            const data = await res.json();
            
            document.getElementById(loadingId).remove();
            
            if (data.error) {
                addMessage('Hata: ' + data.error, true);
            } else {
                // Basit markdown ile ekle
                const finalDivId = `chat-msg-${Date.now()}`;
                const finalDiv = document.createElement('div');
                finalDiv.id = finalDivId;
                finalDiv.className = 'message ai-message';
                finalDiv.innerHTML = formatMarkdown(data.answer);
                chatMessages.appendChild(finalDiv);

                // Chat içindeki kodları da renklendir
                setTimeout(() => {
                    document.querySelectorAll(`#${finalDivId} pre code`).forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }, 10);
            }
        } catch (err) {
            document.getElementById(loadingId).remove();
            addMessage('Bağlantı hatası.', true);
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });

    // --- CONTEXT MENU VE TABS LOGIC ---
    function handleContextMenu(e, file, element) {
        e.preventDefault();
        rightClickedFile = file;
        rightClickedElement = element;
        
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
    }

    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    });

    menuExplain.addEventListener('click', () => {
        contextMenu.style.display = 'none';
        if (rightClickedFile && rightClickedElement) {
            selectFile(rightClickedFile, rightClickedElement);
        }
    });

    menuInspect.addEventListener('click', () => {
        contextMenu.style.display = 'none';
        if (rightClickedFile) {
            openEditorTab(rightClickedFile);
        }
    });

    function openEditorTab(file) {
        const fileId = file.webkitRelativePath || file.name;
        
        // Zaten açık mı kontrol et
        const existingTab = openedTabs.find(t => t.id === fileId);
        if (existingTab) {
            activateTab(fileId);
            return;
        }

        // Dosyayı oku
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const newTab = { id: fileId, name: file.name, content: content, file: file };
            openedTabs.push(newTab);
            
            renderTabs();
            activateTab(fileId);
        };
        reader.readAsText(file);
    }

    function renderTabs() {
        editorTabsBar.innerHTML = '';
        if (openedTabs.length === 0) {
            editorPane.style.display = 'none';
            return;
        }

        editorTabsBar.style.display = 'flex';
        openedTabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = 'editor-tab';
            if (tab.id === activeTabId) tabEl.classList.add('active');
            
            tabEl.innerHTML = `
                <span class="tab-name">${tab.name}</span>
                <span class="close-tab" title="Kapat">×</span>
            `;
            
            tabEl.querySelector('.tab-name').addEventListener('click', () => activateTab(tab.id));
            tabEl.querySelector('.close-tab').addEventListener('click', (e) => {
                e.stopPropagation();
                closeTab(tab.id);
            });
            
            editorTabsBar.appendChild(tabEl);
        });
    }

    function activateTab(tabId) {
        activeTabId = tabId;
        const tabData = openedTabs.find(t => t.id === tabId);
        if (!tabData) return;

        // UI geçişleri
        editorPane.style.display = 'flex';
        
        renderTabs(); // Aktif sınıfını güncellemek için
        
        // İçeriği göster ve renklendir
        editorCodeContent.textContent = tabData.content;
        
        if (window.hljs) {
            editorCodeContent.className = 'hljs';
            delete editorCodeContent.dataset.highlighted; // Highlight.js'in tekrar çalışması için gerekli
            const ext = tabData.name.split('.').pop();
            if (ext) editorCodeContent.classList.add(`language-${ext}`);
            hljs.highlightElement(editorCodeContent);
        }
    }

    function closeTab(tabId) {
        openedTabs = openedTabs.filter(t => t.id !== tabId);
        if (openedTabs.length > 0) {
            if (activeTabId === tabId) {
                activateTab(openedTabs[openedTabs.length - 1].id);
            } else {
                renderTabs();
            }
        } else {
            activeTabId = null;
            renderTabs();
        }
    }
});
