"""
Database service functions for TradingAgents
Handles all database operations
"""
from database import get_db_session, Task, Report, TaskMessage
from datetime import datetime
from typing import Optional, Dict, Any
import json
from sqlalchemy import text


def update_task_status(
    task_id: str,
    status: str,
    final_decision: Optional[str] = None,
    error_message: Optional[str] = None
):
    """
    Update task status

    Args:
        task_id: TaskUUID
        status: Status (PENDING, RUNNING, COMPLETED, FAILED)
        final_decision: Final decision
        error_message: Error message
    """
    db = get_db_session()
    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()
        if not task:
            error_msg = f"⚠️ Task not found in database: {task_id}"
            print(error_msg)
            print(f"   Attempted to update status to: {status}")
            if error_message:
                print(f"   Error message: {error_message}")
            return False

        print(f"📝 Updating task {task_id[:8]}: {task.status} -> {status}")
        task.status = status.upper()

        if final_decision:
            task.final_decision = final_decision
            print(f"   Final decision: {final_decision}")

        if error_message:
            task.error_message = error_message
            print(f"   Error message: {error_message[:100]}...")  # Print first100characters

        # ifTaskcompleted or failed，Set completion time
        if status.upper() in ["COMPLETED", "FAILED"]:
            task.completed_at = datetime.utcnow()

        db.commit()
        print(f"✅ Successfully updated task {task_id[:8]} status to {status}")
        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error updating task status for {task_id[:8]}: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def save_report(task_id: str, report_type: str, content: str):
    """
    SaveTaskReport

    Args:
        task_id: TaskUUID
        report_type: Report type
        content: Report content
    """
    db = get_db_session()
    try:
        # First by task_id (UUID) FindTask
        task = db.query(Task).filter(Task.task_id == task_id).first()
        if not task:
            print(f"⚠️ Task not found: {task_id}")
            return False

        # Create report，UsingDatabase primary key id
        report = Report(
            task_id=task.id,  # UsingDatabase primary key，notUUID
            report_type=report_type,
            content=content
        )

        db.add(report)
        db.commit()
        print(f"✅ Saved report '{report_type}' for task {task_id[:8]}")
        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error saving report: {e}")
        return False
    finally:
        db.close()


def get_task_by_uuid(task_id: str):
    """
    byUUIDGetTask

    Args:
        task_id: TaskUUID

    Returns:
        TaskobjectorNone
    """
    db = get_db_session()
    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()
        return task
    finally:
        db.close()


def save_task_message(task_id: str, message_type: str, content: Dict[Any, Any]):
    """
    SaveTaskmessage to database

    Args:
        task_id: TaskUUID
        message_type: Message type (status, message, tool_call, report, agent_status)
        content: Message content (dictionary)
    """
    db = get_db_session()
    try:
        # First by task_id (UUID) FindTask
        task = db.query(Task).filter(Task.task_id == task_id).first()
        if not task:
            print(f"⚠️ Task not found: {task_id}")
            return False

        # Create message record
        message = TaskMessage(
            task_id=task.id,  # UsingDatabase primary key
            message_type=message_type,
            content=content
        )

        db.add(message)
        db.commit()
        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error saving task message: {e}")
        return False
    finally:
        db.close()


def test_connection():
    """Test database connection"""
    try:
        from sqlalchemy import text
        db = get_db_session()
        # Execute simple query
        result = db.execute(text("SELECT 1")).fetchone()
        db.close()
        print("✅ Database connection successful!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def update_task_status_raw_sql(task_id: str, status: str, error_message: str = None):
    """
    Update task status using raw SQL (bypasses ORM, used as fallback when ORM fails)

    Args:
        task_id: Task UUID
        status: Status value
        error_message: Error message (optional)

    Returns:
        bool: Success status
    """
    db = get_db_session()
    try:
        if error_message:
            sql = text("""
                UPDATE tasks
                SET status = :status,
                    error_message = :error_message,
                    completed_at = NOW()
                WHERE task_id = :task_id
            """)
            db.execute(sql, {
                'status': status.upper(),
                'error_message': error_message,
                'task_id': task_id
            })
        else:
            sql = text("""
                UPDATE tasks
                SET status = :status
                WHERE task_id = :task_id
            """)
            db.execute(sql, {
                'status': status.upper(),
                'task_id': task_id
            })

        db.commit()
        print(f"✅ [RAW SQL] Updated task {task_id[:8]} status to {status}")
        return True
    except Exception as e:
        db.rollback()
        print(f"❌ [RAW SQL] Error updating task status for {task_id[:8]}: {e}")
        return False
    finally:
        db.close()


def increment_task_stats(
    task_id: str,
    tool_calls: int = 0,
    llm_calls: int = 0,
    reports: int = 0
):
    """
    Atomically increment task statistics using database-level operations
    This ensures thread-safety for concurrent task processing

    Args:
        task_id: Task UUID
        tool_calls: Number of tool calls to increment
        llm_calls: Number of LLM calls to increment
        reports: Number of reports to increment

    Returns:
        bool: Success status
    """
    db = get_db_session()
    try:
        # First get the task to find database primary key
        task = db.query(Task).filter(Task.task_id == task_id).first()
        if not task:
            print(f"⚠️ Task not found: {task_id}")
            return False

        # Use atomic SQL UPDATE to increment counters
        # This is thread-safe even with concurrent updates
        update_sql = text("""
            UPDATE tasks
            SET tool_calls = tool_calls + :tool_calls,
                llm_calls = llm_calls + :llm_calls,
                reports = reports + :reports
            WHERE id = :task_id
        """)

        db.execute(update_sql, {
            'tool_calls': tool_calls,
            'llm_calls': llm_calls,
            'reports': reports,
            'task_id': task.id
        })

        db.commit()
        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error incrementing task stats for {task_id[:8]}: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()
