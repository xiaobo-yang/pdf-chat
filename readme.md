# PDF阅读器与AI助手

一个集成了PDF阅读、文本分析和AI对话功能的Web应用。

## 项目结构

```
project/
├── static/
│   ├── css/
│   │   └── style.css      # 样式文件
│   └── js/
│       └── main.js        # 主要JavaScript逻辑
├── templates/
│   └── index.html         # 主页面模板
└── app.py                 # Flask后端应用
```

### 文件说明

- `app.py`: Flask后端应用
  - 处理文件上传和删除
  - 提供AI接口服务
  - 管理文件存储

- `templates/index.html`: 主页面模板
  - 定义页面基本结构
  - 包含PDF查看器、文件管理侧边栏和聊天界面

- `static/css/style.css`: 样式文件
  - 定义页面布局和样式
  - 实现响应式设计
  - 控制组件外观

- `static/js/main.js`: 主要JavaScript逻辑
  - PDF文件处理和显示
  - 文本选择和AI交互
  - 文件管理功能
  - 缩放控制

## 安装和运行

1. 安装依赖
    ```
    pip install flask
    ```
2. 创建上传文件放置目录
    ```
    mkdir uploads
    ```
3. 运行应用
    ```
    DASHSCOPE_API_KEY=<api_key> python app.py
    ```
4. 访问应用
    打开浏览器访问 http://localhost:5000