from flask import Flask, render_template, request, jsonify, send_from_directory
from qwen_agent.agents import Assistant
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

# 配置AI模型
llm_cfg = {
    'model': 'qwen-max',
    'model_server': 'dashscope',
    'generate_cfg': {
        'top_p': 0.8
    }
}

# 创建AI助手实例
bot = Assistant(
    llm=llm_cfg,
    system_message="你是一个有帮助的助手，可以帮助用户进行翻译、解析和对话。请直接回答用户的问题，无需解释你的角色。",
)

# 存储对话历史
chat_histories = {}

# 配置上传文件夹
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'pdf'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 确保上传文件夹存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_ai_response(messages):
    """获取AI回复"""
    responses = []
    for response in bot.run(messages=messages):
        responses = response
    return responses

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def handle_chat():
    text = request.json.get('text', '')
    session_id = request.json.get('session_id', 'default')
    
    # 获取或创建会话历史
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    
    # 添加用户消息
    chat_histories[session_id].append({
        'role': 'user',
        'content': text
    })
    
    # 获取AI回复
    responses = get_ai_response(chat_histories[session_id])
    
    # 更新对话历史
    chat_histories[session_id].extend(responses)
    
    # 返回最后一条回复
    return jsonify({'result': responses[-1]['content']})

@app.route('/api/translate', methods=['POST'])
def handle_translate():
    text = request.json.get('text', '')
    session_id = request.json.get('session_id', 'default')
    
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    
    # 构建翻译提示
    prompt = f"请将以下文本翻译成中文：\n{text}"
    
    # 添加用户消息
    chat_histories[session_id].append({
        'role': 'user',
        'content': prompt
    })
    
    # 获取AI回复
    responses = get_ai_response(chat_histories[session_id])
    
    # 更新对话历史
    chat_histories[session_id].extend(responses)
    
    return jsonify({'result': responses[-1]['content']})

@app.route('/api/analyze', methods=['POST'])
def handle_analyze():
    text = request.json.get('text', '')
    session_id = request.json.get('session_id', 'default')
    
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    
    # 构建解析提示
    prompt = f"""请解析以下文本的含义，并从以下几个方面进行分析：
1. 主要内容
2. 关键概念
3. 重要观点
4. 相关背景（如果有）

文本：{text}"""
    
    # 添加用户消息
    chat_histories[session_id].append({
        'role': 'user',
        'content': prompt
    })
    
    # 获取AI回复
    responses = get_ai_response(chat_histories[session_id])
    
    # 更新对话历史
    chat_histories[session_id].extend(responses)
    
    return jsonify({'result': responses[-1]['content']})

@app.route('/static/sample.pdf')
def sample_pdf():
    return send_from_directory('static', 'sample.pdf')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'pdf' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['pdf']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({
            'message': 'File uploaded successfully',
            'pdf_url': f'/static/uploads/{filename}'
        })
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/delete-file', methods=['POST'])
def delete_file():
    data = request.json
    file_url = data.get('url')
    if not file_url:
        return jsonify({'error': 'No file URL provided'}), 400
    
    # 从URL中提取文件名
    filename = os.path.basename(file_url)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({'message': 'File deleted successfully'})
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)