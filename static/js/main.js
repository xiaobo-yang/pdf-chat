// PDF查看器初始化
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

let selectedText = '';
const selectionMenu = document.getElementById('selection-menu');
let currentPdf = null;
let currentScale = 1.75;
const SCALE_STEP = 0.25;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

// 创建浮动按钮
const floatingMenu = document.createElement('div');
floatingMenu.className = 'floating-menu';
floatingMenu.innerHTML = `
    <button class="analyze" onclick="handleAnalyze()">解析</button>
    <button class="translate" onclick="handleTranslate()">翻译</button>
    <button class="copy" onclick="handleCopy()">复制</button>
    <button class="chat" onclick="handleChat()">对话</button>
`;
document.body.appendChild(floatingMenu);

// 加载示例PDF
async function loadPDF(url = '/static/sample.pdf') {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        currentPdf = await loadingTask.promise;
        
        const container = document.getElementById('pdf-container');
        container.innerHTML = '';
        
        // 加载所有页面
        for (let pageNum = 1; pageNum <= currentPdf.numPages; pageNum++) {
            const page = await currentPdf.getPage(pageNum);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            // 创建页面容器
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page';
            pageContainer.style.position = 'relative';
            container.appendChild(pageContainer);

            // 创建canvas层
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            pageContainer.appendChild(canvas);

            // 创建文本层容器
            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.height = `${viewport.height}px`;
            pageContainer.appendChild(textLayerDiv);

            // 渲染canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // 渲染文本层
            const textContent = await page.getTextContent();
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            });
        }
    } catch (error) {
        console.error('Error loading PDF:', error);
        addMessage('system', '无法加载PDF文件');
    }
}

// 监听文本选择事件
document.addEventListener('mouseup', function(e) {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();
    
    if (selectedText && e.target.closest('.pdf-viewer')) {
        // 显示浮动菜单在鼠标位置
        floatingMenu.style.display = 'flex';
        
        // 计算位置，确保不超出视窗
        const x = Math.min(e.pageX, window.innerWidth - floatingMenu.offsetWidth);
        const y = Math.min(e.pageY, window.innerHeight - floatingMenu.offsetHeight);
        
        floatingMenu.style.left = `${x}px`;
        floatingMenu.style.top = `${y}px`;
    } else {
        floatingMenu.style.display = 'none';
    }
});

// 点击其他地方时隐藏菜单
document.addEventListener('mousedown', function(e) {
    if (!floatingMenu.contains(e.target)) {
        floatingMenu.style.display = 'none';
    }
});

// 处理解析请求
async function handleAnalyze() {
    if (!selectedText) return;
    
    // 自动将选中文本发送到对话框
    addMessage('user', selectedText);
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: selectedText })
        });
        
        const data = await response.json();
        addMessage('system', data.result);
    } catch (error) {
        addMessage('system', '解析请求失败');
    }
    floatingMenu.style.display = 'none';
}

// 处理翻译请求
async function handleTranslate() {
    if (!selectedText) return;
    
    addMessage('user', `翻译: ${selectedText}`);
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: selectedText })
        });
        
        const data = await response.json();
        addMessage('system', data.result);
    } catch (error) {
        addMessage('system', '翻译请求失败');
    }
    floatingMenu.style.display = 'none';
}

// 处理复制功能
function handleCopy() {
    if (!selectedText) return;
    navigator.clipboard.writeText(selectedText);
    floatingMenu.style.display = 'none';
}

// 处理对话功能
function handleChat() {
    if (!selectedText) return;
    const input = document.getElementById('user-input');
    input.value = selectedText;
    sendMessage();
    floatingMenu.style.display = 'none';
}

// 添加消息到聊天框
function addMessage(sender, text) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 发送聊天消息
async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    
    if (text) {
        addMessage('user', text);
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });
            
            const data = await response.json();
            addMessage('system', data.result);
        } catch (error) {
            addMessage('system', '消息发送失败');
        }
        input.value = '';
    }
}

// 回车发送消息
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 页面加载完成后加载PDF
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    initializeUploader();
    initializePdfControls();
});

function initializeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
    
    // 默认折叠侧边栏
    sidebar.classList.add('collapsed');
}

function initializeUploader() {
    const fileInput = document.getElementById('pdf-upload');
    const uploadContainer = document.getElementById('upload-container');
    const uploadArea = document.querySelector('.upload-area');
    const uploadBtn = document.getElementById('upload-btn');

    // 修复初始上传按钮
    uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });

    // 修复上传区域点击
    uploadArea.addEventListener('click', (e) => {
        if (e.target !== uploadBtn) {
            fileInput.click();
        }
    });

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ target: { files: files } });
        }
    });

    fileInput.addEventListener('change', handleFileSelect);
}

