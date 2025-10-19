# 🚀 TradingAgents API 快速测试指南

## 第一步: 安装依赖

```bash
cd backend/python_service
pip install -r requirements.txt
```

## 第二步: 配置API密钥

确保你的环境变量中有以下密钥,或者在项目根目录的`.env`文件中配置:

```bash
# 在项目根目录(TradingAgents/)
export OPENAI_API_KEY=sk-your-openai-key
export ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
```

## 第三步: 启动服务

```bash
python main.py
```

你会看到:
```
╔═══════════════════════════════════════════════════════════╗
║         TradingAgents FastAPI Service                     ║
║                                                           ║
║  API 文档: http://localhost:8000/docs                     ║
║  健康检查: http://localhost:8000/api/v1/health           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## 第四步: 测试API

### 方法1: 使用浏览器 (最简单)

1. 打开浏览器访问: **http://localhost:8000/docs**
2. 你会看到Swagger UI自动生成的API文档
3. 点击 `POST /api/v1/analysis/start`
4. 点击 `Try it out`
5. 编辑请求体:
```json
{
  "ticker": "NVDA",
  "analysis_date": "2024-05-10"
}
```
6. 点击 `Execute`
7. 复制响应中的 `task_id`

### 方法2: 使用curl

```bash
# 1. 健康检查
curl http://localhost:8000/api/v1/health

# 2. 启动分析
curl -X POST http://localhost:8000/api/v1/analysis/start \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "NVDA",
    "analysis_date": "2024-05-10",
    "selected_analysts": ["market", "news"],
    "research_depth": 1
  }'

# 你会得到类似的响应:
# {
#   "task_id": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "pending",
#   "message": "分析任务已创建: NVDA",
#   "created_at": "2024-10-16T17:00:00"
# }

# 3. 查询任务状态 (替换YOUR_TASK_ID)
curl http://localhost:8000/api/v1/analysis/YOUR_TASK_ID

# 4. 获取完整报告
curl http://localhost:8000/api/v1/analysis/YOUR_TASK_ID/reports
```

### 方法3: 使用Postman

1. 打开Postman
2. 点击 `Import`
3. 选择文件: `test_requests/TradingAgents_API.postman_collection.json`
4. 设置环境变量 `base_url` = `http://localhost:8000`
5. 运行集合中的测试

## 第五步: 测试WebSocket实时进度

### 使用浏览器 (推荐)

1. 在浏览器中打开文件: `test_websocket.html`
   ```bash
   # macOS
   open test_websocket.html

   # Linux
   xdg-open test_websocket.html

   # Windows
   start test_websocket.html
   ```

2. 输入从API获取的 `task_id`
3. 点击 "🔌 连接 WebSocket"
4. 你会实时看到:
   - 📊 状态更新
   - 💬 LLM推理消息
   - 🔧 工具调用
   - 📄 报告生成

### 使用Python脚本

```python
import websocket
import json
import threading

def on_message(ws, message):
    data = json.loads(message)
    print(f"\n[{data['type']}] {data['timestamp']}")

    if data['type'] == 'status':
        print(f"  状态: {data['data']['status']}")
        if 'decision' in data['data']:
            print(f"  决策: {data['data']['decision']}")

    elif data['type'] == 'report':
        print(f"  报告类型: {data['data']['report_type']}")
        print(f"  内容长度: {len(data['data']['content'])} 字符")

    elif data['type'] == 'tool_call':
        print(f"  工具: {data['data']['tool_name']}")

    elif data['type'] == 'message':
        content = data['data']['content'][:100]
        print(f"  消息: {content}...")

def on_error(ws, error):
    print(f"错误: {error}")

def on_close(ws, close_status_code, close_msg):
    print("WebSocket 连接已关闭")

def on_open(ws):
    print("✅ WebSocket 连接成功")
    # 发送心跳
    def run():
        import time
        while True:
            time.sleep(30)
            ws.send("ping")
    threading.Thread(target=run).start()

# 替换为你的task_id
task_id = "YOUR_TASK_ID_HERE"
ws_url = f"ws://localhost:8000/ws/analysis/{task_id}"

ws = websocket.WebSocketApp(
    ws_url,
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)

ws.run_forever()
```

