import React, { useState } from 'react'
import { 
  Files, 
  Search, 
  GitBranch, 
  Puzzle,
  Sparkles
} from 'lucide-react'

interface ActivityBarProps {
  activeView: 'explorer' | 'search' | 'git' | 'extensions'
  onViewChange: (view: 'explorer' | 'search' | 'git' | 'extensions') => void
  onToggleSidebar: () => void
}

// Tooltip component - appears on hover to the right
function Tooltip({ title, children }: { title: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md z-50 shadow-lg border border-slate-700 whitespace-nowrap"
        >
          {title}
        </div>
      )}
    </div>
  )
}

export function ActivityBar({ activeView, onViewChange, onToggleSidebar }: ActivityBarProps) {
  const items = [
    { id: 'explorer' as const, icon: Files, title: 'Explorer' },
    { id: 'search' as const, icon: Search, title: 'Search' },
    { id: 'git' as const, icon: GitBranch, title: 'Source Control' },
    { id: 'extensions' as const, icon: Puzzle, title: 'Extensions' }
  ]

  return (
    <div 
      className="w-12 flex flex-col items-center py-2"
      style={{ 
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        fontFamily: "'Nunito', sans-serif"
      }}
    >
      {/* Logo at top */}
      <div className="mb-3 w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-lg">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      
      {/* Divider */}
      <div className="w-6 h-px bg-slate-700 mb-3" />
      
      {/* Navigation items - icons only */}
      <div className="flex flex-col gap-1">
        {items.map(item => {
          const isActive = activeView === item.id
          const Icon = item.icon
          
          return (
            <Tooltip key={item.id} title={item.title}>
              <button
                onClick={() => {
                  if (isActive) {
                    onToggleSidebar()
                  } else {
                    onViewChange(item.id)
                  }
                }}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-lg
                  transition-all duration-150
                  ${isActive 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }
                `}
                style={isActive ? { borderLeft: '2px solid #ec4899' } : {}}
              >
                <Icon className="w-5 h-5" />
              </button>
            </Tooltip>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}
