import { useState, useEffect, useCallback } from 'react'

export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  children?: FileTreeNode[]
}

export function useWorkspace() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadFileTree = useCallback(async (path: string) => {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return

    setIsLoading(true)
    try {
      const tree = await electronAPI.fs.readTree?.(path, 4) || []
      setFileTree(tree)
    } catch (error) {
      console.error('Failed to load file tree:', error)
      setFileTree([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshFileTree = useCallback(() => {
    if (workspacePath) {
      loadFileTree(workspacePath)
    }
  }, [workspacePath, loadFileTree])

  // Load file tree when workspace path changes
  useEffect(() => {
    if (workspacePath) {
      loadFileTree(workspacePath)
      
      // Save to recent workspaces
      const electronAPI = (window as any).electronAPI
      if (electronAPI) {
        electronAPI.store.get('recentWorkspaces').then((recent: string[] | undefined) => {
          const updated = [workspacePath, ...(recent || []).filter((p: string) => p !== workspacePath)].slice(0, 10)
          electronAPI.store.set('recentWorkspaces', updated)
        })
      }
    }
  }, [workspacePath, loadFileTree])

  // Load last workspace on mount
  useEffect(() => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI) {
      electronAPI.store.get('recentWorkspaces').then((recent: string[] | undefined) => {
        if (recent && recent.length > 0) {
          // Don't auto-open, let user choose
        }
      })
    }
  }, [])

  return {
    workspacePath,
    setWorkspacePath,
    fileTree,
    isLoading,
    refreshFileTree
  }
}

