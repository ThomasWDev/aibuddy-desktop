import React from 'react'
import { 
  Files, 
  Search, 
  GitBranch, 
  Puzzle, 
  Settings,
  MessageSquare
} from 'lucide-react'

interface ActivityBarProps {
  activeView: 'explorer' | 'search' | 'git' | 'extensions'
  onViewChange: (view: 'explorer' | 'search' | 'git' | 'extensions') => void
  onToggleSidebar: () => void
}

export function ActivityBar({ activeView, onViewChange, onToggleSidebar }: ActivityBarProps) {
  const items = [
    { id: 'explorer' as const, icon: Files, label: 'Explorer' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'git' as const, icon: GitBranch, label: 'Source Control' },
    { id: 'extensions' as const, icon: Puzzle, label: 'Extensions' }
  ]

  return (
    <div className="activity-bar flex flex-col items-center py-2">
      {/* Main navigation items */}
      <div className="flex flex-col gap-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => {
              if (activeView === item.id) {
                onToggleSidebar()
              } else {
                onViewChange(item.id)
              }
            }}
            className={`
              w-12 h-12 flex items-center justify-center rounded-lg
              transition-colors duration-150
              ${activeView === item.id 
                ? 'text-primary border-l-2 border-primary bg-accent/50' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }
            `}
            title={item.label}
          >
            <item.icon className="w-6 h-6" />
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom items */}
      <div className="flex flex-col gap-1">
        <button
          className="w-12 h-12 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="AI Assistant"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
        <button
          className="w-12 h-12 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

