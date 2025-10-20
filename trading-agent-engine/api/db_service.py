"""
Database service functions for TradingAgents
Handles all database operations
"""
from database import get_db_session, Task, Report, TaskMessage
from datetime import datetime
from typing import Optional, Dict, Any
import json


def update_task_status(
    task_id: str,
    status: str,
    final_decision: Optional[str] = None,
    error_message: Optional[str] = None
):
    """
    更新任务状态

    Args:
        task_id: 任务UUID
        status: 状态 (PENDING, RUNNING, COMPLETED, FAILED)
        final_decision: 最终决策
        error_message: 错误消息
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
            print(f"   Error message: {error_message[:100]}...")  # 打印前100个字符

        # 如果任务完成或失败，设置完成时间
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
    保存任务报告

    Args:
        task_id: 任务UUID
        report_type: 报告类型
        content: 报告内容
    """
    db = get_db_session()
    try:
        # 先通过 task_id (UUID) 查找任务
        task = db.query(Task).filter(Task.task_id == task_id).first()
        if not task:
            print(f"⚠️ Task not found: {task_id}")
            return False

        # 创建报告，使用数据库主键 id
        report = Report(
            task_id=task.id,  # 使用数据库主键，不是UUID
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
    通过UUID获取任务

    Args:
        task_id: 任务UUID

    Returns:
        Task对象或None
    """
    db = get_db_session()
    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()
        return task
    finally:
        db.close()


def save_task_message(task_id: str, message_type: str, content: Dict[Any, Any]):
    """
    保存任务消息到数据库

    Args:
        task_id: 任务UUID
        message_type: 消息类型 (status, message, tool_call, report, agent_status)
        content: 消息内容 (字典)
    """
    db = get_db_session()
    try:
        # 先通过 task_id (UUID) 查找任务
        task = db.query(Task).filter(Task.task_id == task_id).first()
        if not task:
            print(f"⚠️ Task not found: {task_id}")
            return False

        # 创建消息记录
        message = TaskMessage(
            task_id=task.id,  # 使用数据库主键
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
    """测试数据库连接"""
    try:
        from sqlalchemy import text
        db = get_db_session()
        # 执行简单查询
        result = db.execute(text("SELECT 1")).fetchone()
        db.close()
        print("✅ Database connection successful!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
