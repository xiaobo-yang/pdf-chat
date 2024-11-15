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
  - 维护AI助手的参考文件列表

- `templates/index.html`: 主页面模板
  - 定义页面基本结构
  - 包含PDF查看器、文件管理侧边栏和聊天界面
  - 集成文件上传输入框

- `static/css/style.css`: 样式文件
  - 定义页面布局和样式
  - 实现响应式设计
  - 控制组件外观

- `static/js/main.js`: 主要JavaScript逻辑
  - PDF文件处理和显示
  - 文本选择和AI交互
  - 文件管理功能
    - 文件上传状态管理
    - 自动清除文件输入框缓存
    - 确保文件可以重复上传
  - 缩放控制

### 实现细节

#### 文件管理机制
- 使用文件输入框（`<input type="file">`）处理文件上传
- 在删除文件后自动清除输入框状态，确保同一文件可以立即重新上传
- 维护物理文件和AI助手参考文件列表的同步

#### 缓存处理
- 主动清除文件输入框值（`input.value = ''`）
- 避免浏览器缓存影响文件重复上传
- 确保文件操作的一致性和可预测性

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