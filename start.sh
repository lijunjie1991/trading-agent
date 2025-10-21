#!/bin/bash

# TradingAgent Platform - Quick Start Script
# This script helps you quickly deploy the platform using Docker Compose

set -e

echo "=========================================="
echo "  TradingAgent Platform Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env file and add your API keys before continuing${NC}"
    echo -e "${YELLOW}Required: OPENAI_API_KEY or other LLM provider keys${NC}"
    echo ""
    read -p "Press Enter to edit .env now, or Ctrl+C to exit..."
    ${EDITOR:-nano} .env
fi

echo -e "${GREEN}✓ .env file exists${NC}"
echo ""

# Verify critical environment variables
if ! grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠ Warning: OPENAI_API_KEY may not be configured${NC}"
    echo "The platform requires at least one LLM provider API key"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Ask user what to do
echo "What would you like to do?"
echo "1) Start services (docker-compose up -d)"
echo "2) Start and rebuild services (docker-compose up -d --build)"
echo "3) Stop services (docker-compose down)"
echo "4) View logs (docker-compose logs -f)"
echo "5) Check service status (docker-compose ps)"
echo "6) Restart all services"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        echo ""
        echo "Starting services..."
        docker-compose up -d
        ;;
    2)
        echo ""
        echo "Building and starting services..."
        docker-compose up -d --build
        ;;
    3)
        echo ""
        echo "Stopping services..."
        docker-compose down
        exit 0
        ;;
    4)
        echo ""
        echo "Viewing logs (Ctrl+C to exit)..."
        docker-compose logs -f
        exit 0
        ;;
    5)
        echo ""
        docker-compose ps
        exit 0
        ;;
    6)
        echo ""
        echo "Restarting services..."
        docker-compose restart
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=========================================="
echo "  Services are starting up..."
echo "==========================================${NC}"
echo ""
echo "Please wait 30-60 seconds for all services to be ready"
echo ""

# Wait a bit for services to start
sleep 5

# Show status
echo "Current service status:"
docker-compose ps
echo ""

# Health check
echo "Waiting for services to be healthy..."
max_wait=60
counter=0

while [ $counter -lt $max_wait ]; do
    if docker-compose ps | grep -q "unhealthy"; then
        echo -n "."
        sleep 2
        counter=$((counter + 2))
    else
        break
    fi
done

echo ""
echo ""
echo -e "${GREEN}=========================================="
echo "  Platform is ready!"
echo "==========================================${NC}"
echo ""
echo "Access the services:"
echo -e "  ${GREEN}Frontend UI:${NC}      http://localhost"
echo -e "  ${GREEN}API Docs:${NC}         http://localhost:8080/swagger-ui.html"
echo -e "  ${GREEN}Engine API Docs:${NC}  http://localhost:8000/docs"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop services:    docker-compose down"
echo "  Restart service:  docker-compose restart <service-name>"
echo ""
echo "For more information, see DOCKER_SETUP.md"
echo ""
