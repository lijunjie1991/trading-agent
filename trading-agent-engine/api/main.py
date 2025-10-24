"""
TradingAgents FastAPI Service
Provides HTTP API interface, wrapper for TradingAgents core functionality
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set, Tuple
import asyncio
import json
import os
import uuid
from datetime import datetime
from enum import Enum
import hashlib

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

# ==================== Constants ====================

# Server configuration
MAX_WORKERS = 64
DEFAULT_TASK_LIMIT = 20

# Content filtering
MIN_CONTENT_LENGTH = 10
MAX_CONTENT_HASH_LENGTH = 1000  # Use first N chars for hash to avoid memory issues

# System message filters
SYSTEM_MESSAGE_FILTERS = []

# Report types
REPORT_TYPES = [
    "market_report",
    "sentiment_report",
    "news_report",
    "fundamentals_report",
    "investment_plan",
    "trader_investment_plan",
    "final_trade_decision"
]

# Agent name mapping
AGENT_NAME_MAPPING = {
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
    ticker: str = Field(default=None, description="Stock ticker")
    analysis_date: str = Field(default=None, description="Analysis date YYYY-MM-DD")
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool executor (For true background async execution)
from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

# ==================== Helper Functions ====================

def send_progress_sync(task_id: str, message_type: str, data: Dict[str, Any]) -> None:
    """
    Synchronously save progress messages to database.

    Args:
        task_id: Unique task identifier
        message_type: Type of message (status, message, tool_call, report, agent_status)
        data: Message data dictionary
    """
    try:
        save_task_message(task_id, message_type, data)
    except Exception as e:
        print(f"⚠️ Failed to save message to database {task_id[:8]}: {e}")


def extract_message_content(message) -> Optional[str]:
    """
    Extract text content from various message formats.

    Args:
        message: Message object from LangGraph

    Returns:
        Extracted text content or None
    """
    if not hasattr(message, "content"):
        return None

    content = message.content

    # Handle list format (Anthropic)
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, dict) and item.get('type') == 'text':
                text_parts.append(item.get('text', ''))
        return ' '.join(text_parts) if text_parts else None

    # Handle string format
    if content:
        return str(content).strip()

    return None


def generate_content_hash(content: str) -> str:
    """
    Generate a hash for content deduplication.

    Args:
        content: Content string to hash

    Returns:
        SHA256 hash of content
    """
    # Use only first MAX_CONTENT_HASH_LENGTH chars to avoid memory issues
    content_to_hash = content[:MAX_CONTENT_HASH_LENGTH] if len(content) > MAX_CONTENT_HASH_LENGTH else content
    return hashlib.sha256(content_to_hash.encode('utf-8')).hexdigest()


def get_message_id(message) -> str:
    """
    Get or generate unique identifier for a message.

    Args:
        message: Message object from LangGraph

    Returns:
        Unique message identifier
    """
    # Use message id attribute if available
    if hasattr(message, "id") and message.id:
        return str(message.id)

    # Generate hash-based ID from content
    content = str(getattr(message, "content", ""))
    tool_calls = str(getattr(message, "tool_calls", ""))
    combined = content + tool_calls

    return generate_content_hash(combined)


def should_filter_content(content: str) -> bool:
    """
    Check if content should be filtered out.

    Args:
        content: Content string to check

    Returns:
        True if content should be filtered
    """
    if not content or len(content) <= MIN_CONTENT_LENGTH:
        return True

    content_lower = content.lower()
    return any(skip in content_lower for skip in SYSTEM_MESSAGE_FILTERS)


def get_message_type(message) -> str:
    """
    Get message type from LangGraph message object.

    Args:
        message: Message object from LangGraph

    Returns:
        Message type: "human", "ai", "tool", "system", or "unknown"
    """
    message_class = message.__class__.__name__
    if "Human" in message_class:
        return "human"
    elif "AI" in message_class:
        return "ai"
    elif "Tool" in message_class:
        return "tool"
    elif "System" in message_class:
        return "system"
    return "unknown"


def update_agent_status(task_id: str, chunk: Dict[str, Any], processed_agents: Set[str]) -> None:
    """
    Update agent status based on chunk keys.

    Args:
        task_id: Unique task identifier
        chunk: Current chunk from graph stream
        processed_agents: Set of already processed agent keys
    """
    chunk_keys = list(chunk.keys())

    for key in chunk_keys:
        # Skip non-agent keys and empty values
        if key in ["messages"] or not chunk.get(key):
            continue

        # Skip already processed agents
        if key in processed_agents:
            continue

        # Map node name to agent and send status
        if key in AGENT_NAME_MAPPING:
            processed_agents.add(key)
            send_progress_sync(task_id, "agent_status", {
                "agent": AGENT_NAME_MAPPING[key],
                "status": "running"
            })

# ==================== Background Task Processing ====================

def process_messages(
    task_id: str,
    chunk: Dict[str, Any],
    processed_message_ids: Set[str]
) -> None:
    """
    Process and save messages from chunk with deduplication.

    Enhanced to handle all message types and multiple messages per chunk:
    - HumanMessage: User inputs and system instructions
    - AIMessage: LLM responses and tool calls
    - ToolMessage: Tool execution results (can be multiple per chunk)

    Args:
        task_id: Unique task identifier
        chunk: Current chunk from graph stream
        processed_message_ids: Set of already processed message IDs
    """

    print(f"---------------------------------------------------------------------------------------------------------------------")

    messages = chunk.get("messages", [])
    if not messages:
        return

    # Check if chunk contains any report
    has_report = any(report_type in chunk and chunk[report_type] for report_type in REPORT_TYPES)

    # Process ALL messages in the chunk (not just the last one)
    # This is important because a chunk can contain multiple ToolMessages
    for message in messages:
        # Get unique message ID
        message_id = get_message_id(message)

        # Get message type
        msg_type = get_message_type(message)

        print(f"{msg_type} || {has_report} || {message}")
        print(f"---------------------------------------------------------------------------------------------------------------------")

        # Skip if already processed
        if message_id in processed_message_ids:
            continue

        # Mark as processed
        processed_message_ids.add(message_id)

        # === Process AIMessage ===
        if msg_type == "ai":
            # Increment LLM call counter (only for AI messages)
            increment_task_stats(task_id, llm_calls=1)

            # Process tool calls
            if hasattr(message, "tool_calls") and message.tool_calls:
                for tool_call in message.tool_calls:
                    tool_name = tool_call.get("name") if isinstance(tool_call, dict) else getattr(tool_call, "name", "unknown")
                    tool_args = tool_call.get("args") if isinstance(tool_call, dict) else getattr(tool_call, "args", {})

                    # Increment tool call counter
                    increment_task_stats(task_id, tool_calls=1)

                    send_progress_sync(task_id, "tool_call", {
                        "tool_name": tool_name,
                        "args": tool_args
                    })

            # Process AI message content
            content = extract_message_content(message)
            if content and not should_filter_content(content):
                # Skip saving message if chunk contains report
                # because the report already contains the complete structured content
                if not has_report:
                    send_progress_sync(task_id, "message", {
                        "role": "assistant",
                        "content": content
                    })

        # === Process ToolMessage ===
        elif msg_type == "tool":
            content = extract_message_content(message)
            if content:
                # Get tool name from message
                tool_name = getattr(message, "name", "unknown")

                # Truncate content if too long (tool results can be very large)
                max_preview_length = 2000
                content_preview = content[:max_preview_length] if len(content) > max_preview_length else content

                # Save tool result
                send_progress_sync(task_id, "tool_result", {
                    "tool_name": tool_name,
                    "result_preview": content_preview,
                    "result_length": len(content),
                    "truncated": len(content) > max_preview_length
                })

        # === Process HumanMessage ===
        elif msg_type == "human":
            content = extract_message_content(message)
            # Only save meaningful human messages (not too short, not empty)
            if content and len(content.strip()) > 2:
                send_progress_sync(task_id, "message", {
                    "role": "user",
                    "content": content.strip()
                })


def process_reports(
    task_id: str,
    chunk: Dict[str, Any],
    processed_reports: Set[str]
) -> None:
    """
    Process and save reports from chunk with deduplication.

    Args:
        task_id: Unique task identifier
        chunk: Current chunk from graph stream
        processed_reports: Set of already processed report identifiers (type:hash)
    """
    for report_type in REPORT_TYPES:
        if report_type not in chunk or not chunk[report_type]:
            continue

        report_content = chunk[report_type]

        # Generate unique identifier for this report
        report_hash = generate_content_hash(report_content)
        report_id = f"{report_type}:{report_hash}"

        # Skip if already processed
        if report_id in processed_reports:
            continue

        processed_reports.add(report_id)

        # Increment report counter
        increment_task_stats(task_id, reports=1)

        # Save to task_message table (for analysis process)
        send_progress_sync(task_id, "report", {
            "report_type": report_type,
            "content": report_content
        })

        # Save to report table (structured storage)
        save_report(task_id, report_type, report_content)


def configure_api_keys(request: AnalysisRequest) -> Tuple[Optional[str], Optional[str]]:
    """
    Configure API keys from request and return original values.

    Args:
        request: Analysis request containing optional API keys

    Returns:
        Tuple of (original_openai_key, original_av_key)
    """
    original_openai_key = os.environ.get("OPENAI_API_KEY")
    original_av_key = os.environ.get("ALPHA_VANTAGE_API_KEY")

    if request.openai_api_key:
        os.environ["OPENAI_API_KEY"] = request.openai_api_key
    if request.alpha_vantage_api_key:
        os.environ["ALPHA_VANTAGE_API_KEY"] = request.alpha_vantage_api_key

    return original_openai_key, original_av_key


def restore_api_keys(original_openai_key: Optional[str], original_av_key: Optional[str]) -> None:
    """
    Restore original API keys.

    Args:
        original_openai_key: Original OpenAI API key
        original_av_key: Original Alpha Vantage API key
    """
    if original_openai_key:
        os.environ["OPENAI_API_KEY"] = original_openai_key
    if original_av_key:
        os.environ["ALPHA_VANTAGE_API_KEY"] = original_av_key


def create_analysis_config(request: AnalysisRequest, task_id: str) -> Dict[str, Any]:
    """
    Create configuration for TradingAgents.

    Args:
        request: Analysis request
        task_id: Unique task identifier

    Returns:
        Configuration dictionary
    """
    config = DEFAULT_CONFIG.copy()
    config.update({
        "deep_think_llm": request.deep_think_llm,
        "quick_think_llm": request.quick_think_llm,
        "max_debate_rounds": request.research_depth,
        "max_risk_discuss_rounds": request.research_depth,
        "llm_provider": request.llm_provider,
        "backend_url": request.backend_url,
        "memory_prefix": f"task_{task_id[:8]}_"  # Unique memory prefix per task
    })
    return config


def run_analysis_task_sync(task_id: str, request: AnalysisRequest) -> None:
    """
    Run analysis task synchronously (executed in separate thread).

    Args:
        task_id: Unique task identifier
        request: Analysis request containing parameters
    """
    ta = None  # Initialize to None for finally cleanup

    try:
        # Update task status to RUNNING
        if not update_task_status(task_id, "RUNNING"):
            error_msg = "Failed to initialize task - database error or task not found"
            print(f"❌ Task {task_id[:8]} - ORM update failed, trying raw SQL fallback")
            update_task_status_raw_sql(task_id, "FAILED", error_message=error_msg)
            return

        send_progress_sync(task_id, "status", {
            "status": "running",
            "message": f"Start analysis {request.ticker} on {request.analysis_date}"
        })

        # Configure API keys and save originals
        original_keys = configure_api_keys(request)

        # Create configuration
        config = create_analysis_config(request, task_id)

        print(f"🚀 Initialize TradingAgentsGraph, Analysts: {[a.value for a in request.selected_analysts]}")

        # Initialize TradingAgents
        ta = TradingAgentsGraph(
            selected_analysts=[analyst.value for analyst in request.selected_analysts],
            debug=False,
            config=config
        )

        # Create initial state
        init_state = ta.propagator.create_initial_state(
            request.ticker,
            request.analysis_date
        )
        args = ta.propagator.get_graph_args()

        print(f"📊 Start streaming analysis...")

        # Initialize deduplication trackers
        processed_message_ids: Set[str] = set()
        processed_reports: Set[str] = set()
        processed_agents: Set[str] = set()

        # Stream analysis
        chunk_count = 0
        final_chunk = None

        for chunk in ta.graph.stream(init_state, **args):
            chunk_count += 1
            final_chunk = chunk

            # Update agent status
            # update_agent_status(task_id, chunk, processed_agents)

            # Process messages with deduplication
            process_messages(task_id, chunk, processed_message_ids)

            # Process reports with deduplication
            process_reports(task_id, chunk, processed_reports)

        print(f"✅ Analysis completed, processed {chunk_count} chunks")

        # Get final decision
        decision = "UNKNOWN"
        if final_chunk and "final_trade_decision" in final_chunk:
            decision = ta.process_signal(final_chunk["final_trade_decision"])

        # Update task status to completed
        update_task_status(task_id, "COMPLETED", final_decision=decision)

        send_progress_sync(task_id, "status", {
            "status": "completed",
            "decision": decision,
            "message": f"Analysis completed! Decision: {decision}"
        })

        # Restore original API keys
        restore_api_keys(*original_keys)

    except Exception as e:
        print(f"❌ Analysis task failed: {str(e)}")
        import traceback
        traceback.print_exc()

        # Update task status to failed
        if not update_task_status(task_id, "FAILED", error_message=str(e)):
            print(f"❌ Failed to update task {task_id[:8]} status to FAILED")

        send_progress_sync(task_id, "status", {
            "status": "failed",
            "error": str(e)
        })

    finally:
        # Clean up memory collections
        if ta is not None:
            try:
                ta.cleanup_memory()
                print(f"🧹 Task {task_id[:8]} memory cleaned up")
            except Exception as cleanup_error:
                print(f"⚠️ Cleanup task {task_id[:8]} error during memory: {cleanup_error}")

# ==================== API Endpoints ====================

@app.get("/", tags=["Health Check"])
async def root():
    """Root path - service information"""
    return {
        "service": "TradingAgents API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/v1/health", tags=["Health Check"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "TradingAgents API",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/v1/analysis/start", response_model=AnalysisResponse, tags=["Analysis"])
async def start_analysis(request: AnalysisRequest):
    """
    Start a new analysis task.

    When called by Java side, task_id will be provided in the request
    (task already created in database).
    When called directly (testing), a new task_id will be auto-generated.

    Args:
        request: Analysis request containing:
            - task_id: Task ID (provided by Java side, or auto-generated)
            - ticker: Stock ticker (e.g., NVDA, AAPL, TSLA)
            - analysis_date: Analysis date (YYYY-MM-DD format)
            - selected_analysts: List of selected analysts
            - research_depth: Research depth (debate rounds), 1-5

    Returns:
        Analysis response with task_id and status
    """
    # Use provided task_id or generate new one for direct testing
    task_id = request.task_id if request.task_id else str(uuid.uuid4())

    # Execute task in thread pool for true concurrency
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, run_analysis_task_sync, task_id, request)

    action = 'Received' if request.task_id else 'Created'
    print(f"✨ {action} analysis task: {task_id} - {request.ticker} on {request.analysis_date}")

    return AnalysisResponse(
        task_id=task_id,
        status=TaskStatus.PENDING,
        message=f"Analysis task {action.lower()}: {request.ticker}",
        created_at=datetime.now().isoformat()
    )


@app.get("/api/v1/analysis/{task_id}", response_model=TaskDetailResponse, tags=["Analysis"])
async def get_task_detail(task_id: str):
    """
    Get task details (read from database).

    Args:
        task_id: Unique task identifier

    Returns:
        Task details including status, configuration, and results

    Raises:
        HTTPException: If task not found
    """
    from db_service import get_task_by_uuid

    task = get_task_by_uuid(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Parse JSON fields
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
    Get task reports (read from database).

    Args:
        task_id: Unique task identifier

    Returns:
        Dictionary containing all generated reports

    Raises:
        HTTPException: If task not found
    """
    from db_service import get_task_by_uuid
    from database import get_db_session, Report

    task = get_task_by_uuid(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get all reports for this task
    db = get_db_session()
    try:
        reports = db.query(Report).filter(Report.task_id == task.id).all()
        reports_dict = {report.report_type: report.content for report in reports}

        return {
            "task_id": task_id,
            "status": task.status,
            "reports": reports_dict
        }
    finally:
        db.close()


@app.get("/api/v1/tasks", tags=["Analysis"])
async def list_tasks(status: Optional[TaskStatus] = None, limit: int = DEFAULT_TASK_LIMIT):
    """
    List all tasks (read from database).

    Note: This endpoint returns Python internal data.
    Java side should use its own API for task listing.

    Args:
        status: Optional status filter
        limit: Maximum number of tasks to return

    Returns:
        List of tasks with details
    """
    from database import get_db_session, Task

    db = get_db_session()
    try:
        query = db.query(Task)

        # Apply status filter if provided
        if status:
            query = query.filter(Task.status == status.value.upper())

        # Order by creation time descending and apply limit
        query = query.order_by(Task.created_at.desc()).limit(limit)
        tasks = query.all()

        # Format task list
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
