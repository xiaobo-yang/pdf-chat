// PDF查看器初始化
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

let selectedText = '';
const selectionMenu = document.getElementById('selection-menu');
let currentPdf = null;
let currentScale = 1.75;
const SCALE_STEP = 0.25;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

// 全局变量
let chatHistories = {};  // 存储所有对话历史
let currentChatId = 'default';  // 当前对话ID

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
function addMessage(sender, text, skipHistory = false) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (!skipHistory && currentChatId) {
        // 确保 messages 数组存在
        if (!chatHistories[currentChatId].messages) {
            chatHistories[currentChatId].messages = [];
        }
        chatHistories[currentChatId].messages.push({
            role: sender,
            content: text
        });
        saveChatHistories();
    }
}

// 发送聊天消息
async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    
    if (text) {
        // 立即清空输入框
        input.value = '';
        
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
    }
}

// 回车发送消息
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 页面加载完成后加载PDF
document.addEventListener('DOMContentLoaded', async function() {
    initializeSidebar();
    initializeUploader();
    initializePdfControls();
    initializeHistorySidebar();
    
    // 加载历史对话
    await loadChatHistories();
    
    // 加载PDF文件列表
    await loadPdfFiles();
});

function initializeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止事件冒泡
        sidebar.classList.toggle('collapsed');
    });
    
    // 点击 sidebar 内部时阻止事件冒泡
    sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 点击其他区域时折叠侧边栏
    document.addEventListener('click', () => {
        if (!sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
        }
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
    // 清除文件输入框的值，这样同一个文件可以被重新选择
    e.target.value = '';
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
    // 添加data-url属性到fileItem
    fileItem.dataset.url = fileInfo.url;
    fileItem.innerHTML = `
        <label class="checkbox-container">
            <input type="checkbox" class="file-checkbox" data-url="${fileInfo.url}">
            <span class="checkmark"></span>
        </label>
        <i class="fas fa-file-pdf"></i>
        <span>${fileInfo.name}</span>
        <span class="file-size">${formatFileSize(fileInfo.size)}</span>
        <i class="fas fa-times delete-file"></i>
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

    // 添加删除按钮事件
    const deleteBtn = fileItem.querySelector('.delete-file');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFile(fileInfo.url);
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
                
                // 清除文件输入框的值
                document.getElementById('pdf-upload').value = '';
                
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
        <button onclick="toggleFullscreen()" id="fullscreen-btn">
            <i class="fas fa-expand"></i> 全屏
        </button>
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

// 添加全屏相关函数
function toggleFullscreen() {
    const chatContainer = document.querySelector('.chat-container');
    const pdfViewer = document.querySelector('.pdf-viewer');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (!chatContainer.classList.contains('floating')) {
        // 进入全屏模式
        pdfViewer.classList.add('fullscreen');
        chatContainer.classList.add('floating');
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> 退出全屏';
        initializeDraggableChat();
    } else {
        // 退出全屏模式
        pdfViewer.classList.remove('fullscreen');
        chatContainer.classList.remove('floating');
        chatContainer.classList.remove('collapsed');
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> 全屏';
        // 重置聊天框位置
        chatContainer.style.transform = 'none';
        // 移除拖动事件监听器
        removeDraggableChat();
    }
}

// 添加移除拖动功能的函数
function removeDraggableChat() {
    const chatContainer = document.querySelector('.chat-container');
    const chatHeader = chatContainer.querySelector('.chat-header');
    
    if (chatHeader) {
        // 移除事件监听器
        const listeners = chatContainer.dragListeners;
        if (listeners) {
            chatHeader.removeEventListener('mousedown', listeners.dragStart);
            document.removeEventListener('mousemove', listeners.drag);
            document.removeEventListener('mouseup', listeners.dragEnd);
        }
        // 移除头部
        chatHeader.remove();
    }
}

// 初始化可拖动聊天框
function initializeDraggableChat() {
    const chatContainer = document.querySelector('.chat-container');
    const chatHeader = document.createElement('div');
    chatHeader.className = 'chat-header';
    chatHeader.innerHTML = `
        <div class="chat-title">AI助手</div>
        <div class="chat-controls">
            <button class="minimize-btn"><i class="fas fa-minus"></i></button>
            <button class="restore-btn" style="display:none;"><i class="fas fa-plus"></i></button>
        </div>
    `;
    
    if (!chatContainer.querySelector('.chat-header')) {
        chatContainer.insertBefore(chatHeader, chatContainer.firstChild);
    }

    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX;
    let initialY;

    function dragStart(e) {
        if (e.target.closest('.chat-header') && !e.target.closest('button')) {
            isDragging = true;
            const rect = chatContainer.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            // 计算新位置
            let newX = e.clientX - initialX;
            let newY = e.clientY - initialY;
            
            // 获取窗口尺寸和聊天框尺寸
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const boxWidth = chatContainer.offsetWidth;
            const boxHeight = chatContainer.offsetHeight;
            
            // 限制范围
            newX = Math.max(0, Math.min(newX, windowWidth - boxWidth));
            newY = Math.max(0, Math.min(newY, windowHeight - boxHeight));
            
            chatContainer.style.left = `${newX}px`;
            chatContainer.style.top = `${newY}px`;
            chatContainer.style.right = 'auto';  // 清除right属性
        }
    }

    function dragEnd() {
        isDragging = false;
    }

    // 最小化按钮事件
    chatContainer.querySelector('.minimize-btn').addEventListener('click', () => {
        chatContainer.classList.add('collapsed');
        chatContainer.querySelector('.minimize-btn').style.display = 'none';
        chatContainer.querySelector('.restore-btn').style.display = 'flex';
    });

    // 还原按钮事件
    chatContainer.querySelector('.restore-btn').addEventListener('click', () => {
        chatContainer.classList.remove('collapsed');
        chatContainer.querySelector('.minimize-btn').style.display = 'flex';
        chatContainer.querySelector('.restore-btn').style.display = 'none';
    });

    // 允许折叠状态下点击整个图标来还原
    chatContainer.addEventListener('click', (e) => {
        if (chatContainer.classList.contains('collapsed') && 
            !e.target.closest('.chat-controls')) {
            chatContainer.classList.remove('collapsed');
            chatContainer.querySelector('.minimize-btn').style.display = 'flex';
            chatContainer.querySelector('.restore-btn').style.display = 'none';
        }
    });

    chatHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    chatContainer.dragListeners = {
        dragStart,
        drag,
        dragEnd
    };
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

// 初始化历史记录边栏
function initializeHistorySidebar() {
    const sidebar = document.querySelector('.history-sidebar');
    const toggleBtn = document.querySelector('.history-toggle');
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止事件冒泡
        sidebar.classList.toggle('collapsed');
    });
    
    // 点击 sidebar 内部时阻止事件冒泡
    sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 点击其他区域时折叠侧边栏
    document.addEventListener('click', () => {
        if (!sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
        }
    });
    
    // 默认折叠历史记录栏
    sidebar.classList.add('collapsed');
}

// 新建对话
async function newChat() {
    // 生成新的对话ID
    currentChatId = 'chat_' + Date.now();
    
    // 清空当前对话框
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    // 保存当前对话到历史记录
    addChatToHistory(currentChatId);
    
    // 清除所有历史项的激活状态
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 激活新创建的对话项
    const newHistoryItem = document.querySelector(`.history-item[data-chat-id="${currentChatId}"]`);
    if (newHistoryItem) {
        newHistoryItem.classList.add('active');
    }
}

// 添加对话到历史记录列表
function addChatToHistory(chatId) {
    const historyList = document.querySelector('.history-list');
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.dataset.chatId = chatId;
    
    // 生成默认名称
    const date = new Date();
    const defaultName = `对话 ${date.toLocaleString()}`;
    
    // 如果是新会话，将其添加到 chatHistories
    if (!chatHistories[chatId]) {
        chatHistories[chatId] = {
            name: defaultName,
            messages: []
        };
    }
    
    historyItem.innerHTML = `
        <i class="fas fa-comments"></i>
        <span class="chat-name">${chatHistories[chatId].name}</span>
        <i class="fas fa-pencil-alt edit-history"></i>
        <i class="fas fa-times delete-history"></i>
    `;
    
    // 点击切换对话
    historyItem.addEventListener('click', (e) => {
        // 确保不是点击编辑或删除按钮
        if (!e.target.matches('.edit-history, .delete-history')) {
            switchChat(chatId);
        }
    });
    
    // 编辑会话名称
    const editBtn = historyItem.querySelector('.edit-history');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nameSpan = historyItem.querySelector('.chat-name');
        const currentName = nameSpan.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'edit-name-input';
        
        nameSpan.replaceWith(input);
        input.focus();
        
        input.addEventListener('blur', () => {
            const newName = input.value.trim() || currentName;
            nameSpan.textContent = newName;
            input.replaceWith(nameSpan);
            // 更新存储的名称
            chatHistories[chatId].name = newName;
            saveChatHistories();
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    });
    
    // 删除对话
    const deleteBtn = historyItem.querySelector('.delete-history');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChat(chatId);
    });
    
    // 根据是否是新会话决定插入位置
    if (chatHistories[chatId].messages.length === 0) {
        // 新会话插入到顶部
        historyList.insertBefore(historyItem, historyList.firstChild);
    } else {
        // 加载已有会话时追加到列表
        historyList.appendChild(historyItem);
    }
}

// 切换到指定对话
function switchChat(chatId) {
    if (!chatHistories[chatId]) return;
    
    currentChatId = chatId;
    
    // 清空当前对话框
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    // 加载会话消息
    chatHistories[chatId].messages.forEach(msg => {
        addMessage(msg.role, msg.content, true);
    });
    
    // 更新激活状态
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
        }
    });
    
    saveChatHistories();
}

// 修改删除对话函数
function deleteChat(chatId) {
    // 从DOM中移除
    const historyItem = document.querySelector(`.history-item[data-chat-id="${chatId}"]`);
    if (!historyItem) return;
    
    // 获取历史记录列表
    const historyList = document.querySelector('.history-list');
    const totalChats = historyList.children.length;
    
    // 判断是否是当前选中的对话
    const isCurrentChat = chatId === currentChatId;
    
    // 如果是当前对话，需要切换到其他对话
    if (isCurrentChat) {
        // 获取要删除的元素的前一个兄弟元素（如果存在）
        const prevItem = historyItem.previousElementSibling;
        // 如果没有前一个，就获取后一个
        const nextItem = historyItem.nextElementSibling;
        
        // 删除元素
        historyItem.remove();
        
        // 从存储中删除
        delete chatHistories[chatId];
        
        // 如果删除后还有其他对话
        if (totalChats > 1) {
            // 优先切换到前一个对话，如果没有就切换到后一个
            if (prevItem) {
                switchChat(prevItem.dataset.chatId);
            } else if (nextItem) {
                switchChat(nextItem.dataset.chatId);
            }
        } else {
            // 如果这是最后一个对话，创建新对话
            newChat();
        }
    } else {
        // 如果不是当前对话，直接删除即可
        historyItem.remove();
        delete chatHistories[chatId];
    }
    
    // 在删除对话后保存历史记录
    saveChatHistories();
}

// 保存聊天历史到本地文件
async function saveChatHistories() {
    try {
        const response = await fetch('/api/save-histories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                histories: chatHistories,
                currentChatId: currentChatId
            })
        });
        if (!response.ok) {
            throw new Error('保存聊天历史失败');
        }
    } catch (error) {
        console.error('保存聊天历史出错:', error);
    }
}

// 加载聊天历史
async function loadChatHistories() {
    try {
        const response = await fetch('/api/load-histories');
        const data = await response.json();
        if (data.histories) {
            chatHistories = data.histories;
            // 重建历史记录UI
            const historyList = document.querySelector('.history-list');
            historyList.innerHTML = '';
            
            // 按时间戳倒序排序（新的在前）
            const sortedChatIds = Object.keys(chatHistories).sort((a, b) => {
                // 从ID中提取时间戳
                const timeA = parseInt(a.split('_')[1]);
                const timeB = parseInt(b.split('_')[1]);
                return timeB - timeA;  // 倒序排序
            });
            
            // 按排序后的顺序添加到历史记录
            sortedChatIds.forEach(chatId => {
                addChatToHistory(chatId);
            });
            
            // 如果有当前会话ID，切换到它
            if (data.currentChatId && chatHistories[data.currentChatId]) {
                switchChat(data.currentChatId);
            } else if (sortedChatIds.length > 0) {
                // 否则切换到最新的会话
                switchChat(sortedChatIds[0]);
            } else {
                // 如果没有任何会话，创建新会话
                newChat();
            }
        } else {
            newChat();
        }
    } catch (error) {
        console.error('加载聊天历史出错:', error);
        newChat();
    }
}

// 加载PDF文件列表
async function loadPdfFiles() {
    try {
        const response = await fetch('/api/load-pdfs');
        const data = await response.json();
        if (data.files) {
            data.files.forEach(file => {
                addFileToList({
                    name: file.name,
                    url: file.url,
                    size: file.size
                });
            });
        }
    } catch (error) {
        console.error('加载PDF文件列表失败:', error);
    }
}