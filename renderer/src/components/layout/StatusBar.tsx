import React from 'react'
import { GitBranch, AlertCircle, CheckCircle, Terminal, MessageSquare, Sparkles, Zap } from 'lucide-react'
import type { OpenFile } from '../../App'

interface StatusBarProps {
  workspacePath: string
  activeFile?: OpenFile
  onTogglePanel: () => void
  onToggleAIPanel: () => void
}

// Tooltip component for status bar
function StatusTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-slate-600 z-50 font-medium">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  )
}

export function StatusBar({ workspacePath, activeFile, onTogglePanel, onToggleAIPanel }: StatusBarProps) {
  return (
    <div 
      className="status-bar flex items-center justify-between px-3"
      style={{ 
        background: 'linear-gradient(90deg, #ec4899 0%, #f97316 50%, #06b6d4 100%)',
        fontFamily: "'Nunito', sans-serif",
        fontWeight: 600,
        fontSize: '13px'
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <StatusTooltip text="🌿 Current Git branch">
          <button className="flex items-center gap-1.5 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all">
            <GitBranch className="w-4 h-4" />
            <span>main</span>
          </button>
        </StatusTooltip>

        <StatusTooltip text="✓ No errors or warnings in your code!">
          <button className="flex items-center gap-1.5 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all">
            <CheckCircle className="w-4 h-4" />
            <span>0</span>
            <AlertCircle className="w-4 h-4 ml-1" />
            <span>0</span>
          </button>
        </StatusTooltip>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {activeFile && (
          <>
            <StatusTooltip text={`📄 File type: ${activeFile.language}`}>
              <span className="px-2 py-0.5 bg-white/20 rounded-md text-xs cursor-default">{activeFile.language}</span>
            </StatusTooltip>
            <StatusTooltip text="📝 Text encoding">
              <span className="opacity-80 cursor-default">UTF-8</span>
            </StatusTooltip>
            <StatusTooltip text="↵ Line endings">
              <span className="opacity-80 cursor-default">LF</span>
            </StatusTooltip>
          </>
        )}

        <StatusTooltip text="💻 Open the terminal to run commands">
          <button 
            onClick={onTogglePanel}
            className="flex items-center gap-1.5 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all"
          >
            <Terminal className="w-4 h-4" />
            <span>Terminal</span>
          </button>
        </StatusTooltip>

        <StatusTooltip text="✨ Chat with AI to get coding help!">
          <button 
            onClick={onToggleAIPanel}
            className="flex items-center gap-1.5 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI</span>
          </button>
        </StatusTooltip>

        <div className="flex items-center gap-1.5 opacity-90">
          <Zap className="w-4 h-4" />
          <span>AIBuddy Desktop</span>
        </div>
      </div>
    </div>
  )
}

