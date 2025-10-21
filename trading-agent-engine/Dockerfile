# Python FastAPI application
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install build tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with optimizations
# Use --prefer-binary to avoid building from source when possible
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run the FastAPI application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
