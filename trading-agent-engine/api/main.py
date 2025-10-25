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

class MessageBuffer:
    """
    Message buffer for tracking analysis progress.
    Refactored from cli/main.py to save directly to database instead of deques.
    """
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.report_sections = {
            "market_report": None,
            "sentiment_report": None,
            "news_report": None,
            "fundamentals_report": None,
            "investment_plan": None,
            "trader_investment_plan": None,
            "final_trade_decision": None,
        }
        self.agent_status = {
            # Analyst Team
            "Market Analyst": "pending",
            "Social Analyst": "pending",
            "News Analyst": "pending",
            "Fundamentals Analyst": "pending",
            # Research Team
            "Bull Researcher": "pending",
            "Bear Researcher": "pending",
            "Research Manager": "pending",
            # Trading Team
            "Trader": "pending",
            # Risk Management Team
            "Risky Analyst": "pending",
            "Neutral Analyst": "pending",
            "Safe Analyst": "pending",
            # Portfolio Management Team
            "Portfolio Manager": "pending",
        }
        self.current_agent = None

    def add_message(self, message_type: str, content: str):
        """
        Add message to buffer and save to database (task_messages table).
        Matches cli/main.py MessageBuffer.add_message() signature.

        Args:
            message_type: Type of message (e.g., "Reasoning", "System", "Analysis")
            content: Message content
        """
        try:
            # Save to database task_messages table directly
            save_task_message(self.task_id, message_type, content)

        except Exception as e:
            print(f"⚠️ Failed to save message to database {self.task_id[:8]}: {e}")

    def add_tool_call(self, tool_name: str, args: Dict[str, Any]):
        """
        Add tool call to buffer and save to database (task_messages table).
        Matches cli/main.py MessageBuffer.add_tool_call() signature.

        Args:
            tool_name: Name of the tool
            args: Tool arguments
        """
        try:
            # Save to database task_messages table
            save_task_message(self.task_id, "tool_call", {
                "tool_name": tool_name,
                "args": args
            })

        except Exception as e:
            print(f"⚠️ Failed to save tool call to database {self.task_id[:8]}: {e}")

    def update_agent_status(self, agent: str, status: str):
        """
        Update agent status.
        Matches cli/main.py MessageBuffer.update_agent_status() signature.

        Args:
            agent: Agent name
            status: Status (pending, in_progress, completed)
        """
        if agent in self.agent_status:
            self.agent_status[agent] = status
            self.current_agent = agent


    def update_report_section(self, section_name: str, content: str):
        """
        Update report section in memory.
        Matches cli/main.py MessageBuffer.update_report_section() signature.
        Database save is handled by decorator, not here.

        Args:
            section_name: Report section name
            content: Report content
        """
        if section_name in self.report_sections:
            # Update in-memory section (matches cli/main.py exactly)
            self.report_sections[section_name] = content


def extract_content_string(content):
    """
    Extract string content from various message formats.
    Matches cli/main.py extract_content_string() function.

    Args:
        content: Content in various formats (str, list, dict, etc.)

    Returns:
        Extracted string content
    """
    if isinstance(content, str):
        return content
    elif isinstance(content, list):
        # Handle Anthropic's list format
        text_parts = []
        for item in content:
            if isinstance(item, dict):
                if item.get('type') == 'text':
                    text_parts.append(item.get('text', ''))
                elif item.get('type') == 'tool_use':
                    text_parts.append(f"[Tool: {item.get('name', 'unknown')}]")
            else:
                text_parts.append(str(item))
        return ' '.join(text_parts)
    else:
        return str(content)


def update_research_team_status(message_buffer: MessageBuffer, status: str):
    """
    Update status for all research team members and trader.
    Matches cli/main.py update_research_team_status() function.

    Args:
        message_buffer: MessageBuffer instance
        status: Status to set (e.g., "in_progress", "completed")
    """
    research_team = ["Bull Researcher", "Bear Researcher", "Research Manager", "Trader"]
    for agent in research_team:
        message_buffer.update_agent_status(agent, status)


def create_save_report_decorator(task_id: str):
    """
    Create decorator for saving reports to database.
    Matches cli/main.py save_report_section_decorator pattern.

    Args:
        task_id: Task UUID for database operations

    Returns:
        Decorator function
    """
    from functools import wraps

    def save_report_section_decorator(obj, func_name):
        func = getattr(obj, func_name)
        @wraps(func)
        def wrapper(section_name, content):
            # Call original method first (updates in-memory state)
            func(section_name, content)

            # Read final content from memory (matches cli/main.py file write behavior)
            if section_name in obj.report_sections and obj.report_sections[section_name] is not None:
                final_content = obj.report_sections[section_name]
                if final_content:
                    # Save to database (equivalent to file overwrite "w" mode)
                    save_report(task_id, section_name, final_content)
        return wrapper
    return save_report_section_decorator


