# TradingAgents Frontend

A modern React-based web frontend for the TradingAgents multi-agent LLM trading analysis platform.

## Features

- **Real-time WebSocket Updates**: Live updates of agent progress, messages, and analysis results
- **Multi-Agent Visualization**: Track 12 different agents across 4 workflow stages
- **Markdown Rendering**: Beautiful rendering of agent messages and reports using marked.js
- **Purple Gradient Theme**: Modern, professional UI inspired by the reference design
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Redux State Management**: Centralized state management with Redux Toolkit
- **JWT Authentication**: Secure authentication with token management
- **Ant Design Components**: Professional UI components with consistent styling

## Tech Stack

- **React 18**: Modern React with hooks
- **Vite**: Lightning-fast build tool and dev server
- **Redux Toolkit**: State management
- **React Router v6**: Client-side routing
- **Ant Design 5**: UI component library
- **Axios**: HTTP client with interceptors
- **marked.js**: Markdown parsing and rendering
- **dayjs**: Date/time manipulation

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── Auth/          # Authentication components
│   │   │   ├── LoginForm.jsx
│   │   │   └── RegisterForm.jsx
│   │   ├── Common/        # Shared components
│   │   │   ├── Loading.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── Layout/        # Layout components
│   │   │   └── MainLayout.jsx
│   │   └── Task/          # Task-related components
│   │       ├── AgentPanel.jsx
│   │       ├── MessagePanel.jsx
│   │       ├── StatsPanel.jsx
│   │       ├── TaskCard.jsx
│   │       ├── TaskForm.jsx
│   │       └── WorkflowProgress.jsx
│   ├── pages/             # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── TaskDetail.jsx
│   │   ├── TaskHistory.jsx
│   │   └── TaskNew.jsx
│   ├── services/          # API services
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── taskService.js
│   │   └── websocketService.js
│   ├── store/             # Redux store
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   └── taskSlice.js
│   │   └── store.js
│   ├── utils/             # Utility functions
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── .env.example           # Environment variables template
├── .eslintrc.cjs          # ESLint configuration
├── index.html             # HTML template
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
└── README.md              # This file
```

## Installation

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` if needed (defaults to `localhost:8080`):
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   VITE_WS_BASE_URL=ws://localhost:8080
   ```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Lint

Run ESLint:

```bash
npm run lint
```

## Key Features

### 1. Authentication

- JWT-based authentication
- Token stored in localStorage
- Automatic token refresh on API calls
- Redirect to login on 401 errors

### 2. Real-time WebSocket Updates

The WebSocket service provides:
- Auto-reconnect with exponential backoff
- Heartbeat/ping to keep connection alive
- Event handlers for messages, connection, and errors
- Message type handling: status, message, tool_call, report, agent_status

### 3. Agent Progress Tracking

Track 12 agents across 4 teams:
- **Analyst Team**: Market, Social, News, Fundamentals
- **Research Team**: Bull, Bear, Research Manager
- **Trading Team**: Trader
- **Risk Management**: Aggressive, Conservative, Neutral, Risk Manager

### 4. Workflow Stages

Visual progress bar showing 4 stages:
1. **Analysis**: Data gathering and initial analysis
2. **Research**: Bull/Bear research and synthesis
3. **Trading**: Investment plan generation
4. **Risk Management**: Risk assessment and final decision

### 5. Message Panel

Real-time message display with:
- Markdown rendering for agent messages
- Syntax highlighting for code blocks
- Tool call visualization with JSON formatting
- Report display with structured content

### 6. Statistics Dashboard

Live statistics tracking:
- Tool calls count
- LLM calls count
- Generated reports count

## API Integration

### REST API Endpoints

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/analysis/start` - Start new analysis
- `GET /api/v1/tasks` - List tasks
- `GET /api/v1/tasks/:taskId` - Get task details
- `POST /api/v1/tasks/:taskId/cancel` - Cancel task

### WebSocket Endpoint

- `ws://localhost:8080/ws/analysis/:taskId` - Real-time task updates

### Message Types

1. **status**: Task status updates (running, completed, failed)
2. **message**: Agent reasoning messages (Markdown)
3. **tool_call**: Tool execution events
4. **report**: Generated reports
5. **agent_status**: Individual agent status updates

## Component Overview

### Pages

- **Login/Register**: Authentication pages
- **Dashboard**: Overview with stats and recent tasks
- **TaskNew**: Form to create new analysis
- **TaskDetail**: Real-time task monitoring with WebSocket
- **TaskHistory**: List all tasks with filtering

### Components

- **WorkflowProgress**: 4-stage horizontal progress bar
- **AgentPanel**: 12 agents status display
- **MessagePanel**: Real-time messages with Markdown
- **StatsPanel**: Tool/LLM/Report statistics
- **TaskCard**: Task list item card
- **TaskForm**: New task submission form

## Styling

The application uses:
- **Ant Design** for component styling
- **Custom CSS** for gradients and animations
- **Purple gradient theme** (#667eea to #764ba2)
- **Responsive design** with breakpoints for mobile, tablet, desktop

## State Management

Redux slices:

### authSlice
- User authentication state
- Token management
- Login/register/logout actions

### taskSlice
- Current task state
- Task list
- WebSocket messages
- Agent statuses
- Workflow progress
- Statistics

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_BASE_URL | Backend API URL | http://localhost:8080 |
| VITE_WS_BASE_URL | WebSocket URL | ws://localhost:8080 |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### WebSocket Connection Issues

If WebSocket connection fails:
1. Check backend is running on port 8080
2. Verify CORS settings on backend
3. Check browser console for errors
4. Try manual reconnect button

### Build Issues

Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Styling Issues

Clear Vite cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

## Development Tips

1. **Hot Module Replacement**: Vite provides instant HMR during development
2. **Redux DevTools**: Install Redux DevTools extension for debugging
3. **React DevTools**: Install React DevTools extension for component inspection
4. **Console Logging**: WebSocket messages are logged to console for debugging

## Contributing

When adding new features:
1. Follow existing code structure
2. Use TypeScript-style JSDoc comments
3. Add error handling
4. Test on multiple screen sizes
5. Update this README if needed

## License

Same as main TradingAgents project.
