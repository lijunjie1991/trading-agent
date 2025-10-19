"""
TradingAgents FastAPI Service
提供HTTP API和WebSocket接口,包装TradingAgents核心功能
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
import json
import os
import uuid
from datetime import datetime
from enum import Enum

# 导入TradingAgents核心组件
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG
from dotenv import load_dotenv

load_dotenv()

# ==================== 数据模型定义 ====================

class AnalystType(str, Enum):
    """分析师类型"""
    MARKET = "market"
    SOCIAL = "social"
    NEWS = "news"
    FUNDAMENTALS = "fundamentals"

class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class AnalysisRequest(BaseModel):
    """分析请求模型"""
    ticker: str = Field(..., description="股票代码", example="NVDA")
    analysis_date: str = Field(..., description="分析日期 YYYY-MM-DD", example="2024-05-10")
    selected_analysts: List[AnalystType] = Field(
        default=[AnalystType.MARKET, AnalystType.SOCIAL, AnalystType.NEWS, AnalystType.FUNDAMENTALS],
        description="选择的分析师"
    )
    research_depth: int = Field(default=1, ge=1, le=5, description="研究深度(辩论轮数)")
    llm_provider: str = Field(default="openai", description="LLM提供商")
    deep_think_llm: str = Field(default="gpt-4o-mini", description="深度思考模型")
    quick_think_llm: str = Field(default="gpt-4o-mini", description="快速思考模型")
    backend_url: str = Field(default=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1"), description="LLM API地址")
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API密钥(可选,优先使用环境变量)")
    alpha_vantage_api_key: Optional[str] = Field(default=None, description="Alpha Vantage API密钥(可选)")

class AnalysisResponse(BaseModel):
    """分析响应模型"""
    task_id: str
    status: TaskStatus
    message: str
    created_at: str

class TaskDetailResponse(BaseModel):
    """任务详情响应"""
    task_id: str
    status: TaskStatus
    ticker: str
    analysis_date: str
    selected_analysts: List[str]
    research_depth: int
    final_decision: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    error_message: Optional[str] = None

class ProgressMessage(BaseModel):
    """进度消息模型"""
    type: str  # status, message, tool_call, report
    timestamp: str
    data: Dict[str, Any]

# ==================== WebSocket连接管理器 ====================

class ConnectionManager:
    """管理WebSocket连接"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.task_history: Dict[str, List[Dict]] = {}  # 存储每个任务的消息历史

    async def connect(self, task_id: str, websocket: WebSocket):
        """建立连接"""
        await websocket.accept()
        self.active_connections[task_id] = websocket
        print(f"✅ WebSocket连接已建立: {task_id}")

        # 发送历史消息(如果有)
        if task_id in self.task_history:
            for msg in self.task_history[task_id]:
                try:
                    await websocket.send_json(msg)
                except:
                    pass

    def disconnect(self, task_id: str):
        """断开连接"""
        if task_id in self.active_connections:
            del self.active_connections[task_id]
            print(f"❌ WebSocket连接已断开: {task_id}")

    async def send_progress(self, task_id: str, message_type: str, data: Dict[str, Any]):
        """发送进度消息"""
        message = {
            "type": message_type,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }

        # 保存到历史
        if task_id not in self.task_history:
            self.task_history[task_id] = []
        self.task_history[task_id].append(message)

        # 发送给连接的客户端
        if task_id in self.active_connections:
            try:
                await self.active_connections[task_id].send_json(message)
                print(f"📤 发送消息 [{message_type}]: {task_id}")
            except Exception as e:
                print(f"❌ 发送消息失败 {task_id}: {e}")

# ==================== 全局变量 ====================