def update_task_statistics(task_id: str):
    """
    Update task statistics in database.
    Matches cli/main.py update_display() statistics calculation logic (lines 381-387).

    This should be called periodically (e.g., after processing each chunk) to sync stats,
    similar to how cli/main.py calls update_display() in the streaming loop.

    Args:
        task_id: Task UUID
    """
    from database import get_db_session, Task, TaskMessage, Report

    db = get_db_session()
    try:
        # Get task by UUID
        task = db.query(Task).filter(Task.task_id == task_id).first()
        if not task:
            return False

        # Count tool calls
        # Matches: tool_calls_count = len(message_buffer.tool_calls)
        tool_calls_count = db.query(TaskMessage).filter(
            TaskMessage.task_id == task.id,
            TaskMessage.message_type == "tool_call"
        ).count()

        # Count LLM calls (messages with type "Reasoning")
        # Matches: llm_calls_count = sum(1 for _, msg_type, _ in message_buffer.messages if msg_type == "Reasoning")
        llm_calls_count = db.query(TaskMessage).filter(
            TaskMessage.task_id == task.id,
            TaskMessage.message_type == "Reasoning"
        ).count()

        # Count reports (non-null report sections)
        # Matches: reports_count = sum(1 for content in message_buffer.report_sections.values() if content is not None)
        reports_count = db.query(Report).filter(
            Report.task_id == task.id
        ).count()

        # Update task statistics
        task.tool_calls = tool_calls_count
        task.llm_calls = llm_calls_count
        task.reports_count = reports_count

        db.commit()
        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error updating task statistics for {task_id[:8]}: {e}")
        return False
    finally:
        db.close()