async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    for (const file of files) {
        if (file.type === 'application/pdf') {
            await uploadFile(file);
        }
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            addFileToList({
                name: file.name,
                url: data.pdf_url,
                size: file.size
            });
            
            // 如果是第一个文件，显示它
            if (document.querySelector('.file-item.active') === null) {
                showFile(data.pdf_url);
            }
        }
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

function addFileToList(fileInfo) {
    const fileList = document.querySelector('.file-list');
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <label class="checkbox-container">
            <input type="checkbox" class="file-checkbox" data-url="${fileInfo.url}">
            <span class="checkmark"></span>
        </label>
        <i class="fas fa-file-pdf"></i>
        <span>${fileInfo.name}</span>
        <span class="file-size">${formatFileSize(fileInfo.size)}</span>
        <i class="fas fa-times delete-file" onclick="event.stopPropagation(); deleteFile('${fileInfo.url}')"></i>
    `;
    
    // 修改点击事件
    fileItem.addEventListener('click', (e) => {
        if (!e.target.matches('.file-checkbox, .delete-file')) {
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
            });
            fileItem.classList.add('active');
            showFile(fileInfo.url);
        }
    });

    // 添加复选框事件
    const checkbox = fileItem.querySelector('.file-checkbox');
    checkbox.addEventListener('change', async function(e) {
        e.stopPropagation();
        try {
            const response = await fetch('/update-reference-files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: this.dataset.url,
                    checked: this.checked
                })
            });
            if (!response.ok) {
                throw new Error('Failed to update reference files');
            }
        } catch (error) {
            console.error('Error updating reference files:', error);
            this.checked = !this.checked; // 恢复选中状态
        }
    });

    fileList.appendChild(fileItem);
}

async function deleteFile(url) {
    try {
        const response = await fetch('/delete-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });

        if (response.ok) {
            const fileItem = document.querySelector(`.file-item[data-url="${url}"]`);
            if (fileItem) {
                fileItem.remove();
                
                // 如果没有文件了，显示上传区域
                const fileList = document.querySelector('.file-list');
                if (fileList.children.length === 0) {
                    document.getElementById('upload-container').style.display = 'flex';
                    document.getElementById('pdf-container').style.display = 'none';
                } else {
                    // 如果还有其他文件，显示第一个
                    const firstFile = fileList.firstElementChild;
                    if (firstFile) {
                        firstFile.click();
                    }
                }
            }
        }
    } catch (error) {
        console.error('Delete failed:', error);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 修改showFile函数
async function showFile(url) {
    try {
        document.getElementById('upload-container').style.display = 'none';
        const pdfContainer = document.getElementById('pdf-container');
        pdfContainer.style.display = 'block';
        document.querySelector('.pdf-controls').style.display = 'flex';

        const loadingTask = pdfjsLib.getDocument(url);
        currentPdf = await loadingTask.promise;
        await renderPDF(currentPdf);
    } catch (error) {
        console.error('Error loading PDF:', error);
    }
}

function initializePdfControls() {
    const controls = document.createElement('div');
    controls.className = 'pdf-controls';
    controls.innerHTML = `
        <button onclick="zoomIn()"><i class="fas fa-search-plus"></i> 放大</button>
        <button onclick="zoomOut()"><i class="fas fa-search-minus"></i> 缩小</button>
        <button onclick="resetZoom()"><i class="fas fa-undo"></i> 重置</button>
    `;
    document.querySelector('.pdf-viewer').appendChild(controls);
}

function zoomIn() {
    if (currentScale < MAX_SCALE) {
        currentScale += SCALE_STEP;
        reloadPDF();
    }
}

function zoomOut() {
    if (currentScale > MIN_SCALE) {
        currentScale -= SCALE_STEP;
        reloadPDF();
    }
}

function resetZoom() {
    currentScale = 1.75;
    reloadPDF();
}

async function reloadPDF() {
    if (!currentPdf) return;
    await renderPDF(currentPdf);
}

async function renderPDF(pdf) {
    const container = document.getElementById('pdf-container');
    container.innerHTML = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale });

        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page';
        pageContainer.style.position = 'relative';
        container.appendChild(pageContainer);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        pageContainer.appendChild(canvas);

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        pageContainer.appendChild(textLayerDiv);

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const textContent = await page.getTextContent();
        pdfjsLib.renderTextLayer({
            textContent: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: []
        });
    }
}