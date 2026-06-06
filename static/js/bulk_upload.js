(() => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewSection = document.getElementById('previewSection');
    const previewBody = document.getElementById('previewBody');
    const itemsCount = document.getElementById('itemsCount');
    const clearBtn = document.getElementById('clearBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const resultSection = document.getElementById('resultSection');

    let products = [];
    const categoryMap = {
        'semenaO': 'Семена овощей',
        'cvety': 'Цветы',
        'ovoshi': 'Овощи',
        'posadochny_material': 'Посадочный материал'
    };

    function decodeText(buffer) {
        const encodings = ['windows-1251', 'utf-8', 'iso-8859-1', 'koi8-r'];
        
        for (let encoding of encodings) {
            try {
                const decoder = new TextDecoder(encoding);
                const text = decoder.decode(buffer);
                
                if (text.includes('')) continue;
                
                if (/^[а-яА-ЯёЁa-zA-Z]/.test(text.trim())) {
                    return text;
                }
            } catch (e) {
                continue;
            }
        }
        
        const decoder = new TextDecoder('windows-1251');
        return decoder.decode(buffer);
    }

    function detectDelimiter(text) {
        const firstLine = text.split('\n')[0];
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        
        if (tabCount >= commaCount && tabCount >= semicolonCount) return '\t';
        if (semicolonCount > commaCount) return ';';
        return ',';
    }

    function parseCSV(text) {
        const delimiter = detectDelimiter(text);
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return [];
        
        const headers = parseLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
        const result = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = parseLine(lines[i], delimiter);
            if (values.length < headers.length) continue;
            
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = values[idx]?.trim() || '';
            });
            result.push(obj);
        }
        return result;
    }

    function parseLine(line, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    function validateProduct(p) {
        const errors = [];
        if (!p.name) errors.push('Нет названия');
        if (!p.description) errors.push('Нет описания');
        if (!p.price || isNaN(parseFloat(p.price))) errors.push('Неверная цена');
        if (!p.category_slug || !categoryMap[p.category_slug]) errors.push('Неверная категория');
        return errors;
    }

    function handleFile(file) {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv') && !file.name.endsWith('.txt')) {
            alert('Пожалуйста, выберите CSV/TSV файл');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target.result;
                const text = decodeText(buffer);
                const parsed = parseCSV(text);
                
                products = parsed.map(p => {
                    const normalized = {};
                    Object.keys(p).forEach(key => {
                        normalized[key.trim().toLowerCase()] = p[key] ? p[key].trim() : '';
                    });

                    return {
                        name: normalized.name || '',
                        description: normalized.description || '',
                        price: normalized.price || '0',
                        category_slug: normalized.category_slug || '',
                        image_urls: normalized.image_urls || normalized.image_url || '',
                        errors: []
                    };
                }).filter(p => p.name || p.description || p.price);

                products.forEach(p => {
                    p.errors = validateProduct(p);
                });

                renderPreview();
            } catch (err) {
                alert('Ошибка чтения файла: ' + err.message);
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function renderPreview() {
        if (!products.length) {
            previewSection.style.display = 'none';
            return;
        }

        previewSection.style.display = 'block';
        itemsCount.textContent = `(${products.length} товаров)`;
        previewBody.innerHTML = '';

        products.forEach((p, idx) => {
            const tr = document.createElement('tr');
            const isValid = p.errors.length === 0;
            
            tr.innerHTML = `
                <td contenteditable="true" data-field="name" data-idx="${idx}">${p.name}</td>
                <td contenteditable="true" data-field="description" data-idx="${idx}">${p.description}</td>
                <td contenteditable="true" data-field="price" data-idx="${idx}">${p.price}</td>
                <td contenteditable="true" data-field="category_slug" data-idx="${idx}">${p.category_slug}</td>
                <td contenteditable="true" data-field="image_urls" data-idx="${idx}">${p.image_urls}</td>
                <td style="color:${isValid ? 'var(--success)' : 'var(--error)'};font-size:13px;">
                    ${isValid ? 'Готов' : p.errors.join(', ')}
                </td>
                <td>
                    <button class="delete-mini" data-idx="${idx}">Удалить</button>
                </td>
            `;
            previewBody.appendChild(tr);
        });

        previewBody.querySelectorAll('[contenteditable]').forEach(cell => {
            cell.addEventListener('blur', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                products[idx][field] = e.target.textContent.trim();
                products[idx].errors = validateProduct(products[idx]);
                renderPreview();
            });
        });

        previewBody.querySelectorAll('.delete-mini').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                products.splice(idx, 1);
                renderPreview();
            });
        });
    }

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    clearBtn.addEventListener('click', () => {
        products = [];
        previewSection.style.display = 'none';
        resultSection.style.display = 'none';
        fileInput.value = '';
    });

    uploadBtn.addEventListener('click', async () => {
        const validProducts = products.filter(p => p.errors.length === 0);
        if (!validProducts.length) {
            alert('Нет товаров без ошибок!');
            return;
        }

        console.log('Отправка данных:', JSON.stringify({ products: validProducts }, null, 2));
        
        if (!confirm(`Загрузить ${validProducts.length} товаров?`)) return;

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Загрузка...';

        try {
            const res = await fetch('/admin/bulk-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ products: validProducts })
            });

            const data = await res.json();
            
            if (data.success) {
                resultSection.innerHTML = `
                    <div class="flash flash-success">
                        Успешно загружено: <strong>${data.created}</strong> товаров. 
                        Ошибок: ${data.errors.length}.
                        ${data.errors.length ? '<br> ' + data.errors.join('<br> ') : ''}
                    </div>
                `;
                resultSection.style.display = 'block';
                products = [];
                previewSection.style.display = 'none';
            } else {
                resultSection.innerHTML = `<div class="flash flash-error">Ошибка: ${data.error || 'Неизвестная ошибка'}</div>`;
                resultSection.style.display = 'block';
            }
        } catch (err) {
            resultSection.innerHTML = `<div class="flash flash-error">Ошибка сети: ${err.message}</div>`;
            resultSection.style.display = 'block';
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Загрузить товары';
        }
    });
})();