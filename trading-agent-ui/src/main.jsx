import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ConfigProvider } from 'antd'
import App from './App.jsx'
import store from './store/store.js'
import './index.css'

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: '#667eea',
    colorSuccess: '#48bb78',
    colorWarning: '#ed8936',
    colorError: '#f56565',
    colorInfo: '#4299e1',
    borderRadius: 6,
    fontSize: 14,
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider theme={theme}>
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)
