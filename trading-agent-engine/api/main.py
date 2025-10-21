"""
TradingAgents FastAPI Service
ProvidesHTTP APIAPI interface,wrapperTradingAgents core functionality
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

# ImportTradingAgents core components
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG
from dotenv import load_dotenv

# Import database services
from db_service import (
    update_task_status,
    save_report,
    save_task_message,
    test_connection,
    increment_task_stats,
    update_task_status_raw_sql
)

load_dotenv()

# Test database connection
print("🔄 Testing database connection...")
if test_connection():
    print("✅ Database ready!")
else:
    print("⚠️ Database connection failed, please check configuration")

# ==================== Data model definitions ====================

class AnalystType(str, Enum):
    """Analyst type"""
    MARKET = "market"
    SOCIAL = "social"
    NEWS = "news"
    FUNDAMENTALS = "fundamentals"

class TaskStatus(str, Enum):
    """TaskStatus"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class AnalysisRequest(BaseModel):
    """Analysis request model"""
    task_id: Optional[str] = Field(default=None, description="TaskID (byJava sideProvides)")
    ticker: str = Field(..., description="Stock ticker", example="NVDA")
    analysis_date: str = Field(..., description="Analysis date YYYY-MM-DD", example="2024-05-10")
    selected_analysts: List[AnalystType] = Field(
        default=[AnalystType.MARKET, AnalystType.SOCIAL, AnalystType.NEWS, AnalystType.FUNDAMENTALS],
        description="Selected analysts"
    )
    research_depth: int = Field(default=1, ge=1, le=5, description="Research depth(debate rounds)")
    llm_provider: str = Field(default="openai", description="LLMProvides")
    deep_think_llm: str = Field(default="gpt-4o-mini", description="Deep thinking model")
    quick_think_llm: str = Field(default="gpt-4o-mini", description="Quick thinking model")
    backend_url: str = Field(default=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1"), description="LLM APIURL")
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI APIAPI key(optional,priorityUsingenvironment variable)")
    alpha_vantage_api_key: Optional[str] = Field(default=None, description="Alpha Vantage APIAPI key(optional)")

class AnalysisResponse(BaseModel):
    """Analysis response model"""
    task_id: str
    status: TaskStatus
    message: str
    created_at: str

class TaskDetailResponse(BaseModel):
    """Taskdetailsresponse"""
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
    """Progress message model"""
    type: str  # status, message, tool_call, report
    timestamp: str
    data: Dict[str, Any]

# ==================== Global variables ====================

app = FastAPI(
    title="TradingAgents API",
    description="Multi-Agents LLM Financial Trading Framework API",
    version="1.0.0"
)

# CORSConfiguration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production environment needs restrictions
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool executor (For true background async execution)
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(max_workers=4)  # support4concurrentTask

# ==================== Helperfunction ====================

def send_progress_sync(task_id: str, message_type: str, data: Dict[str, Any]):
    """Synchronously save progress messages to database"""
    # Save message to database
    try:
        save_task_message(task_id, message_type, data)
    except Exception as e:
        print(f"⚠️ Failed to save message to database {task_id}: {e}")

# ==================== BackgroundTaskprocessing ====================

def run_analysis_task_sync(task_id: str, request: AnalysisRequest):
    """Run analysis synchronouslyTask (Execute in separate thread)"""
    ta = None  # Initialize toNone,forfinallycleanup

    try:
        # Update task status to database (Task created by Java side, should already exist)
        if not update_task_status(task_id, "RUNNING"):
            # If ORM fails (e.g., SQLAlchemy relationship error), use raw SQL fallback
            error_msg = f"Failed to initialize task - database error or task not found"
            print(f"❌ Task {task_id[:8]} - ORM update failed, trying raw SQL fallback")
            update_task_status_raw_sql(task_id, "FAILED", error_message=error_msg)
            return

        send_progress_sync(task_id, "status", {
            "status": "running",
            "message": f"Start analysis {request.ticker} on {request.analysis_date}"
        })

        # ConfigurationAPIAPI key(ifProvides)
        original_openai_key = os.environ.get("OPENAI_API_KEY")
        original_av_key = os.environ.get("ALPHA_VANTAGE_API_KEY")

        if request.openai_api_key:
            os.environ["OPENAI_API_KEY"] = request.openai_api_key
        if request.alpha_vantage_api_key:
            os.environ["ALPHA_VANTAGE_API_KEY"] = request.alpha_vantage_api_key

        # Create configuration
        config = DEFAULT_CONFIG.copy()
        config["deep_think_llm"] = request.deep_think_llm
        config["quick_think_llm"] = request.quick_think_llm
        config["max_debate_rounds"] = request.research_depth
        config["max_risk_discuss_rounds"] = request.research_depth
        config["llm_provider"] = request.llm_provider
        config["backend_url"] = request.backend_url

        # For eachTaskSet unique memory prefix,Avoid memory pollution between concurrent tasks
        config["memory_prefix"] = f"task_{task_id[:8]}_"

        print(f"🚀 Initialize TradingAgentsGraph, Analyst: {[a.value for a in request.selected_analysts]}")
        print(f"📝 Memory prefix: {config['memory_prefix']}")

        # InitializeTradingAgents
        ta = TradingAgentsGraph(
            selected_analysts=[analyst.value for analyst in request.selected_analysts],
            debug=True,
            config=config
        )

        send_progress_sync(task_id, "status", {
            "status": "running",
            "message": "TradingAgents Initialization complete"
        })

        # Create initialStatus
        init_state = ta.propagator.create_initial_state(
            request.ticker,
            request.analysis_date
        )
        args = ta.propagator.get_graph_args()

        print(f"📊 Start streaming analysis...")

        # Stream analysis
        chunk_count = 0
        final_chunk = None

        # Message deduplication：Track processed messagesID
        processed_message_ids = set()

        for chunk in ta.graph.stream(init_state, **args):
            chunk_count += 1
            final_chunk = chunk

            # Detect currently active nodes/Agent
            # LangGraph chunkmay contain node name information
            chunk_keys = list(chunk.keys())
            for key in chunk_keys:
                # Send node activation info
                if key not in ["messages"] and chunk.get(key):
                    # Map node name toAgent
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

            # Process messages（Only process new messages，Avoid duplicates）
            if len(chunk.get("messages", [])) > 0:
                last_message = chunk["messages"][-1]

                # Usingmessage id attribute（if exists）or object id for deduplication
                # LangGraph Messageusually has id attribute
                if hasattr(last_message, "id") and last_message.id:
                    message_id = last_message.id
                else:
                    # if not existsid，Usingcontenthashas unique identifier
                    content_for_hash = str(getattr(last_message, "content", ""))
                    tool_calls_for_hash = str(getattr(last_message, "tool_calls", ""))
                    message_id = hash(content_for_hash + tool_calls_for_hash)

                # Skip processed messages
                if message_id in processed_message_ids:
                    continue

                processed_message_ids.add(message_id)

                # Increment LLM call counter in database
                increment_task_stats(task_id, llm_calls=1)

                # Check for tool calls
                has_tool_calls = hasattr(last_message, "tool_calls") and last_message.tool_calls

                # Extract content
                content = None
                if hasattr(last_message, "content"):
                    content = last_message.content
                    if isinstance(content, list):
                        # Process Anthropic format
                        text_parts = []
                        for item in content:
                            if isinstance(item, dict) and item.get('type') == 'text':
                                text_parts.append(item.get('text', ''))
                        content = ' '.join(text_parts) if text_parts else None
                    elif content:
                        content = str(content).strip()

                # Strategy：If has tool calls，Only save tool calls；If has meaningful content，SaveMessage
                if has_tool_calls:
                    # Save tool calls and increment counter
                    for tool_call in last_message.tool_calls:
                        tool_name = tool_call.get("name") if isinstance(tool_call, dict) else getattr(tool_call, "name", "unknown")
                        tool_args = tool_call.get("args") if isinstance(tool_call, dict) else getattr(tool_call, "args", {})

                        # Increment tool call counter in database
                        increment_task_stats(task_id, tool_calls=1)

                        send_progress_sync(task_id, "tool_call", {
                            "tool_name": tool_name,
                            "args": tool_args
                        })

                # If has meaningful content，Also save message（Save content even if has tool calls）
                if content and len(content) > 10:
                    # Filter out system messages and useless content
                    if not any(skip in content.lower() for skip in ['system:', 'function:', 'tool response:']):
                        send_progress_sync(task_id, "message", {
                            "content": content
                        })

            # Process reports（Also save to report table and task_message table）
            report_types = [
                "market_report", "sentiment_report", "news_report",
                "fundamentals_report", "investment_plan",
                "trader_investment_plan", "final_trade_decision"
            ]

            for report_type in report_types:
                if report_type in chunk and chunk[report_type]:
                    # Increment report counter in database
                    increment_task_stats(task_id, reports=1)

                    # Save to task_message table（Show analysis process）
                    send_progress_sync(task_id, "report", {
                        "report_type": report_type,
                        "content": chunk[report_type]
                    })

                    # Also save to report table（Structured storage）
                    save_report(task_id, report_type, chunk[report_type])

        print(f"✅ Analysis completed,Processed {chunk_count} chunk")

        # Get final decision
        if final_chunk and "final_trade_decision" in final_chunk:
            decision = ta.process_signal(final_chunk["final_trade_decision"])
        else:
            decision = "UNKNOWN"

        # Update task statusto completed（write to database）
        update_task_status(task_id, "COMPLETED", final_decision=decision)

        send_progress_sync(task_id, "status", {
            "status": "completed",
            "decision": decision,
            "message": f"Analysis completed! Decision: {decision}"
        })

        # Restore originalAPIAPI key
        if original_openai_key:
            os.environ["OPENAI_API_KEY"] = original_openai_key
        if original_av_key:
            os.environ["ALPHA_VANTAGE_API_KEY"] = original_av_key

    except Exception as e:
        print(f"❌ AnalysisTaskFailed: {str(e)}")
        import traceback
        traceback.print_exc()

        # Update task statusto failed（write to database）
        if not update_task_status(task_id, "FAILED", error_message=str(e)):
            print(f"❌ Failed to update task {task_id[:8]} status to FAILED")

        send_progress_sync(task_id, "status", {
            "status": "failed",
            "error": str(e)
        })
    finally:
        # Clean up memory collections,Release resources,Avoid memory leaks
        if ta is not None:
            try:
                ta.cleanup_memory()
                print(f"🧹 Task {task_id[:8]} Memory cleaned up")
            except Exception as cleanup_error:
                print(f"⚠️ CleanupTask {task_id[:8]} error during memory: {cleanup_error}")

# ==================== APIendpoint ====================

@app.get("/", tags=["Health Check"])
async def root():
    """Root path"""
    return {
        "service": "TradingAgents API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/v1/health", tags=["Health Check"])
async def health_check():
    return {
        "status": "healthy",
        "service": "TradingAgents API",
        "timestamp": datetime.now().isoformat(),
    }

@app.post("/api/v1/analysis/start", response_model=AnalysisResponse, tags=["Analysis"])
async def start_analysis(
    request: AnalysisRequest
):
    """
    Start new analysisTask

    When called byJava sidewhen calling，task_idwill be in requestProvides（Taskalready inJavacreated in database）
    When called directly（testing），will be auto-generatedtask_id

    - **task_id**: TaskID（byJava sideProvides，orauto-generated）
    - **ticker**: Stock ticker,such as NVDA, AAPL, TSLA
    - **analysis_date**: Analysis date,format YYYY-MM-DD
    - **selected_analysts**: List of selected analysts
    - **research_depth**: Research depth(debate rounds), 1-5
    """
    # UsingJavaProvidestaskId，Generate new if not exists（For direct testing）
    task_id = request.task_id if request.task_id else str(uuid.uuid4())

    # UsingThread pool async executionTask (True concurrency)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, run_analysis_task_sync, task_id, request)

    print(f"✨ {'Received' if request.task_id else 'Create'}AnalysisTask: {task_id} - {request.ticker} on {request.analysis_date}")

    return AnalysisResponse(
        task_id=task_id,
        status=TaskStatus.PENDING,
        message=f"AnalysisTaskalready{'Received' if request.task_id else 'Create'}: {request.ticker}",
        created_at=datetime.now().isoformat()
    )

@app.get("/api/v1/analysis/{task_id}", response_model=TaskDetailResponse, tags=["Analysis"])
async def get_task_detail(task_id: str):
    """
    GetTaskdetails（Read from database）
    """
    from db_service import get_task_by_uuid
    import json

    task = get_task_by_uuid(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tasknot found")

    # Parse JSON field
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

@app.get("/api/v1/analysis/{task_id}/reports", tags=["Analysis"])
async def get_task_reports(task_id: str):
    """
    GetTask reports（Read from database）
    """
    from db_service import get_task_by_uuid
    from database import get_db_session, Report

    task = get_task_by_uuid(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tasknot found")

    # Get reports
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

@app.get("/api/v1/tasks", tags=["Analysis"])
async def list_tasks(status: Optional[TaskStatus] = None, limit: int = 20):
    """
    List allTask（Read from database）
    Note：This endpoint returns Python internal data，Java side shouldUsingown API
    """
    from database import get_db_session, Task
    import json

    db = get_db_session()
    try:
        query = db.query(Task)

        if status:
            query = query.filter(Task.status == status.value.upper())

        # Order by creation time descending
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

# ==================== Startup configuration ====================

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
