// PDF查看器初始化
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

let selectedText = '';
const selectionMenu = document.getElementById('selection-menu');
let currentPdf = null;

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
document.addEventListener('DOMContentLoaded', () => {
    loadPDF();
});