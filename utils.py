import requests
import json

class OllamaClient:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url
        
    def chat(self, model, prompt, stream=False):
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": stream
        }
        
        response = requests.post(url, json=payload, stream=stream)
        
        if stream:
            # 流式响应处理
            for line in response.iter_lines():
                if line:
                    try:
                        # 解码并解析每一行JSON
                        json_response = json.loads(line.decode('utf-8'))
                        if 'done' in json_response and json_response['done']:
                            # 跳过最后的完成标记
                            continue
                        yield json_response
                    except json.JSONDecodeError:
                        continue
        else:
            # 非流式响应处理
            return response.json()
    