app = FastAPI(
    title="TradingAgents API",
    description="Multi-Agents LLM Financial Trading Framework API",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket管理器
manager = ConnectionManager()

# 任务存储(生产环境应该使用数据库)
tasks_db: Dict[str, Dict] = {}

# 线程池执行器 (用于真正的后台异步执行)
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(max_workers=4)  # 支持4个并发任务

# ==================== 辅助函数 ====================

def send_progress_sync(task_id: str, message_type: str, data: Dict[str, Any]):
    """同步发送进度消息 (线程安全)"""
    message = {
        "type": message_type,
        "timestamp": datetime.now().isoformat(),
        "data": data
    }

    # 保存到历史
    if task_id not in manager.task_history:
        manager.task_history[task_id] = []
    manager.task_history[task_id].append(message)

    # 如果有WebSocket连接,尝试发送 (使用asyncio)
    if task_id in manager.active_connections:
        try:
            # 在事件循环中调度发送
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                manager.active_connections[task_id].send_json(message)
            )
            print(f"📤 发送消息 [{message_type}]: {task_id}")
        except Exception as e:
            print(f"⚠️ 发送WebSocket消息失败 {task_id}: {e}")

# ==================== 后台任务处理 ====================

def run_analysis_task_sync(task_id: str, request: AnalysisRequest):
    """同步运行分析任务 (在独立线程中执行)"""
    ta = None  # 初始化为None,用于finally块清理

    # 统计指标
    tool_call_count = 0
    llm_call_count = 0
    report_count = 0

    try:
        # 更新任务状态
        tasks_db[task_id]["status"] = TaskStatus.RUNNING

        send_progress_sync(task_id, "status", {
            "status": "running",
            "message": f"开始分析 {request.ticker} on {request.analysis_date}"
        })

        # 配置API密钥(如果提供)
        original_openai_key = os.environ.get("OPENAI_API_KEY")
        original_av_key = os.environ.get("ALPHA_VANTAGE_API_KEY")

        if request.openai_api_key:
            os.environ["OPENAI_API_KEY"] = request.openai_api_key
        if request.alpha_vantage_api_key:
            os.environ["ALPHA_VANTAGE_API_KEY"] = request.alpha_vantage_api_key

        # 创建配置
        config = DEFAULT_CONFIG.copy()
        config["deep_think_llm"] = request.deep_think_llm
        config["quick_think_llm"] = request.quick_think_llm
        config["max_debate_rounds"] = request.research_depth
        config["max_risk_discuss_rounds"] = request.research_depth
        config["llm_provider"] = request.llm_provider
        config["backend_url"] = request.backend_url

        # 为每个任务设置唯一的内存前缀,避免并发任务间的内存污染
        config["memory_prefix"] = f"task_{task_id[:8]}_"

        print(f"🚀 初始化 TradingAgentsGraph, 分析师: {[a.value for a in request.selected_analysts]}")
        print(f"📝 内存前缀: {config['memory_prefix']}")

        # 初始化TradingAgents
        ta = TradingAgentsGraph(
            selected_analysts=[analyst.value for analyst in request.selected_analysts],
            debug=True,
            config=config
        )

        send_progress_sync(task_id, "status", {
            "status": "running",
            "message": "TradingAgents 初始化完成"
        })

        # 创建初始状态
        init_state = ta.propagator.create_initial_state(
            request.ticker,
            request.analysis_date
        )
        args = ta.propagator.get_graph_args()

        print(f"📊 开始流式执行分析...")

        # 流式执行分析
        chunk_count = 0
        final_chunk = None

        for chunk in ta.graph.stream(init_state, **args):
            chunk_count += 1
            final_chunk = chunk

            # 检测当前活跃的节点/Agent
            # LangGraph的chunk可能包含节点名称信息
            chunk_keys = list(chunk.keys())
            for key in chunk_keys:
                # 发送节点激活信息
                if key not in ["messages"] and chunk.get(key):
                    # 映射节点名到Agent
                    agent_mapping = {
                        "market_analyst": "market",
                        "social_analyst": "social",
                        "news_analyst": "news",
                        "fundamentals_analyst": "fundamentals",
                        "bull_researcher": "bull",
                        "bear_researcher": "bear",
                        "research_manager": "research-manager",
                        "trader": "trader",
                        "risky_analyst": "risk-risky",
                        "safe_analyst": "risk-safe",
                        "neutral_analyst": "risk-neutral",
                        "risk_manager": "risk-manager"
                    }

                    if key in agent_mapping:
                        send_progress_sync(task_id, "agent_status", {
                            "agent": agent_mapping[key],
                            "status": "running"
                        })

            # 处理消息
            if len(chunk.get("messages", [])) > 0:
                last_message = chunk["messages"][-1]
                llm_call_count += 1  # 每个消息都是一次LLM调用

                # 提取内容
                if hasattr(last_message, "content"):
                    content = last_message.content
                    if isinstance(content, list):
                        # 处理Anthropic格式
                        text_parts = []
                        for item in content:
                            if isinstance(item, dict) and item.get('type') == 'text':
                                text_parts.append(item.get('text', ''))
                        content = ' '.join(text_parts)

                    send_progress_sync(task_id, "message", {
                        "content": str(content),  # 发送完整内容
                        "stats": {
                            "tool_calls": tool_call_count,
                            "llm_calls": llm_call_count,
                            "reports": report_count
                        }
                    })

                # 处理工具调用
                if hasattr(last_message, "tool_calls") and last_message.tool_calls:
                    for tool_call in last_message.tool_calls:
                        tool_call_count += 1  # 统计工具调用次数

                        tool_name = tool_call.get("name") if isinstance(tool_call, dict) else getattr(tool_call, "name", "unknown")
                        tool_args = tool_call.get("args") if isinstance(tool_call, dict) else getattr(tool_call, "args", {})

                        send_progress_sync(task_id, "tool_call", {
                            "tool_name": tool_name,
                            "args": tool_args,
                            "stats": {
                                "tool_calls": tool_call_count,
                                "llm_calls": llm_call_count,
                                "reports": report_count
                            }
                        })

            # 处理报告
            report_types = [
                "market_report", "sentiment_report", "news_report",
                "fundamentals_report", "investment_plan",
                "trader_investment_plan", "final_trade_decision"
            ]

            for report_type in report_types:
                if report_type in chunk and chunk[report_type]:
                    report_count += 1  # 统计报告生成次数

                    send_progress_sync(task_id, "report", {
                        "report_type": report_type,
                        "content": chunk[report_type],
                        "stats": {
                            "tool_calls": tool_call_count,
                            "llm_calls": llm_call_count,
                            "reports": report_count
                        }
                    })

                    # 保存到任务数据
                    if "reports" not in tasks_db[task_id]:
                        tasks_db[task_id]["reports"] = {}
                    tasks_db[task_id]["reports"][report_type] = chunk[report_type]

        print(f"✅ 分析完成,共处理 {chunk_count} 个chunk")

        # 获取最终决策
        if final_chunk and "final_trade_decision" in final_chunk:
            decision = ta.process_signal(final_chunk["final_trade_decision"])
            tasks_db[task_id]["final_decision"] = decision
            tasks_db[task_id]["final_state"] = final_chunk
        else:
            decision = "UNKNOWN"

        # 更新任务状态为完成
        tasks_db[task_id]["status"] = TaskStatus.COMPLETED
        tasks_db[task_id]["completed_at"] = datetime.now().isoformat()

        send_progress_sync(task_id, "status", {
            "status": "completed",
            "decision": decision,
            "message": f"分析完成! 决策: {decision}"
        })

        # 恢复原始API密钥
        if original_openai_key:
            os.environ["OPENAI_API_KEY"] = original_openai_key
        if original_av_key:
            os.environ["ALPHA_VANTAGE_API_KEY"] = original_av_key

    except Exception as e:
        print(f"❌ 分析任务失败: {str(e)}")
        import traceback
        traceback.print_exc()

        tasks_db[task_id]["status"] = TaskStatus.FAILED
        tasks_db[task_id]["error_message"] = str(e)
        tasks_db[task_id]["completed_at"] = datetime.now().isoformat()

        send_progress_sync(task_id, "status", {
            "status": "failed",
            "error": str(e)
        })
    finally:
        # 清理内存集合,释放资源,避免内存泄漏
        if ta is not None:
            try:
                ta.cleanup_memory()
                print(f"🧹 任务 {task_id[:8]} 内存已清理")
            except Exception as cleanup_error:
                print(f"⚠️ 清理任务 {task_id[:8]} 内存时出错: {cleanup_error}")

