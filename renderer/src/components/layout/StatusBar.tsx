import React from 'react'
import { GitBranch, AlertCircle, CheckCircle, Terminal, MessageSquare } from 'lucide-react'
import type { OpenFile } from '../../App'

interface StatusBarProps {
  workspacePath: string
  activeFile?: OpenFile
  onTogglePanel: () => void
  onToggleAIPanel: () => void
}

export function StatusBar({ workspacePath, activeFile, onTogglePanel, onToggleAIPanel }: StatusBarProps) {
  return (
    <div className="status-bar flex items-center justify-between">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded">
          <GitBranch className="w-3.5 h-3.5" />
          <span>main</span>
        </button>

        <button className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>0</span>
          <AlertCircle className="w-3.5 h-3.5 ml-1" />
          <span>0</span>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {activeFile && (
          <>
            <span>{activeFile.language}</span>
            <span>UTF-8</span>
            <span>LF</span>
          </>
        )}

        <button 
          onClick={onTogglePanel}
          className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded"
          title="Toggle Terminal"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        <button 
          onClick={onToggleAIPanel}
          className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded"
          title="Toggle AI Panel"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>AI</span>
        </button>

        <span className="text-xs opacity-75">AIBuddy Desktop</span>
      </div>
    </div>
  )
}

