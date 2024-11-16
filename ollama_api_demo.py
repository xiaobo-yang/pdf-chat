import requests
import json

class OllamaClient:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url
        
    def chat(self, model_name, message, stream=True):
        """支持流式输出的聊天功能"""
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
        
        # 使用stream=True来获取流式响应
        response = requests.post(url, json=payload, stream=True)
        
        if stream:
            # 流式处理响应
            for line in response.iter_lines():
                if line:
                    json_response = json.loads(line)
                    if json_response.get("message", {}).get("content"):
                        # 只打印内容部分
                        print(json_response["message"]["content"], end="", flush=True)
        else:
            return response.json()
    
    def generate(self, model_name, prompt, stream=True):
        """支持流式输出的生成功能"""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": stream
        }
        
        # 使用stream=True来获取流式响应
        response = requests.post(url, json=payload, stream=True)
        
        if stream:
            # 流式处理响应
            for line in response.iter_lines():
                if line:
                    json_response = json.loads(line)
                    if json_response.get("response"):
                        # 只打印响应内容
                        print(json_response["response"], end="", flush=True)
        else:
            return response.json()

# 使用示例
if __name__ == "__main__":
    client = OllamaClient(base_url="http://localhost:11434")
    
    print("\n=== 聊天回复 ===")
    # 聊天示例（流式输出）
    client.chat("llama3.2", "你好,请简单介绍一下自己")
    
    print("\n\n=== 生成内容 ===")
    # 生成示例（流式输出）
    client.generate("llama3.2", "写一句关于春天的话，不超过十个字")
    print("\n")