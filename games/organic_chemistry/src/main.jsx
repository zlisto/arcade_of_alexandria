import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

const root = ReactDOM.createRoot(document.getElementById('root'))
// dev-only character turntable: http://localhost:5191/?viewer
if (import.meta.env.DEV && new URLSearchParams(location.search).has('viewer')) {
  import('./dev/ModelViewer').then(({ default: ModelViewer }) => root.render(<ModelViewer />))
} else {
  root.render(<App />)
}