# ==================== Background Task Processing ====================


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
    Completely refactored to match cli/main.py run_analysis() logic.

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

        # Configure API keys and save originals
        original_keys = configure_api_keys(request)

        # Create configuration
        config = create_analysis_config(request, task_id)

        print(f"🚀 Initialize TradingAgentsGraph, Analysts: {[a.value for a in request.selected_analysts]}")

        # Initialize TradingAgents
        ta = TradingAgentsGraph(
            selected_analysts=[analyst.value for analyst in request.selected_analysts],
            debug=True,  # Match cli/main.py debug=True
            config=config
        )

        # Create initial state
        init_agent_state = ta.propagator.create_initial_state(
            request.ticker,
            request.analysis_date
        )
        args = ta.propagator.get_graph_args()

        print(f"📊 Start streaming analysis...")

        # Initialize MessageBuffer (matches cli/main.py)
        message_buffer = MessageBuffer(task_id)

        # Apply decorator to save reports to database (matches cli/main.py decorator pattern)
        save_report_decorator = create_save_report_decorator(task_id)
        message_buffer.update_report_section = save_report_decorator(message_buffer, "update_report_section")

        # Convert selected_analysts to string values for comparison (matches cli/main.py)
        selected_analyst_values = [analyst.value for analyst in request.selected_analysts]

        # Add initial messages
        message_buffer.add_message("System", f"Selected ticker: {request.ticker}")
        message_buffer.add_message("System", f"Analysis date: {request.analysis_date}")
        message_buffer.add_message("System", f"Selected analysts: {', '.join(selected_analyst_values)}")

        # Reset agent statuses (already initialized in MessageBuffer)
        # Reset report sections (already initialized in MessageBuffer)

        # Update agent status to in_progress for the first analyst
        first_analyst = f"{request.selected_analysts[0].value.capitalize()} Analyst"
        message_buffer.update_agent_status(first_analyst, "in_progress")

        # Stream the analysis (match cli/main.py lines 850-1078)
        trace = []
        for chunk in ta.graph.stream(init_agent_state, **args):
            if len(chunk["messages"]) > 0:
                # Get the last message from the chunk
                last_message = chunk["messages"][-1]

                # Extract message content and type
                if hasattr(last_message, "content"):
                    content = extract_content_string(last_message.content)
                    msg_type = "Reasoning"
                else:
                    content = str(last_message)
                    msg_type = "System"

                # Add message to buffer
                message_buffer.add_message(msg_type, content)

                # If it's a tool call, add it to tool calls
                if hasattr(last_message, "tool_calls"):
                    for tool_call in last_message.tool_calls:
                        # Handle both dictionary and object tool calls
                        if isinstance(tool_call, dict):
                            message_buffer.add_tool_call(
                                tool_call["name"], tool_call["args"]
                            )
                        else:
                            message_buffer.add_tool_call(tool_call.name, tool_call.args)

                # Update reports and agent status based on chunk content
                # Analyst Team Reports
                if "market_report" in chunk and chunk["market_report"]:
                    message_buffer.update_report_section(
                        "market_report", chunk["market_report"]
                    )
                    message_buffer.update_agent_status("Market Analyst", "completed")
                    # Set next analyst to in_progress
                    if "social" in selected_analyst_values:
                        message_buffer.update_agent_status(
                            "Social Analyst", "in_progress"
                        )

                if "sentiment_report" in chunk and chunk["sentiment_report"]:
                    message_buffer.update_report_section(
                        "sentiment_report", chunk["sentiment_report"]
                    )
                    message_buffer.update_agent_status("Social Analyst", "completed")
                    # Set next analyst to in_progress
                    if "news" in selected_analyst_values:
                        message_buffer.update_agent_status(
                            "News Analyst", "in_progress"
                        )

                if "news_report" in chunk and chunk["news_report"]:
                    message_buffer.update_report_section(
                        "news_report", chunk["news_report"]
                    )
                    message_buffer.update_agent_status("News Analyst", "completed")
                    # Set next analyst to in_progress
                    if "fundamentals" in selected_analyst_values:
                        message_buffer.update_agent_status(
                            "Fundamentals Analyst", "in_progress"
                        )

                if "fundamentals_report" in chunk and chunk["fundamentals_report"]:
                    message_buffer.update_report_section(
                        "fundamentals_report", chunk["fundamentals_report"]
                    )
                    message_buffer.update_agent_status(
                        "Fundamentals Analyst", "completed"
                    )
                    # Set all research team members to in_progress
                    update_research_team_status(message_buffer, "in_progress")

                # Research Team - Handle Investment Debate State
                if (
                    "investment_debate_state" in chunk
                    and chunk["investment_debate_state"]
                ):
                    debate_state = chunk["investment_debate_state"]

                    # Update Bull Researcher status and report
                    if "bull_history" in debate_state and debate_state["bull_history"]:
                        # Keep all research team members in progress
                        update_research_team_status(message_buffer, "in_progress")
                        # Extract latest bull response
                        bull_responses = debate_state["bull_history"].split("\n")
                        latest_bull = bull_responses[-1] if bull_responses else ""
                        if latest_bull:
                            message_buffer.add_message("Reasoning", latest_bull)
                            # Update research report with bull's latest analysis
                            message_buffer.update_report_section(
                                "investment_plan",
                                f"### Bull Researcher Analysis\n{latest_bull}",
                            )

                    # Update Bear Researcher status and report
                    if "bear_history" in debate_state and debate_state["bear_history"]:
                        # Keep all research team members in progress
                        update_research_team_status(message_buffer, "in_progress")
                        # Extract latest bear response
                        bear_responses = debate_state["bear_history"].split("\n")
                        latest_bear = bear_responses[-1] if bear_responses else ""
                        if latest_bear:
                            message_buffer.add_message("Reasoning", latest_bear)
                            # Update research report with bear's latest analysis
                            message_buffer.update_report_section(
                                "investment_plan",
                                f"{message_buffer.report_sections['investment_plan']}\n\n### Bear Researcher Analysis\n{latest_bear}",
                            )

                    # Update Research Manager status and final decision
                    if (
                        "judge_decision" in debate_state
                        and debate_state["judge_decision"]
                    ):
                        # Keep all research team members in progress until final decision
                        update_research_team_status(message_buffer, "in_progress")
                        message_buffer.add_message(
                            "Reasoning",
                            f"Research Manager: {debate_state['judge_decision']}",
                        )
                        # Update research report with final decision
                        message_buffer.update_report_section(
                            "investment_plan",
                            f"{message_buffer.report_sections['investment_plan']}\n\n### Research Manager Decision\n{debate_state['judge_decision']}",
                        )
                        # Mark all research team members as completed
                        update_research_team_status(message_buffer, "completed")
                        # Set first risk analyst to in_progress
                        message_buffer.update_agent_status(
                            "Risky Analyst", "in_progress"
                        )

                # Trading Team
                if (
                    "trader_investment_plan" in chunk
                    and chunk["trader_investment_plan"]
                ):
                    message_buffer.update_report_section(
                        "trader_investment_plan", chunk["trader_investment_plan"]
                    )
                    # Set first risk analyst to in_progress
                    message_buffer.update_agent_status("Risky Analyst", "in_progress")

                # Risk Management Team - Handle Risk Debate State
                if "risk_debate_state" in chunk and chunk["risk_debate_state"]:
                    risk_state = chunk["risk_debate_state"]

                    # Update Risky Analyst status and report
                    if (
                        "current_risky_response" in risk_state
                        and risk_state["current_risky_response"]
                    ):
                        message_buffer.update_agent_status(
                            "Risky Analyst", "in_progress"
                        )
                        message_buffer.add_message(
                            "Reasoning",
                            f"Risky Analyst: {risk_state['current_risky_response']}",
                        )
                        # Update risk report with risky analyst's latest analysis only
                        message_buffer.update_report_section(
                            "final_trade_decision",
                            f"### Risky Analyst Analysis\n{risk_state['current_risky_response']}",
                        )

                    # Update Safe Analyst status and report
                    if (
                        "current_safe_response" in risk_state
                        and risk_state["current_safe_response"]
                    ):
                        message_buffer.update_agent_status(
                            "Safe Analyst", "in_progress"
                        )
                        message_buffer.add_message(
                            "Reasoning",
                            f"Safe Analyst: {risk_state['current_safe_response']}",
                        )
                        # Update risk report with safe analyst's latest analysis only
                        message_buffer.update_report_section(
                            "final_trade_decision",
                            f"### Safe Analyst Analysis\n{risk_state['current_safe_response']}",
                        )

                    # Update Neutral Analyst status and report
                    if (
                        "current_neutral_response" in risk_state
                        and risk_state["current_neutral_response"]
                    ):
                        message_buffer.update_agent_status(
                            "Neutral Analyst", "in_progress"
                        )
                        message_buffer.add_message(
                            "Reasoning",
                            f"Neutral Analyst: {risk_state['current_neutral_response']}",
                        )
                        # Update risk report with neutral analyst's latest analysis only
                        message_buffer.update_report_section(
                            "final_trade_decision",
                            f"### Neutral Analyst Analysis\n{risk_state['current_neutral_response']}",
                        )

                    # Update Portfolio Manager status and final decision
                    if "judge_decision" in risk_state and risk_state["judge_decision"]:
                        message_buffer.update_agent_status(
                            "Portfolio Manager", "in_progress"
                        )
                        message_buffer.add_message(
                            "Reasoning",
                            f"Portfolio Manager: {risk_state['judge_decision']}",
                        )
                        # Update risk report with final decision only
                        message_buffer.update_report_section(
                            "final_trade_decision",
                            f"### Portfolio Manager Decision\n{risk_state['judge_decision']}",
                        )
                        # Mark risk analysts as completed
                        message_buffer.update_agent_status("Risky Analyst", "completed")
                        message_buffer.update_agent_status("Safe Analyst", "completed")
                        message_buffer.update_agent_status(
                            "Neutral Analyst", "completed"
                        )
                        message_buffer.update_agent_status(
                            "Portfolio Manager", "completed"
                        )

                # Update task statistics after processing each chunk
                # Matches cli/main.py update_display() call in streaming loop (line 233)
                update_task_statistics(task_id)

            trace.append(chunk)

        # Get final state and decision
        final_state = trace[-1]
        decision = ta.process_signal(final_state["final_trade_decision"])

        # Update all agent statuses to completed
        for agent in message_buffer.agent_status:
            message_buffer.update_agent_status(agent, "completed")

        message_buffer.add_message(
            "Analysis", f"Completed analysis for {request.analysis_date}"
        )

        print(f"✅ Analysis completed, processed {len(trace)} chunks")

        # Update task status to completed
        update_task_status(task_id, "COMPLETED", final_decision=decision)

        # Restore original API keys
        restore_api_keys(*original_keys)

    except Exception as e:
        print(f"❌ Analysis task failed: {str(e)}")
        import traceback
        traceback.print_exc()

        # Update task status to failed
        if not update_task_status(task_id, "FAILED", error_message=str(e)):
            print(f"❌ Failed to update task {task_id[:8]} status to FAILED")

    finally:
        # Clean up memory collections
        if ta is not None:
            try:
                ta.cleanup_memory()
                print(f"🧹 Task {task_id[:8]} memory cleaned up")
            except Exception as cleanup_error:
                print(f"⚠️ Cleanup task {task_id[:8]} error during memory: {cleanup_error}")

# ==================== API Endpoints ====================


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

if __name__ == "__main__":
    import uvicorn

    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║          Running on: http://localhost:8000/               ║
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
