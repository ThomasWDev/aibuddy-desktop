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
    <div className="sidebar flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-4 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {activeView === 'explorer' && 'Explorer'}
          {activeView === 'search' && 'Search'}
          {activeView === 'git' && 'Source Control'}
          {activeView === 'extensions' && 'Extensions'}
        </span>
        <div className="flex items-center gap-1">
          <button 
            onClick={onRefresh}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="New File"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="More Actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeView === 'explorer' && (
          <div className="py-1">
            {/* Workspace folder header */}
            <div className="file-tree-item font-semibold text-sm">
              <ChevronDown className="w-4 h-4 mr-1" />
              <FolderOpen className="w-4 h-4 mr-2 text-yellow-500" />
              <span className="truncate">{workspaceName}</span>
            </div>
            
            {/* File tree */}
            <div className="pl-4">
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
          <div className="p-4">
            <input
              type="text"
              placeholder="Search files..."
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {activeView === 'git' && (
          <div className="p-4 text-sm text-muted-foreground">
            <p>Source control features coming soon...</p>
          </div>
        )}

        {activeView === 'extensions' && (
          <div className="p-4 text-sm text-muted-foreground">
            <p>Extensions marketplace coming soon...</p>
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
    
    // Return appropriate icon based on file extension
    // For now, just return the generic file icon
    return <File className="w-4 h-4 mr-2 text-muted-foreground" />
  }

  return (
    <div>
      <div 
        className="file-tree-item"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-yellow-500" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-yellow-500" />
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

