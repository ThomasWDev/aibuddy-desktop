import React, { useState } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  RefreshCw,
  Plus,
  MoreHorizontal
} from 'lucide-react'
import { FileTreeNode } from '../../hooks/useWorkspace'

interface SidebarProps {
  activeView: 'explorer' | 'search' | 'git' | 'extensions'
  workspacePath: string
  fileTree: FileTreeNode[]
  onFileSelect: (path: string) => void
  onRefresh: () => void
}

export function Sidebar({ activeView, workspacePath, fileTree, onFileSelect, onRefresh }: SidebarProps) {
  const workspaceName = workspacePath.split('/').pop() || workspacePath

  return (
    <div 
      className="sidebar flex flex-col overflow-hidden"
      style={{ 
        background: '#1e293b',
        borderRight: '1px solid #334155',
        fontFamily: "'Nunito', sans-serif",
        color: '#e2e8f0'
      }}
    >
      {/* Header */}
      <div 
        className="h-9 flex items-center justify-between px-3 border-b"
        style={{ borderColor: '#334155', background: '#0f172a' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {activeView === 'explorer' && 'Explorer'}
          {activeView === 'search' && 'Search'}
          {activeView === 'git' && 'Source Control'}
          {activeView === 'extensions' && 'Extensions'}
        </span>
        <div className="flex items-center gap-0.5">
          <button 
            onClick={onRefresh}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            title="New File"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            title="More Actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeView === 'explorer' && (
          <div className="py-1">
            {/* Workspace folder header */}
            <div 
              className="flex items-center px-2 py-1.5 text-sm font-semibold text-slate-200 cursor-pointer hover:bg-slate-700/50"
            >
              <ChevronDown className="w-4 h-4 mr-1 text-slate-400" />
              <FolderOpen className="w-4 h-4 mr-2 text-amber-400" />
              <span className="truncate">{workspaceName}</span>
            </div>
            
            {/* File tree */}
            <div className="pl-2">
              {fileTree.map(node => (
                <FileTreeItem 
                  key={node.path} 
                  node={node} 
                  onFileSelect={onFileSelect}
                  depth={0}
                />
              ))}
            </div>
          </div>
        )}

        {activeView === 'search' && (
          <div className="p-3">
            <input
              type="text"
              placeholder="Search files..."
              className="w-full px-3 py-2 rounded-md text-sm text-white placeholder-slate-500"
              style={{ background: '#0f172a', border: '1px solid #334155' }}
            />
          </div>
        )}

        {activeView === 'git' && (
          <div className="p-4 text-center">
            <span className="text-3xl mb-2 block">🌿</span>
            <p className="text-sm text-slate-400">Source control coming soon</p>
          </div>
        )}

        {activeView === 'extensions' && (
          <div className="p-4 text-center">
            <span className="text-3xl mb-2 block">🧩</span>
            <p className="text-sm text-slate-400">Extensions marketplace coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface FileTreeItemProps {
  node: FileTreeNode
  onFileSelect: (path: string) => void
  depth: number
}

function FileTreeItem({ node, onFileSelect, depth }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded)
    } else {
      onFileSelect(node.path)
    }
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    
    const iconColors: Record<string, string> = {
      'ts': 'text-blue-400',
      'tsx': 'text-blue-400',
      'js': 'text-yellow-400',
      'jsx': 'text-yellow-400',
      'json': 'text-amber-400',
      'css': 'text-pink-400',
      'scss': 'text-pink-400',
      'html': 'text-orange-400',
      'md': 'text-purple-400',
      'py': 'text-green-400',
      'rs': 'text-orange-500',
      'go': 'text-cyan-400',
    }
    
    const colorClass = iconColors[ext || ''] || 'text-slate-400'
    return <File className={`w-4 h-4 mr-2 ${colorClass}`} />
  }

  return (
    <div>
      <div 
        className="flex items-center py-1 px-2 rounded cursor-pointer hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all"
        style={{ paddingLeft: `${depth * 12 + 8}px`, fontSize: '13px' }}
        onClick={handleClick}
      >
        {node.isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1 text-slate-500" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-amber-400" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-amber-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-4 mr-1" />
            {getFileIcon(node.name)}
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeItem
              key={child.path}
              node={child}
              onFileSelect={onFileSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
