import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LocaleProvider } from './contexts/LocaleContext'
import App from './App'
import './index.css'

const storedTheme = localStorage.getItem('app_theme')
const initialTheme = storedTheme === 'dark' ? 'dark' : 'light'
document.documentElement.classList.toggle('dark', initialTheme === 'dark')
document.documentElement.dataset.theme = initialTheme
document.documentElement.style.colorScheme = initialTheme

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>
)
