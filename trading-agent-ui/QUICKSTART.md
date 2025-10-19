# TradingAgents Frontend - Quick Start Guide

This guide will help you get the TradingAgents frontend up and running in minutes.

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8080`
- WebSocket server available at `ws://localhost:8080`

## Installation

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   The default configuration points to `localhost:8080`. If your backend runs on a different host/port, edit `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   VITE_WS_BASE_URL=ws://localhost:8080
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## First Steps

### 1. Register/Login

- Click "Register here" to create a new account
- Or login if you already have credentials
- The app uses JWT tokens stored in localStorage

### 2. Create Your First Analysis

From the Dashboard:
1. Click "New Analysis" button
2. Fill in the form:
   - **Ticker**: Stock symbol (e.g., NVDA, AAPL, TSLA)
   - **Analysis Date**: Date for the analysis
   - **Research Depth**: Choose 1-5 (higher = more thorough)
   - **Select Analysts**: Choose which analysts to include
3. Click "Start Analysis"

### 3. Watch Real-time Progress

You'll be redirected to the Task Detail page where you can:
- See the 4-stage workflow progress bar
- Track 12 agents in real-time
- View messages and tool calls
- Monitor statistics (tool calls, LLM calls, reports)
- Read the final report and decision

### 4. View Task History

- Click "Task History" in the sidebar
- Filter by status or search by ticker/task ID
- Click any task card to view details

## Features Overview

### Dashboard
- View task statistics
- Quick access to recent tasks
- Start new analysis

### Task Creation
- Simple form with validation
- Multiple analyst selection
- Configurable research depth

### Task Detail (Real-time View)
- **Workflow Progress**: 4-stage horizontal bar
- **Agent Panel**: Track all 12 agents
- **Message Panel**: Real-time messages with Markdown
- **Stats Panel**: Live statistics
- **Report Display**: Final report with decision

### Task History
- All your tasks in one place
- Filter by status
- Search by ticker or task ID

## WebSocket Messages

The frontend handles 5 message types:

1. **status**: Task status updates
   ```json
   {
     "type": "status",
     "data": {
       "status": "running|completed|failed",
       "message": "Status message",
       "decision": "BUY|SELL|HOLD"
     }
   }
   ```

2. **message**: Agent reasoning (Markdown)
   ```json
   {
     "type": "message",
     "data": {
       "content": "# Analysis\n\nReasoning here..."
     }
   }
   ```

3. **tool_call**: Tool execution
   ```json
   {
     "type": "tool_call",
     "data": {
       "tool_name": "fetch_market_data",
       "args": { "ticker": "NVDA" }
     }
   }
   ```

4. **report**: Generated reports
   ```json
   {
     "type": "report",
     "data": {
       "report_type": "market_analysis",
       "content": "# Market Report\n\n..."
     }
   }
   ```

5. **agent_status**: Agent status updates
   ```json
   {
     "type": "agent_status",
     "data": {
       "agent": "market",
       "status": "pending|running|completed"
     }
   }
   ```

## Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable components
│   │   ├── Auth/            # Login/Register forms
│   │   ├── Common/          # Shared components
│   │   ├── Layout/          # Layout components
│   │   └── Task/            # Task-related components
│   ├── pages/               # Route pages
│   ├── services/            # API and WebSocket services
│   ├── store/               # Redux state management
│   └── utils/               # Helper functions and constants
├── .env.example             # Environment template
├── vite.config.js           # Vite configuration
└── package.json             # Dependencies
```

## Development Tips

### Hot Reload
Vite provides instant hot module replacement. Changes are reflected immediately.

### Redux DevTools
Install the Redux DevTools browser extension to inspect state changes.

### Console Debugging
WebSocket messages are logged to the console for debugging.

### API Proxy
Vite proxies `/api` and `/ws` requests to the backend (configured in `vite.config.js`).

## Common Issues

### WebSocket Connection Failed
**Problem**: "WebSocket connection error" message

**Solutions**:
1. Ensure backend is running on port 8080
2. Check backend WebSocket endpoint is `/ws/analysis/:taskId`
3. Verify CORS settings on backend
4. Try the reconnect button

### 401 Unauthorized
**Problem**: Redirected to login unexpectedly

**Solutions**:
1. Token may have expired - login again
2. Check backend authentication endpoint
3. Clear localStorage and login again

### Styles Not Loading
**Problem**: Components look unstyled

**Solutions**:
1. Check Ant Design CSS is imported in `main.jsx`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Restart dev server

### Build Errors
**Problem**: Build fails with dependency errors

**Solutions**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Production Build

Build for production:
```bash
npm run build
```

Output will be in the `dist/` directory.

Preview the build:
```bash
npm run preview
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8080` |
| `VITE_WS_BASE_URL` | WebSocket URL | `ws://localhost:8080` |

## Tech Stack

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool
- **Redux Toolkit**: State management
- **React Router v6**: Routing
- **Ant Design 5**: UI components
- **Axios**: HTTP client
- **marked.js**: Markdown rendering
- **dayjs**: Date handling

## Next Steps

1. Explore the Dashboard
2. Create test analyses with different configurations
3. Watch real-time agent execution
4. Review generated reports
5. Check the Task History

## Support

For issues or questions:
1. Check this guide and README.md
2. Review console errors
3. Verify backend is running
4. Check network tab for API calls

## Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Ant Design Components](https://ant.design/components/overview/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [marked.js](https://marked.js.org/)

Happy analyzing! 🚀
