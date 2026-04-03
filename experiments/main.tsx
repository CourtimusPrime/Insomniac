import React from 'react'
import ReactDOM from 'react-dom/client'
import '../src/index.css'
import { TaskBadges } from './task-badges'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div className="min-h-screen bg-background flex items-center justify-center">
      <TaskBadges />
    </div>
  </React.StrictMode>
)
