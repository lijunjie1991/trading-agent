# TradingAgents 架构说明

## 系统架构

```
┌─────────────┐
│   前端 UI   │ (React + Ant Design)
│  Port 3000  │
└──────┬──────┘
       │ HTTP + WebSocket
       ▼
┌─────────────────────────────┐
│   Java Spring Boot 服务      │
│      Port 8080              │
│                             │
│  - 用户认证 & 授权 (JWT)     │
│  - 任务管理 API             │
│  - WebSocket 代理           │
└──────┬──────────────┬───────┘
       │              │ WebSocket 转发
       │ HTTP         │
       ▼              ▼
┌──────────────┐  ┌────────────────┐
│   MySQL DB   │  │ Python FastAPI │
│  Port 3306   │  │   Port 8000    │
└──────▲───────┘  │                │
       │          │ - LangGraph    │
       │          │ - TradingAgents│
       │          │ - LLM 调用     │
       │          └────────┬───────┘
       │                   │
       └───────────────────┘
         Python 直接写入数据库
```

## 数据流

### 1. 任务提交流程

```
用户 → 前端 → Java → Python
                ↓
             MySQL (创建任务记录)
                ↓
             Python 后台执行
                ↓
             MySQL (更新状态、保存报告)
```

### 2. 实时进度推送（可选）

```
Python → WebSocket → Java → 前端
   ↓
 MySQL (同时写入)
```

### 3. 数据查询

```
用户 → 前端 → Java → MySQL (读取)
```

## 关键设计决策

### ✅ Python 直接写数据库

**原因：**
- Python 端有一手数据（LLM 响应、分析结果）
- 减少中间环节，避免数据不一致
- 不依赖 WebSocket 连接

**实现：**
- Python 使用 SQLAlchemy ORM
- 与 Java JPA 实体结构一致
- 共享同一个 MySQL 数据库

### ✅ WebSocket 仅用于实时推送

**职责：**
- 前端 ←→ Java ←→ Python 消息转发
- 不涉及数据持久化
- 连接断开不影响数据完整性

### ✅ Java 端负责业务逻辑

**职责：**
- 用户认证和授权
- 权限控制（用户只能查看自己的任务）
- 任务创建和用户关联
- 数据查询 API

## 数据库表结构

### users
- id (主键)
- email
- password
- created_at
- updated_at

### tasks
- id (主键)
- **task_id (UUID, 索引)** ← Python 和 Java 通过此字段关联
- user_id (外键 → users.id)
- ticker
- analysis_date
- selected_analysts (JSON)
- research_depth
- status (PENDING/RUNNING/COMPLETED/FAILED)
- final_decision
- error_message
- created_at
- completed_at

### reports
- id (主键)
- task_id (外键 → tasks.id)
- report_type
- content (TEXT)
- created_at

## 环境变量配置

### Java (.env 或 application.yml)
```yaml
DB_USERNAME=root
DB_PASSWORD=123456
PYTHON_SERVICE_URL=http://98.82.131.247:8000
PYTHON_WS_URL=ws://98.82.131.247:8000/ws/analysis
```

### Python (.env)
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tradingagent
DB_USERNAME=root
DB_PASSWORD=123456
OPENAI_API_KEY=your-key
```

## 部署注意事项

1. **数据库连接**
   - 确保 Python 和 Java 都能连接到同一个 MySQL 实例
   - 生产环境使用连接池

2. **用户关联**
   - Java 创建任务时必须设置 `user_id`
   - Python 通过 `task_id` (UUID) 更新任务

3. **WebSocket 可选**
   - 即使 WebSocket 不可用，数据仍会正确保存
   - 仅影响实时展示

4. **权限控制**
   - Java 端验证用户只能访问自己的任务
   - Python 端不做权限检查（信任 Java 端）

## 故障恢复

- **WebSocket 断开**: 数据已保存，前端刷新页面即可恢复
- **Python 服务重启**: 正在执行的任务会失败，已完成的任务数据完整
- **MySQL 故障**: 系统不可用，恢复后数据完整
