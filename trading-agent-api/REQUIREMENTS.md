# TradingAgents 全栈项目需求文档

## 📋 项目概述

将现有的 TradingAgents CLI 命令行应用改造为一个完整的 Web 应用系统,包含:
- **Spring Boot 后端**: 用户管理、任务管理、数据持久化
- **React 前端**: 现代化的 Web UI 界面
- **Python 服务**: 保持原有的 LLM 多智能体分析功能

## 🎯 核心需求

### 1. 用户系统

#### 1.1 用户注册
- 用户可以通过用户名、邮箱、密码注册账号
- 注册时需要验证:
  - 用户名唯一性(3-50字符)
  - 邮箱格式和唯一性
  - 密码强度(最少6位)
- 注册成功后自动登录,返回JWT Token

#### 1.2 用户登录
- 用户通过用户名和密码登录
- 登录成功返回JWT Token
- Token有效期24小时
- 前端需要持久化存储Token(localStorage)

#### 1.3 用户认证
- 所有业务API需要验证JWT Token
- Token失效后跳转到登录页
- 支持获取当前登录用户信息

### 2. 任务管理

#### 2.1 提交分析任务
- **输入参数**:
  - Ticker (股票代码): 必填,如 "NVDA", "AAPL"
  - Analysis Date (分析日期): 必填,格式 YYYY-MM-DD
  - Selected Analysts (选择的分析师): 至少选一个
    - Market (市场分析师)
    - Social (社交媒体分析师)
    - News (新闻分析师)
    - Fundamentals (基本面分析师)
  - Research Depth (研究深度): 1-5,表示辩论轮数

- **处理流程**:
  1. Java后端接收任务请求
  2. 调用Python服务的 `/api/v1/analysis/start` 接口
  3. Python服务返回 task_id
  4. Java后端保存任务记录到数据库,关联当前用户
  5. 返回任务信息给前端

- **任务状态**:
  - PENDING: 待处理
  - RUNNING: 运行中
  - COMPLETED: 已完成
  - FAILED: 失败

#### 2.2 实时进度展示(WebSocket)
- 前端通过WebSocket连接到 `ws://localhost:8080/ws/analysis/{taskId}`
- Java后端作为WebSocket代理,连接到Python服务的WebSocket
- 实时接收并转发以下消息类型:
  - **status**: 任务状态变更
  - **message**: LLM推理过程
  - **tool_call**: 工具调用信息
  - **report**: 生成的报告
  - **agent_status**: Agent运行状态(自定义)

- **自动持久化**:
  - Java后端监听WebSocket消息
  - 自动保存 report 到数据库
  - 自动更新任务状态

#### 2.3 查看任务列表
- 用户可以查看自己提交的所有任务
- 按创建时间倒序排列
- 显示信息:
  - 任务ID
  - 股票代码
  - 分析日期
  - 状态
  - 最终决策(如果已完成)
  - 创建时间
  - 完成时间

#### 2.4 查看任务详情
- 查看单个任务的完整信息
- 包含所有生成的报告
- 显示任务执行过程中的关键指标

#### 2.5 查看历史报告
- 用户可以查看任务生成的所有报告
- 报告类型:
  - market_report (市场分析报告)
  - sentiment_report (情绪分析报告)
  - news_report (新闻分析报告)
  - fundamentals_report (基本面报告)
  - investment_plan (投资计划)
  - trader_investment_plan (交易员投资计划)
  - final_trade_decision (最终交易决策)

### 3. 前端UI需求

#### 3.1 页面结构
- **登录页** (`/login`)
  - 用户名/密码输入
  - 登录按钮
  - 跳转到注册页链接

- **注册页** (`/register`)
  - 用户名/邮箱/密码输入
  - 注册按钮
  - 跳转到登录页链接

- **仪表盘** (`/dashboard`)
  - 显示用户信息
  - 快速统计(总任务数、进行中、已完成)
  - 最近任务列表

- **新建任务** (`/task/new`)
  - 任务提交表单
  - 提交后自动跳转到任务详情页

