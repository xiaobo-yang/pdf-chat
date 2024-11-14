from flask import Flask, render_template, request, jsonify, send_from_directory
from qwen_agent.agents import Assistant
import os

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

if __name__ == '__main__':
    app.run(debug=True)