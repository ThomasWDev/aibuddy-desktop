import React, { useState, useEffect } from 'react'
import { FolderOpen, Clock, Sparkles, Github, Book, MessageSquare } from 'lucide-react'

interface WelcomeScreenProps {
  onOpenFolder: (path: string) => void
}

export function WelcomeScreen({ onOpenFolder }: WelcomeScreenProps) {
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([])

  useEffect(() => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI) {
      electronAPI.store.get('recentWorkspaces').then((recent: string[] | undefined) => {
        if (recent) {
          setRecentWorkspaces(recent)
        }
      })
    }
  }, [])

  const handleOpenFolder = async () => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI) {
      const path = await electronAPI.dialog.openFolder()
      if (path) {
        onOpenFolder(path)
      }
    }
  }

  const handleOpenRecent = (path: string) => {
    onOpenFolder(path)
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 flex items-center justify-center border-b border-border draggable">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold">AIBuddy Desktop</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Logo and tagline */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome to AIBuddy</h1>
            <p className="text-muted-foreground">
              Your intelligent coding partner powered by Claude
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Open Folder</h3>
                <p className="text-sm text-muted-foreground">Start working on a project</p>
              </div>
            </button>

            <button
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">New Chat</h3>
                <p className="text-sm text-muted-foreground">Start a conversation with AI</p>
              </div>
            </button>
          </div>

          {/* Recent workspaces */}
          {recentWorkspaces.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent
              </h2>
              <div className="space-y-1">
                {recentWorkspaces.slice(0, 5).map((path) => (
                  <button
                    key={path}
                    onClick={() => handleOpenRecent(path)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <FolderOpen className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{path.split('/').pop()}</p>
                      <p className="text-xs text-muted-foreground truncate">{path}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Help links */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <a
              href="https://aibuddy.life/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Book className="w-4 h-4" />
              Documentation
            </a>
            <a
              href="https://github.com/AIBuddyStudio/aibuddy-desktop"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-8 flex items-center justify-center text-xs text-muted-foreground border-t border-border">
        <span>AIBuddy Desktop v1.0.0 • Powered by Claude</span>
      </div>
    </div>
  )
}

