/**
 * History Sidebar Component
 * 
 * Displays chat thread history like Cursor's sidebar.
 * Features:
 * - List of all chat threads
 * - Search functionality
 * - Create new thread
 * - Delete/rename threads
 * - Click to load thread
 */

import React, { useState, useEffect, useMemo } from 'react'
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Clock,
  ChevronLeft,
  MoreVertical,
  Star
} from 'lucide-react'
import { ChatThread } from '../../../src/history/types'

interface HistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectThread: (thread: ChatThread) => void
  onNewThread: () => void
  activeThreadId: string | null
}

export function HistorySidebar({ 
  isOpen, 
  onClose, 
  onSelectThread, 
  onNewThread,
  activeThreadId 
}: HistorySidebarProps) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load threads on mount
  useEffect(() => {
    loadThreads()
  }, [])

  const loadThreads = async () => {
    try {
      setIsLoading(true)
      const loadedThreads = await window.electronAPI.history.getThreads() as ChatThread[]
      setThreads(loadedThreads)
    } catch (error) {
      console.error('[HistorySidebar] Failed to load threads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter threads by search
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads
    const query = searchQuery.toLowerCase()
    return threads.filter(thread => 
      thread.title.toLowerCase().includes(query) ||
      thread.messages.some(msg => msg.content.toLowerCase().includes(query))
    )
  }, [threads, searchQuery])

  // Group threads by date (pinned threads shown separately at top)
  const groupedThreads = useMemo(() => {
    const groups: { [key: string]: ChatThread[] } = {
      'Pinned': [],
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    filteredThreads.forEach(thread => {
      // Pinned threads go to top section
      if (thread.isPinned) {
        groups['Pinned'].push(thread)
        return
      }
      
      const threadDate = new Date(thread.updatedAt)
      if (threadDate >= today) {
        groups['Today'].push(thread)
      } else if (threadDate >= yesterday) {
        groups['Yesterday'].push(thread)
      } else if (threadDate >= weekAgo) {
        groups['This Week'].push(thread)
      } else if (threadDate >= monthAgo) {
        groups['This Month'].push(thread)
      } else {
        groups['Older'].push(thread)
      }
    })

    return groups
  }, [filteredThreads])

  const handleDelete = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this chat thread?')) {
      await window.electronAPI.history.deleteThread(threadId)
      loadThreads()
    }
  }

  const handleRename = async (threadId: string) => {
    if (editTitle.trim()) {
      await window.electronAPI.history.renameThread(threadId, editTitle.trim())
      loadThreads()
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleTogglePin = async (threadId: string, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await window.electronAPI.history.updateMetadata(threadId, { isPinned: !isPinned })
      loadThreads()
    } catch (error) {
      console.error('[HistorySidebar] Failed to toggle pin:', error)
    }
  }

  const startEditing = (thread: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(thread.id)
    setEditTitle(thread.title)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-[#1a1a2e] border-r border-[#2a2a4a] z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a4a]">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          Chat History
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#2a2a4a] text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-[#2a2a4a]">
        <button
          onClick={onNewThread}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[#2a2a4a]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading...
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 px-4 text-center">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No chat history yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          Object.entries(groupedThreads).map(([group, groupThreads]) => {
            if (groupThreads.length === 0) return null
            return (
              <div key={group}>
                <div className={`px-4 py-2 text-xs font-medium uppercase tracking-wider ${
                  group === 'Pinned' 
                    ? 'bg-yellow-500/10 text-yellow-400 flex items-center gap-1.5' 
                    : 'bg-[#0d0d1a]/50 text-gray-500'
                }`}>
                  {group === 'Pinned' && <Star className="w-3 h-3 fill-current" />}
                  {group}
                </div>
                {groupThreads.map(thread => (
                  <div
                    key={thread.id}
                    onClick={() => onSelectThread(thread)}
                    className={`group px-4 py-3 cursor-pointer border-b border-[#2a2a4a]/50 transition-colors ${
                      activeThreadId === thread.id 
                        ? 'bg-purple-600/20 border-l-2 border-l-purple-500' 
                        : 'hover:bg-[#2a2a4a]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {editingId === thread.id ? (
                        <div className="flex-1 flex items-center gap-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(thread.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="flex-1 px-2 py-1 bg-[#0d0d1a] border border-purple-500 rounded text-white text-sm focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRename(thread.id) }}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(null) }}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {thread.isPinned ? (
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                              ) : (
                                <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium text-white truncate">
                                {thread.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span>{formatTime(thread.updatedAt)}</span>
                              <span>•</span>
                              <span>{thread.messages.length} messages</span>
                              {thread.totalCost && (
                                <>
                                  <span>•</span>
                                  <span>${thread.totalCost.toFixed(4)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleTogglePin(thread.id, !!thread.isPinned, e)}
                              className={`p-1 rounded transition-colors ${
                                thread.isPinned 
                                  ? 'text-yellow-400 hover:text-yellow-300' 
                                  : 'text-gray-400 hover:text-yellow-400'
                              }`}
                              title={thread.isPinned ? 'Unpin chat' : 'Pin chat'}
                            >
                              <Star className={`w-3.5 h-3.5 ${thread.isPinned ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => startEditing(thread, e)}
                              className="p-1 text-gray-400 hover:text-white rounded"
                              title="Rename chat"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(thread.id, e)}
                              className="p-1 text-gray-400 hover:text-red-400 rounded"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#2a2a4a] text-xs text-gray-500 text-center">
        {threads.length} chat{threads.length !== 1 ? 's' : ''} saved
      </div>
    </div>
  )
}

export default HistorySidebar

