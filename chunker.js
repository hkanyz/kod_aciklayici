function chunkCode(code, filename, minLine, maxLine) {
    const ext = filename ? filename.split('.').pop().toLowerCase() : '';
    
    if (['html', 'htm', 'md'].includes(ext)) {
        return chunkHtmlStyle(code, minLine, maxLine);
    } else if (ext === 'py') {
        return chunkPythonStyle(code, minLine, maxLine);
    } else {
        return chunkCStyle(code, minLine, maxLine);
    }
}

// ============================================
// C, JS, CSS AİLESİ (SÜSLÜ PARANTEZ MANTIĞI)
// ============================================
function chunkCStyle(code, minLine, maxLine) {
    const lines = code.split('\n');
    const chunks = [];
    
    let currentLineIdx = minLine ? Math.max(0, parseInt(minLine) - 1) : 0;
    const absoluteEndIdx = maxLine ? Math.min(lines.length - 1, parseInt(maxLine) - 1) : lines.length - 1;

    while (currentLineIdx <= absoluteEndIdx) {
        let endLineIdx = Math.min(currentLineIdx + 24, absoluteEndIdx);
        
        let lastClosingBracketIdx = -1;
        for (let i = endLineIdx; i >= currentLineIdx; i--) {
            if (lines[i].includes('}')) {
                lastClosingBracketIdx = i;
                break;
            }
        }

        if (lastClosingBracketIdx !== -1) {
            endLineIdx = lastClosingBracketIdx;
        } else {
            let hasOpening = false;
            for (let i = currentLineIdx; i <= endLineIdx; i++) {
                if (lines[i].includes('{')) {
                    hasOpening = true;
                    break;
                }
            }

            if (hasOpening) {
                while (endLineIdx < absoluteEndIdx) {
                    let found = false;
                    const nextEnd = Math.min(endLineIdx + 10, absoluteEndIdx);
                    for (let i = endLineIdx + 1; i <= nextEnd; i++) {
                        if (lines[i].includes('}')) {
                            endLineIdx = i;
                            found = true;
                            break;
                        }
                    }
                    if (found) break; 
                    endLineIdx = nextEnd; 
                }
            }
        }

        const chunkLines = lines.slice(currentLineIdx, endLineIdx + 1);
        chunks.push({
            startLine: currentLineIdx + 1,
            endLine: endLineIdx + 1,
            code: chunkLines.join('\n')
        });

        currentLineIdx = endLineIdx + 1;
    }

    return chunks;
}