- **任务详情/实时进度** (`/task/:taskId`)
  - 任务基本信息
  - 横向进度条(4个阶段):
    1. 分析阶段 (Analyst Team)
    2. 研究阶段 (Research Team)
    3. 交易阶段 (Trading Team)
    4. 风险管理 (Risk Management)
  - Agent状态面板(左侧):
    - 显示12个Agent的状态
    - pending/running/completed 三种状态
    - 实时更新
  - 消息面板(右侧):
    - 实时显示推理消息
    - 工具调用信息
    - Markdown格式渲染
  - 统计面板:
    - Tool Calls 数量
    - LLM Calls 数量
    - Generated Reports 数量
  - 当前报告显示区域

- **历史任务** (`/tasks`)
  - 任务列表
  - 筛选功能(按状态、日期)
  - 搜索功能(按股票代码)
  - 点击进入任务详情

#### 3.2 UI设计要求
- 使用Ant Design组件库
- 响应式设计,支持桌面和移动端
- 渐变色背景(类似现有的 test_websocket.html)
- 卡片式布局
- 实时进度需要有动画效果:
  - 运行中的Agent有脉动动画
  - 进度条有渐变和动画
- Markdown内容正确渲染(使用marked.js)

#### 3.3 交互要求
- 表单验证和错误提示
- 加载状态显示
- 操作成功/失败提示(Toast)
- WebSocket断线自动重连
- Token过期自动跳转登录

## 🔧 技术要求

### 后端 (Spring Boot)
- Java 17+
- Spring Boot 3.2.x
- Spring Security + JWT
- Spring Data JPA
- MySQL 8.0 (生产) / H2 (开发)
- Spring WebSocket
- Maven构建

### 前端 (React)
- React 18
- Vite作为构建工具
- React Router v6 (路由)
- Redux Toolkit (状态管理)
- Ant Design (UI组件库)
- Axios (HTTP请求)
- marked.js (Markdown渲染)
- 原生WebSocket API

### Python服务 (已存在)
- FastAPI
- WebSocket支持
- 端口: 8000

## 📊 数据模型

### 数据库表设计

#### users 表
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- BCrypt加密
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### tasks 表
```sql
CREATE TABLE tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_id VARCHAR(36) UNIQUE NOT NULL,  -- UUID from Python service
    user_id BIGINT NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    analysis_date DATE NOT NULL,
    selected_analysts TEXT,  -- JSON array: ["market", "social"]
    research_depth INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING/RUNNING/COMPLETED/FAILED
    final_decision VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_task_id (task_id),
    INDEX idx_status (status)
);
```

#### reports 表
```sql
CREATE TABLE reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id)
);
```

## 🔌 API接口规范

### 认证接口

#### POST /api/auth/register
注册新用户

**请求体:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "type": "Bearer",
  "userId": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

#### POST /api/auth/login
用户登录

**请求体:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "type": "Bearer",
  "userId": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

#### GET /api/auth/me
获取当前用户信息

**请求头:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

### 任务接口

#### POST /api/tasks
提交新任务

**请求头:**
```
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "ticker": "NVDA",
  "analysisDate": "2024-05-10",
  "selectedAnalysts": ["market", "social", "news"],
  "researchDepth": 1
}
```

**响应:**
```json
{
  "id": 1,
  "taskId": "uuid-from-python",
  "ticker": "NVDA",
  "analysisDate": "2024-05-10",
  "selectedAnalysts": ["market", "social", "news"],
  "researchDepth": 1,
  "status": "PENDING",
  "finalDecision": null,
  "errorMessage": null,
  "createdAt": "2024-01-15T10:30:00",
  "completedAt": null
}
```

#### GET /api/tasks
获取用户任务列表

**请求头:**
```
Authorization: Bearer {token}
```

**响应:**
```json
[
  {
    "id": 1,
    "taskId": "uuid-from-python",
    "ticker": "NVDA",
    "analysisDate": "2024-05-10",
    "selectedAnalysts": ["market", "social"],
    "researchDepth": 1,
    "status": "COMPLETED",
    "finalDecision": "BUY",
    "errorMessage": null,
    "createdAt": "2024-01-15T10:30:00",
    "completedAt": "2024-01-15T10:45:00"
  }
]
```