# ==================== API端点 ====================

@app.get("/", tags=["健康检查"])
async def root():
    """根路径"""
    return {
        "service": "TradingAgents API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/v1/health", tags=["健康检查"])
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "TradingAgents API",
        "timestamp": datetime.now().isoformat(),
        "active_tasks": len(tasks_db),
        "active_websockets": len(manager.active_connections)
    }

@app.post("/api/v1/analysis/start", response_model=AnalysisResponse, tags=["分析"])
async def start_analysis(
    request: AnalysisRequest
):
    """
    启动新的分析任务

    - **ticker**: 股票代码,如 NVDA, AAPL, TSLA
    - **analysis_date**: 分析日期,格式 YYYY-MM-DD
    - **selected_analysts**: 选择的分析师列表
    - **research_depth**: 研究深度(辩论轮数), 1-5
    """
    # 生成任务ID
    task_id = str(uuid.uuid4())

    # 创建任务记录
    tasks_db[task_id] = {
        "task_id": task_id,
        "status": TaskStatus.PENDING,
        "ticker": request.ticker,
        "analysis_date": request.analysis_date,
        "selected_analysts": [a.value for a in request.selected_analysts],
        "research_depth": request.research_depth,
        "created_at": datetime.now().isoformat(),
        "reports": {},
        "final_decision": None,
        "completed_at": None,
        "error_message": None
    }

    # 使用线程池异步执行任务 (真正的并发)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, run_analysis_task_sync, task_id, request)

    print(f"✨ 创建分析任务: {task_id} - {request.ticker} on {request.analysis_date}")

    return AnalysisResponse(
        task_id=task_id,
        status=TaskStatus.PENDING,
        message=f"分析任务已创建: {request.ticker}",
        created_at=tasks_db[task_id]["created_at"]
    )

