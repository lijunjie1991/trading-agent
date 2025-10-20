"""
TradingAgents FastAPI Service
提供HTTP API接口,包装TradingAgents核心功能
"""
from fastapi import FastAPI, HTTPException
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

# 导入数据库服务
from db_service import update_task_status, save_report, save_task_message, test_connection

load_dotenv()

# 测试数据库连接
print("🔄 Testing database connection...")
if test_connection():
    print("✅ Database ready!")
else:
    print("⚠️ Database connection failed, please check configuration")

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

# 线程池执行器 (用于真正的后台异步执行)
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(max_workers=4)  # 支持4个并发任务

# ==================== 辅助函数 ====================

def send_progress_sync(task_id: str, message_type: str, data: Dict[str, Any]):
    """同步保存进度消息到数据库"""
    # 将消息保存到数据库
    try:
        save_task_message(task_id, message_type, data)
    except Exception as e:
        print(f"⚠️ 保存消息到数据库失败 {task_id}: {e}")

# ==================== 后台任务处理 ====================

def run_analysis_task_sync(task_id: str, request: AnalysisRequest):
    """同步运行分析任务 (在独立线程中执行)"""
    ta = None  # 初始化为None,用于finally块清理

    # 统计指标
    tool_call_count = 0
    llm_call_count = 0
    report_count = 0

    try:
        # 更新任务状态到数据库
        update_task_status(task_id, "RUNNING")

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

                    # 保存报告到数据库
                    save_report(task_id, report_type, chunk[report_type])

        print(f"✅ 分析完成,共处理 {chunk_count} 个chunk")

        # 获取最终决策
        if final_chunk and "final_trade_decision" in final_chunk:
            decision = ta.process_signal(final_chunk["final_trade_decision"])
        else:
            decision = "UNKNOWN"

        # 更新任务状态为完成（写入数据库）
        update_task_status(task_id, "COMPLETED", final_decision=decision)

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

        # 更新任务状态为失败（写入数据库）
        update_task_status(task_id, "FAILED", error_message=str(e))

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
    from database import get_db_session, Task

    db = get_db_session()
    try:
        active_tasks = db.query(Task).filter(Task.status.in_(["PENDING", "RUNNING"])).count()
    finally:
        db.close()

    return {
        "status": "healthy",
        "service": "TradingAgents API",
        "timestamp": datetime.now().isoformat(),
        "active_tasks": active_tasks
    }

@app.post("/api/v1/analysis/start", response_model=AnalysisResponse, tags=["分析"])
async def start_analysis(
    request: AnalysisRequest
):
    """
    启动新的分析任务
    注意：此端点仅用于 Python 内部测试，实际应该由 Java 端调用

    - **ticker**: 股票代码,如 NVDA, AAPL, TSLA
    - **analysis_date**: 分析日期,格式 YYYY-MM-DD
    - **selected_analysts**: 选择的分析师列表
    - **research_depth**: 研究深度(辩论轮数), 1-5
    """
    # 生成任务ID
    task_id = str(uuid.uuid4())

    # 使用线程池异步执行任务 (真正的并发)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, run_analysis_task_sync, task_id, request)

    print(f"✨ 创建分析任务: {task_id} - {request.ticker} on {request.analysis_date}")

    return AnalysisResponse(
        task_id=task_id,
        status=TaskStatus.PENDING,
        message=f"分析任务已创建: {request.ticker}",
        created_at=datetime.now().isoformat()
    )

@app.get("/api/v1/analysis/{task_id}", response_model=TaskDetailResponse, tags=["分析"])
async def get_task_detail(task_id: str):
    """
    获取任务详情（从数据库读取）
    """
    from db_service import get_task_by_uuid
    import json

    task = get_task_by_uuid(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 解析 JSON 字段
    selected_analysts = json.loads(task.selected_analysts) if task.selected_analysts else []

    return TaskDetailResponse(
        task_id=task.task_id,
        status=task.status,
        ticker=task.ticker,
        analysis_date=task.analysis_date.strftime("%Y-%m-%d"),
        selected_analysts=selected_analysts,
        research_depth=task.research_depth,
        final_decision=task.final_decision,
        created_at=task.created_at.isoformat(),
        completed_at=task.completed_at.isoformat() if task.completed_at else None,
        error_message=task.error_message
    )

@app.get("/api/v1/analysis/{task_id}/reports", tags=["分析"])
async def get_task_reports(task_id: str):
    """
    获取任务的所有报告（从数据库读取）
    """
    from db_service import get_task_by_uuid
    from database import get_db_session, Report

    task = get_task_by_uuid(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 获取报告
    db = get_db_session()
    try:
        reports = db.query(Report).filter(Report.task_id == task.id).all()
        reports_dict = {}
        for report in reports:
            reports_dict[report.report_type] = report.content
        return {
            "task_id": task_id,
            "status": task.status,
            "reports": reports_dict
        }
    finally:
        db.close()

@app.get("/api/v1/tasks", tags=["分析"])
async def list_tasks(status: Optional[TaskStatus] = None, limit: int = 20):
    """
    列出所有任务（从数据库读取）
    注意：此端点返回 Python 内部数据，Java 端应使用自己的 API
    """
    from database import get_db_session, Task
    import json

    db = get_db_session()
    try:
        query = db.query(Task)

        if status:
            query = query.filter(Task.status == status.value.upper())

        # 按创建时间倒序
        query = query.order_by(Task.created_at.desc()).limit(limit)
        tasks = query.all()

        task_list = []
        for task in tasks:
            selected_analysts = json.loads(task.selected_analysts) if task.selected_analysts else []
            task_list.append({
                "task_id": task.task_id,
                "status": task.status,
                "ticker": task.ticker,
                "analysis_date": task.analysis_date.strftime("%Y-%m-%d"),
                "selected_analysts": selected_analysts,
                "research_depth": task.research_depth,
                "final_decision": task.final_decision,
                "created_at": task.created_at.isoformat(),
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "error_message": task.error_message
            })

        return {
            "total": len(task_list),
            "tasks": task_list
        }
    finally:
        db.close()

# ==================== 启动配置 ====================

if __name__ == "__main__":
    import uvicorn

    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║         TradingAgents FastAPI Service                     ║
    ║                                                           ║
    ║         http://localhost:8000/docs                        ║
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