#### GET /api/tasks/{taskId}
获取任务详情

**请求头:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "id": 1,
  "taskId": "uuid-from-python",
  "ticker": "NVDA",
  "analysisDate": "2024-05-10",
  "selectedAnalysts": ["market"],
  "researchDepth": 1,
  "status": "COMPLETED",
  "finalDecision": "BUY",
  "errorMessage": null,
  "createdAt": "2024-01-15T10:30:00",
  "completedAt": "2024-01-15T10:45:00"
}
```

#### GET /api/tasks/{taskId}/reports
获取任务报告列表

**请求头:**
```
Authorization: Bearer {token}
```

**响应:**
```json
[
  {
    "id": 1,
    "reportType": "market_report",
    "content": "# Market Analysis\n\n...",
    "createdAt": "2024-01-15T10:35:00"
  },
  {
    "id": 2,
    "reportType": "final_trade_decision",
    "content": "# Final Decision: BUY\n\n...",
    "createdAt": "2024-01-15T10:45:00"
  }
]
```

### WebSocket接口

#### WS /ws/analysis/{taskId}
任务实时进度

**连接:**
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/analysis/uuid-from-python');
```

**消息格式:**
```json
{
  "type": "message",
  "timestamp": "2024-01-15T10:35:00",
  "data": {
    "content": "Analyzing market data...",
    "stats": {
      "tool_calls": 5,
      "llm_calls": 12,
      "reports": 1
    }
  }
}
```

**消息类型:**
- `status`: 任务状态更新
- `message`: LLM推理消息
- `tool_call`: 工具调用
- `report`: 生成报告
- `agent_status`: Agent状态(自定义)

## 🎨 UI/UX要求

### 设计风格
- **颜色主题**:
  - 主色: 紫色渐变 (#667eea → #764ba2)
  - 成功色: 绿色 (#48bb78)
  - 警告色: 橙色 (#ed8936)
  - 错误色: 红色 (#f56565)
  - 背景: 白色卡片 + 渐变背景

- **排版**:
  - 字体: 'Segoe UI', sans-serif
  - 标题: 粗体,层级分明
  - 内容: 行高1.6-1.8,易读

- **组件**:
  - 圆角设计(6-12px)
  - 阴影效果(box-shadow)
  - 悬停效果(hover)
  - 过渡动画(transition)

### 交互反馈
- 按钮点击有视觉反馈
- 表单错误即时显示
- 加载状态有Spinner
- 操作结果有Toast提示
- WebSocket连接状态显示

### 响应式设计
- 桌面端: ≥1200px
- 平板端: 768px - 1199px
- 移动端: <768px

## 🚀 部署要求

### 开发环境
- Python服务: localhost:8000
- Java服务: localhost:8080
- React前端: localhost:3000 或 localhost:5173

### 生产环境
- 使用Docker容器化部署
- Nginx反向代理
- MySQL数据库
- HTTPS加密

## ✅ 验收标准

### 功能验收
1. ✅ 用户可以成功注册和登录
2. ✅ 登录后可以提交分析任务
3. ✅ 实时看到任务执行进度(WebSocket)
4. ✅ 任务完成后可以查看报告
5. ✅ 可以查看历史任务列表
6. ✅ 所有报告正确保存到数据库
7. ✅ Markdown内容正确渲染
8. ✅ Agent状态实时更新准确

### 性能验收
1. 页面加载时间 < 2秒
2. API响应时间 < 500ms
3. WebSocket消息延迟 < 100ms
4. 支持并发任务执行

### 安全验收
1. 密码BCrypt加密存储
2. JWT Token正确验证
3. API接口有权限控制
4. 防止SQL注入
5. XSS防护

## 📝 补充说明

### 与现有CLI的关系
- Python服务保持不变,继续提供分析功能
- 新增Java后端作为中间层,处理用户和任务管理
- 现有的test_websocket.html作为前端UI参考
- 最终用户通过React前端访问整个系统

### 扩展性考虑
- 支持多用户并发使用
- 任务队列管理(未来可能需要)
- 报告导出功能(PDF/Excel)
- 数据可视化图表
- 任务分享功能
