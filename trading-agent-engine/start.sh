#!/bin/bash

# TradingAgents Engine Startup Script

echo "🚀 Starting TradingAgents Engine..."

# Activate virtual environment
source .venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
fi

# Install tradingagents package in editable mode
if ! python -c "import tradingagents" 2>/dev/null; then
    echo "📦 Installing tradingagents package..."
    pip install -e .
fi

# Check API keys
if [ -z "$OPENAI_API_KEY" ] && ! grep -q "OPENAI_API_KEY" .env 2>/dev/null; then
    echo "⚠️  Warning: OPENAI_API_KEY not found in environment or .env file"
    echo "Please set it in .env file or export as environment variable"
fi

if [ -z "$ALPHA_VANTAGE_API_KEY" ] && ! grep -q "ALPHA_VANTAGE_API_KEY" .env 2>/dev/null; then
    echo "⚠️  Warning: ALPHA_VANTAGE_API_KEY not found in environment or .env file"
    echo "Please set it in .env file or export as environment variable"
fi

# Start the service
echo "✨ Starting FastAPI service..."
cd api
python main.py
