import React, { useState, useEffect } from 'react'
import { 
  FolderOpen, 
  MessageSquare, 
  CreditCard, 
  Settings, 
  Sparkles,
  Key,
  Loader2,
  CheckCircle,
  XCircle,
  Circle
} from 'lucide-react'
import { trackButtonClick, addBreadcrumb } from '../../lib/sentry'

interface TopToolbarProps {
  onOpenFolder: () => void
  onNewChat: () => void
  onBuyCredits: () => void
  onOpenSettings: () => void
  onOpenApiKey: () => void
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  operationStatus: 'ready' | 'processing' | 'error'
  operationText?: string
}

// Tooltip component for toolbar buttons
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-xl border border-slate-700">
          {text}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-5px] border-4 border-transparent border-b-slate-900" />
        </div>
      )}
    </div>
  )
}

export function TopToolbar({ 
  onOpenFolder, 
  onNewChat, 
  onBuyCredits, 
  onOpenSettings,
  onOpenApiKey,
  connectionStatus,
  operationStatus,
  operationText
}: TopToolbarProps) {
  const [appVersion, setAppVersion] = useState('1.4.27')
  
  useEffect(() => {
    // Try to get version from electron
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.app?.getVersion) {
      electronAPI.app.getVersion().then((v: string) => setAppVersion(v)).catch(() => {})
    }
  }, [])
  
  const handleOpenFolder = () => {
    trackButtonClick('Open Folder', 'TopToolbar')
    addBreadcrumb('Open Folder clicked', 'user')
    onOpenFolder()
  }
  
  const handleNewChat = () => {
    trackButtonClick('New Chat', 'TopToolbar')
    addBreadcrumb('New Chat clicked', 'user')
    onNewChat()
  }
  
  const handleBuyCredits = () => {
    trackButtonClick('Buy Credits', 'TopToolbar')
    addBreadcrumb('Buy Credits clicked', 'user')
    onBuyCredits()
  }
  
  const handleOpenSettings = () => {
    trackButtonClick('Settings', 'TopToolbar')
    addBreadcrumb('Settings clicked', 'user')
    onOpenSettings()
  }
  
  const handleOpenApiKey = () => {
    trackButtonClick('API Key', 'TopToolbar')
    addBreadcrumb('API Key clicked', 'user')
    onOpenApiKey()
  }

  // Status indicator
  const StatusIcon = () => {
    if (connectionStatus === 'connected') {
      return <CheckCircle className="w-3.5 h-3.5 text-green-400" />
    } else if (connectionStatus === 'connecting') {
      return <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
    } else {
      return <XCircle className="w-3.5 h-3.5 text-red-400" />
    }
  }

  return (
    <div 
      className="h-11 flex items-center justify-between px-3 border-b border-slate-700/50"
      style={{ 
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        fontFamily: "'Nunito', sans-serif"
      }}
    >
      {/* Left: Logo, App Name, Version */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">AIBuddy</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
            v{appVersion}
          </span>
        </div>
        
        {/* Divider */}
        <div className="w-px h-5 bg-slate-700 mx-2" />
        
        {/* Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50">
          <StatusIcon />
          <span className="text-xs text-slate-300">
            {connectionStatus === 'connected' ? 'Ready' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
          </span>
        </div>
        
        {/* Operation Status */}
        {operationStatus === 'processing' && (
          <div className="flex items-center gap-1.5 text-xs text-yellow-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{operationText || 'Processing...'}</span>
          </div>
        )}
        {operationStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <XCircle className="w-3 h-3" />
            <span>{operationText || 'Error'}</span>
          </div>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1.5">
        <Tooltip text="Open a project folder">
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all border border-slate-700 hover:border-slate-600"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>
        </Tooltip>
        
        <Tooltip text="Start a new AI chat">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white text-xs font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </Tooltip>
        
        <div className="w-px h-5 bg-slate-700 mx-1" />
        
        <Tooltip text="Add your AIBuddy API key">
          <button
            onClick={handleOpenApiKey}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-all border border-amber-500/30 hover:border-amber-500/50"
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Key</span>
          </button>
        </Tooltip>
        
        <Tooltip text="Buy AIBuddy credits">
          <button
            onClick={handleBuyCredits}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all border border-slate-700 hover:border-slate-600"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Credits</span>
          </button>
        </Tooltip>
        
        <Tooltip text="Open settings">
          <button
            onClick={handleOpenSettings}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all border border-slate-700 hover:border-slate-600"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
