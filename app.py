from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from werkzeug.utils import secure_filename
import json
from ollama_api_demo import OllamaClient
from qwen_agent.agents import Assistant

app = Flask(__name__)

# 创建Ollama客户端实例
ollama_bot = OllamaClient(base_url="http://localhost:11434")

# 配置Qwen模型
llm_cfg = {
    'model': 'qwen-max',
    'model_server': 'dashscope',
    'generate_cfg': {
        'top_p': 0.8
    }
}

# 创建Qwen助手实例
qwen_bot = Assistant(
    llm=llm_cfg,
    system_message="你是一个有帮助的助手，可以帮助用户进行翻译、解析和对话。请直接回答用户的问题，无需解释你的角色。"
)

# 配置上传文件夹
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'pdf'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 确保上传文件夹存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 添加根路由
@app.route('/')
def index():
    return render_template('index.html')

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_ai_response(messages, model="ollama"):
    """获取AI回复"""
    if model == "ollama":
        # Ollama API调用
        conversation = ""
        for msg in messages:
            if msg['role'] != 'system':
                role = msg['role']
                content = msg['content']
                conversation += f"{role}: {content}\n"
        conversation += "assistant: "
        response = ollama_bot.chat("llama3.2", conversation)
        return [{'role': 'assistant', 'content': response['message']['content']}]
    else:
        # Qwen API调用
        # 确保消息列表的格式正确
        formatted_messages = []
        
        # 添加历史消息
        for msg in messages:
            if msg['role'] != 'system':  # 跳过任何额外的系统消息
                formatted_messages.append(msg)
        print(f'[DEBUG] messages sent to AI: {formatted_messages}')
        responses = []
        for response in qwen_bot.run(messages=formatted_messages):
            responses = response
        return responses

@app.route('/api/chat', methods=['POST'])
def handle_chat():
    text = request.json.get('text', '')
    messages = request.json.get('messages', [])
    model = request.json.get('model', 'ollama')  # 获取选择的模型
    print(f'[DEBUG] chat model used: {model}')
    
    current_messages = messages + [{
        'role': 'user',
        'content': text
    }]
    
    responses = get_ai_response(current_messages, model)
    return jsonify({'result': responses[-1]['content']})

@app.route('/api/translate', methods=['POST'])
def handle_translate():
    text = request.json.get('text', '')
    model = request.json.get('model', 'ollama')
    print(f'[DEBUG] translate model used: {model}')
    prompt = f"请将以下文本翻译成中文：\n{text}"
    
    # 使用chat方法，与普通对话保持一致
    if model == "ollama":
        response = ollama_bot.chat("llama3.2", prompt)
        return jsonify({'result': response['message']['content']})
    else:
        messages = [{
            'role': 'user',
            'content': prompt
        }]
        
        responses = get_ai_response(messages, model)
        return jsonify({'result': responses[-1]['content']})

@app.route('/api/analyze', methods=['POST'])
def handle_analyze():
    text = request.json.get('text', '')
    prompt = f"""请解析以下文本的含义，并从以下几个方面进行分析：
1. 主要内容
2. 关键概念
3. 重要观点
4. 相关背景（如果有）

文本：{text}"""
    model = request.json.get('model', 'ollama')
    print(f'[DEBUG] analyze model used: {model}')
    # 使用chat方法，与普通对话保持一致
    if model == "ollama":
        response = ollama_bot.chat("llama3.2", prompt)
        return jsonify({'result': response['message']['content']})
    else:
        messages = [{
            'role': 'user',
            'content': prompt
        }]
        
        responses = get_ai_response(messages, model)
        return jsonify({'result': responses[-1]['content']})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'pdf' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['pdf']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        folder = app.config['UPLOAD_FOLDER']
        os.makedirs(folder, exist_ok=True)
        filepath = os.path.join(folder, filename)
        file.save(filepath)
        return jsonify({
            'message': 'File uploaded successfully',
            'pdf_url': f'/static/uploads/{filename}'
        })
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/delete-file', methods=['POST'])
def delete_file():
    try:
        model = request.json.get('model', 'ollama')
        print(f'[DEBUG] delete file model used: {model}')
        assert model == 'qwen', "Only Qwen model supports file deletion"
        data = request.json
        file_url = data.get('url')
        
        # 从URL获取文件名
        filename = os.path.basename(file_url)
        file_path = os.path.join('static/uploads', filename)
        
        # 删除物理文件
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Deleted file: {file_path}")
            
        # 如果文件在bot的参考文件列表中，也要移除
        if file_path in qwen_bot.mem.system_files:
            qwen_bot.mem.system_files.remove(file_path)
            print(f"Removed from bot's reference files: {file_path}")
            
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error deleting file {file_path}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/update-reference-files', methods=['POST'])
def update_reference_files():
    try:
        model = request.json.get('model', 'ollama')
        print(f'[DEBUG] update reference files model used: {model}')
        assert model == 'qwen', "Only Qwen model supports file deletion"
        data = request.json
        file_url = data.get('url')
        is_checked = data.get('checked')
        
        # 将URL转换为实际文件路径
        file_path = os.path.join('static/uploads', os.path.basename(file_url))
        
        if is_checked:
            if file_path not in qwen_bot.mem.system_files:
                qwen_bot.mem.system_files.append(file_path)
                print(f'[DEBUG] added to system files: {file_path}')
        else:
            if file_path in qwen_bot.mem.system_files:
                qwen_bot.mem.system_files.remove(file_path)
                
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-histories', methods=['POST'])
def save_histories():
    try:
        data = request.json
        histories = data.get('histories', {})
        current_chat_id = data.get('currentChatId')
        
        # 确保存储目录存在
        histories_path = os.path.join('static', 'histories')
        os.makedirs(histories_path, exist_ok=True)
        
        # 保存历史记录和当前会话ID
        save_data = {
            'histories': histories,
            'currentChatId': current_chat_id
        }
        
        with open(os.path.join(histories_path, 'chat_histories.json'), 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"保存历史记录失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/load-histories')
def load_histories():
    try:
        histories_path = os.path.join('static', 'histories', 'chat_histories.json')
        if os.path.exists(histories_path):
            with open(histories_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data)
        return jsonify({'histories': {}, 'currentChatId': None})
    except Exception as e:
        print(f"加载历史记录失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/load-pdfs')
def load_pdfs():
    try:
        pdf_files = []
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.lower().endswith('.pdf'):
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                pdf_files.append({
                    'name': filename,
                    'url': f'/static/uploads/{filename}',
                    'size': os.path.getsize(file_path)
                })
        return jsonify({'files': pdf_files})
    except Exception as e:
        print(f"加载PDF文件列表失败: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)