// ============================================
// HTML AİLESİ (ANA TAŞIYICI ETİKET MANTIĞI)
// ============================================
function chunkHtmlStyle(code, minLine, maxLine) {
    const lines = code.split('\n');
    const chunks = [];
    
    let currentLineIdx = minLine ? Math.max(0, parseInt(minLine) - 1) : 0;
    const absoluteEndIdx = maxLine ? Math.min(lines.length - 1, parseInt(maxLine) - 1) : lines.length - 1;

    const mainTags = ['</div>', '</section>', '</table>', '</ul>', '</ol>', '</form>', '</main>', '</header>', '</footer>'];
    
    let insideScriptOrStyle = false;

    while (currentLineIdx <= absoluteEndIdx) {
        let endLineIdx = Math.min(currentLineIdx + 24, absoluteEndIdx);
        
        // O anki satırların içinde script veya style var mı diye hızlıca tarayalım
        let hasScriptStyleOpen = false;
        let hasScriptStyleClose = false;
        
        for (let i = currentLineIdx; i <= endLineIdx; i++) {
            if (lines[i].includes('<script') || lines[i].includes('<style')) insideScriptOrStyle = true;
            if (lines[i].includes('</script>') || lines[i].includes('</style>')) insideScriptOrStyle = false;
        }

        if (insideScriptOrStyle) {
            // FALLBACK: C-Style süslü parantez mantığına dön
            let lastClosingBracketIdx = -1;
            for (let i = endLineIdx; i >= currentLineIdx; i--) {
                if (lines[i].includes('}')) {
                    lastClosingBracketIdx = i;
                    break;
                }
            }

            if (lastClosingBracketIdx !== -1) {
                endLineIdx = lastClosingBracketIdx;
            } else {
                let hasOpening = false;
                for (let i = currentLineIdx; i <= endLineIdx; i++) {
                    if (lines[i].includes('{')) {
                        hasOpening = true;
                        break;
                    }
                }
                if (hasOpening) {
                    while (endLineIdx < absoluteEndIdx) {
                        let found = false;
                        const nextEnd = Math.min(endLineIdx + 10, absoluteEndIdx);
                        for (let i = endLineIdx + 1; i <= nextEnd; i++) {
                            if (lines[i].includes('}')) {
                                endLineIdx = i;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                        endLineIdx = nextEnd;
                    }
                }
            }
        } else {
            // NORMAL HTML MANTIĞI: Sadece ana taşıyıcıları (mainTags) ara
            let lastMainClosingIdx = -1;
            for (let i = endLineIdx; i >= currentLineIdx; i--) {
                if (mainTags.some(tag => lines[i].includes(tag))) {
                    lastMainClosingIdx = i;
                    break;
                }
            }

            if (lastMainClosingIdx !== -1) {
                endLineIdx = lastMainClosingIdx;
            } else {
                // Ana taşıyıcı yoksa 10'ar satır esnet
                while (endLineIdx < absoluteEndIdx) {
                    let found = false;
                    const nextEnd = Math.min(endLineIdx + 10, absoluteEndIdx);
                    for (let i = endLineIdx + 1; i <= nextEnd; i++) {
                        if (mainTags.some(tag => lines[i].includes(tag))) {
                            endLineIdx = i;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                    endLineIdx = nextEnd;
                }
            }
        }

        const chunkLines = lines.slice(currentLineIdx, endLineIdx + 1);
        chunks.push({
            startLine: currentLineIdx + 1,
            endLine: endLineIdx + 1,
            code: chunkLines.join('\n')
        });

        currentLineIdx = endLineIdx + 1;
    }

    return chunks;
}

// ============================================
// PYTHON AİLESİ (GÜVENLİ SATIR MANTIĞI)
// ============================================
function chunkPythonStyle(code, minLine, maxLine) {
    const lines = code.split('\n');
    const chunks = [];
    
    let currentLineIdx = minLine ? Math.max(0, parseInt(minLine) - 1) : 0;
    const absoluteEndIdx = maxLine ? Math.min(lines.length - 1, parseInt(maxLine) - 1) : lines.length - 1;

    const isSafeLine = (lineStr, nextLineStr) => {
        const trimmed = lineStr.trim();
        if (trimmed === '') return true; 
        if (trimmed.endsWith(':')) return false; 
        if (trimmed.endsWith('(') || trimmed.endsWith('[') || trimmed.endsWith('{')) return false; 
        
        if (nextLineStr) {
            const nextTrimmed = nextLineStr.trim();
            if (nextTrimmed.startsWith('else:') || nextTrimmed.startsWith('elif') || nextTrimmed.startsWith('except') || nextTrimmed.startsWith('finally:')) {
                return false; 
            }
        }
        return true;
    };

    while (currentLineIdx <= absoluteEndIdx) {
        let endLineIdx = Math.min(currentLineIdx + 24, absoluteEndIdx);
        
        let safeIdx = -1;
        for (let i = endLineIdx; i >= currentLineIdx; i--) {
            const nextLineStr = (i + 1 <= absoluteEndIdx) ? lines[i + 1] : null;
            if (isSafeLine(lines[i], nextLineStr)) {
                safeIdx = i;
                break;
            }
        }

        if (safeIdx !== -1) {
            endLineIdx = safeIdx;
        } else {
            while (endLineIdx < absoluteEndIdx) {
                let found = false;
                const nextEnd = Math.min(endLineIdx + 10, absoluteEndIdx);
                for (let i = endLineIdx + 1; i <= nextEnd; i++) {
                    const nextLineStr = (i + 1 <= absoluteEndIdx) ? lines[i + 1] : null;
                    if (isSafeLine(lines[i], nextLineStr)) {
                        endLineIdx = i;
                        found = true;
                        break;
                    }
                }
                if (found) break;
                endLineIdx = nextEnd;
            }
        }

        const chunkLines = lines.slice(currentLineIdx, endLineIdx + 1);
        chunks.push({
            startLine: currentLineIdx + 1,
            endLine: endLineIdx + 1,
            code: chunkLines.join('\n')
        });

        currentLineIdx = endLineIdx + 1;
    }

    return chunks;
}

module.exports = { chunkCode };