@app.get("/api/v1/analysis/{task_id}", response_model=TaskDetailResponse, tags=["分析"])
async def get_task_detail(task_id: str):
    """
    获取任务详情
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")

    task = tasks_db[task_id]

    return TaskDetailResponse(
        task_id=task["task_id"],
        status=task["status"],
        ticker=task["ticker"],
        analysis_date=task["analysis_date"],
        selected_analysts=task["selected_analysts"],
        research_depth=task["research_depth"],
        final_decision=task.get("final_decision"),
        created_at=task["created_at"],
        completed_at=task.get("completed_at"),
        error_message=task.get("error_message")
    )

@app.get("/api/v1/analysis/{task_id}/reports", tags=["分析"])
async def get_task_reports(task_id: str):
    """
    获取任务的所有报告
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "task_id": task_id,
        "status": tasks_db[task_id]["status"],
        "reports": tasks_db[task_id].get("reports", {})
    }

@app.get("/api/v1/tasks", tags=["分析"])
async def list_tasks(status: Optional[TaskStatus] = None, limit: int = 20):
    """
    列出所有任务
    """
    tasks = list(tasks_db.values())

    if status:
        tasks = [t for t in tasks if t["status"] == status]

    # 按创建时间倒序
    tasks.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "total": len(tasks),
        "tasks": tasks[:limit]
    }

@app.websocket("/ws/analysis/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    """
    WebSocket端点,用于接收实时分析进度

    连接后会收到以下类型的消息:
    - status: 状态更新
    - message: LLM推理消息
    - tool_call: 工具调用信息
    - report: 报告生成
    """
    await manager.connect(task_id, websocket)
    try:
        while True:
            # 保持连接,接收客户端ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(task_id)
    except Exception as e:
        print(f"WebSocket异常: {e}")
        manager.disconnect(task_id)

# ==================== 启动配置 ====================

if __name__ == "__main__":
    import uvicorn

    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║         TradingAgents FastAPI Service                     ║
    ║                                                           ║
    ║  API 文档: http://localhost:8000/docs                     ║
    ║  健康检查: http://localhost:8000/api/v1/health           ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
