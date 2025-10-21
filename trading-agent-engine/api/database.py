"""
Database configuration and models for TradingAgents
Matches Java Spring Boot entity structure
"""
from sqlalchemy import create_engine, Column, BigInteger, String, Integer, Text, DateTime, Date, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "tradingagent")
DB_USERNAME = os.getenv("DB_USERNAME", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123456")

# URL encode username and password to handle special characters
encoded_username = quote_plus(DB_USERNAME)
encoded_password = quote_plus(DB_PASSWORD)

# Create database URL
DATABASE_URL = f"mysql+pymysql://{encoded_username}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

print(f"Connecting to: mysql+pymysql://{DB_USERNAME}:***@{DB_HOST}:{DB_PORT}/{DB_NAME}")

# SSL configuration for Azure MySQL
connect_args = {"connect_timeout": 10}
if "azure.com" in DB_HOST:
    # Azure MySQL requires SSL
    connect_args["ssl"] = {"ssl_mode": "REQUIRED"}

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Validate connection validity
    pool_recycle=3600,       # Recycle connections hourly
    pool_size=5,             # Connection pool size
    max_overflow=10,         # Max overflow connections
    echo=False,              # Disabled in productionSQLlogs
    connect_args=connect_args
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class User(Base):
    """User table - Corresponds to Java User entity"""
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    """Tasktable - Corresponds to Java Task entity"""
    __tablename__ = "tasks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_id = Column(String(36), unique=True, nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    analysis_date = Column(Date, nullable=False)
    selected_analysts = Column(Text, comment="JSON array of selected analysts")
    research_depth = Column(Integer, default=1)
    status = Column(String(20), default="PENDING", index=True)
    final_decision = Column(String(50))
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)

    # Statistics fields for real-time tracking
    tool_calls = Column(Integer, default=0, nullable=False)
    llm_calls = Column(Integer, default=0, nullable=False)
    reports_count = Column('reports', Integer, default=0, nullable=False)  # Column name is 'reports', attribute name is 'reports_count'

    # Relationships
    user = relationship("User", back_populates="tasks")
    reports_list = relationship("Report", back_populates="task", cascade="all, delete-orphan")


class Report(Base):
    """Report table - Corresponds to Java Report entity"""
    __tablename__ = "reports"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_id = Column(BigInteger, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String(50), nullable=False)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    task = relationship("Task", back_populates="reports")


class TaskMessage(Base):
    """TaskMessage table - Used to store messages generated during analysis"""
    __tablename__ = "task_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_id = Column(BigInteger, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    message_type = Column(String(20), nullable=False)
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    task = relationship("Task")


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session():
    """Get database session directly（for non-FastAPIscenarios）"""
    return SessionLocal()
