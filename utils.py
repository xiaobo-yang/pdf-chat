import requests
import json

class OllamaClient:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url
        
    def chat(self, model_name, message, stream=False):
        """基础的聊天功能"""
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user", 
                    "content": message
                }
            ],
            "stream": stream
        }
        
        response = requests.post(url, json=payload)
        return response.json()
    
    def generate(self, model_name, prompt, stream=False):
        """基础的生成功能"""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": stream
        }
        
        response = requests.post(url, json=payload)
        return response.json()

# 使用示例
if __name__ == "__main__":
    client = OllamaClient(base_url="http://localhost:11435")
    
    # 聊天示例
    chat_response = client.chat("llama3.2", "你好,请简单介绍一下自己")
    print("\n=== 聊天回复 ===")
    print(chat_response["message"]["content"])
    
    # 生成示例
    gen_response = client.generate("llama3.2", "写一句关于春天的话，不超过十个字")
    print("\n=== 生成内容 ===") 
    print(gen_response["response"])