## 完整测试流程示例

```bash
# 终端1: 启动服务
cd backend/python_service
python main.py

# 终端2: 执行测试
# 1. 健康检查
curl http://localhost:8000/api/v1/health

# 2. 启动分析并保存task_id
TASK_ID=$(curl -s -X POST http://localhost:8000/api/v1/analysis/start \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "analysis_date": "2024-05-10",
    "selected_analysts": ["market"],
    "research_depth": 1
  }' | python -c "import sys, json; print(json.load(sys.stdin)['task_id'])")

echo "Task ID: $TASK_ID"

# 3. 在浏览器中打开WebSocket测试页面
open test_websocket.html
# 然后输入 $TASK_ID 并点击连接

# 4. 等待分析完成(观察WebSocket实时进度)

# 5. 查询最终结果
curl http://localhost:8000/api/v1/analysis/$TASK_ID | python -m json.tool

# 6. 获取完整报告
curl http://localhost:8000/api/v1/analysis/$TASK_ID/reports | python -m json.tool
```

## 预期结果

### 健康检查响应
```json
{
  "status": "healthy",
  "service": "TradingAgents API",
  "timestamp": "2024-10-16T17:00:00",
  "active_tasks": 1,
  "active_websockets": 1
}
```

### 启动分析响应
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "分析任务已创建: AAPL",
  "created_at": "2024-10-16T17:00:00"
}
```

### WebSocket消息示例

**状态更新:**
```json
{
  "type": "status",
  "timestamp": "2024-10-16T17:00:01",
  "data": {
    "status": "running",
    "message": "开始分析 AAPL on 2024-05-10"
  }
}
```

**工具调用:**
```json
{
  "type": "tool_call",
  "timestamp": "2024-10-16T17:00:05",
  "data": {
    "tool_name": "get_stock_data",
    "args": {
      "ticker": "AAPL"
    }
  }
}
```

**报告生成:**
```json
{
  "type": "report",
  "timestamp": "2024-10-16T17:00:30",
  "data": {
    "report_type": "market_report",
    "content": "## 市场分析\n..."
  }
}
```

**完成状态:**
```json
{
  "type": "status",
  "timestamp": "2024-10-16T17:05:00",
  "data": {
    "status": "completed",
    "decision": "BUY",
    "message": "分析完成! 决策: BUY"
  }
}
```

## 常见问题排查

### 1. ModuleNotFoundError: No module named 'fastapi'
```bash
pip install -r requirements.txt
```

### 2. 环境变量未设置
```bash
# 检查环境变量
echo $OPENAI_API_KEY
echo $ALPHA_VANTAGE_API_KEY

# 如果为空,设置它们
export OPENAI_API_KEY=sk-your-key
export ALPHA_VANTAGE_API_KEY=your-key
```

### 3. 端口8000已被占用
```bash
# 修改main.py最后一行的端口号
uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
```

### 4. WebSocket连接失败
- 确保服务正在运行
- 确认task_id正确
- 检查浏览器控制台的错误信息

## 下一步

完成Python API测试后,你可以:

1. ✅ **确认所有API端点正常工作**
2. ✅ **验证WebSocket实时推送功能**
3. ✅ **测试不同股票和配置参数**
4. 📝 **开始Java后端开发**
5. 🎨 **开始前端界面开发**
6. 🗄️ **设计数据库架构**

## 测试清单

- [ ] 服务成功启动
- [ ] 健康检查返回200
- [ ] 启动分析任务成功
- [ ] 获取task_id
- [ ] WebSocket成功连接
- [ ] 接收到实时进度消息
- [ ] 分析任务完成
- [ ] 查询任务详情成功
- [ ] 获取报告成功
- [ ] 列出所有任务成功

全部通过后,Python API服务就完成了! 🎉
