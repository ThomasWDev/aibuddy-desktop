import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from 'sonner'
import { ActivityBar } from './components/layout/ActivityBar'
import { Sidebar } from './components/layout/Sidebar'
import { EditorArea } from './components/editor/EditorArea'
import { Panel } from './components/layout/Panel'
import { AIPanel } from './components/ai/AIPanel'
import { StatusBar } from './components/layout/StatusBar'
import { WelcomeScreen } from './components/welcome/WelcomeScreen'
import { useWorkspace } from './hooks/useWorkspace'
import { useTheme } from './hooks/useTheme'

export interface OpenFile {
  path: string
  name: string
  content: string
  language: string
  isDirty: boolean
}

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [aiPanelVisible, setAIPanelVisible] = useState(true)
  const [panelVisible, setPanelVisible] = useState(true)
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'extensions'>('explorer')
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1)
  
  const { workspacePath, setWorkspacePath, fileTree, refreshFileTree } = useWorkspace()
  const { theme } = useTheme()

  // Handle menu events from Electron
  useEffect(() => {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return

    const unsubscribers: (() => void)[] = []

    // File menu events
    unsubscribers.push(electronAPI.on('folder-opened', (path: string) => {
      setWorkspacePath(path)
    }))

    unsubscribers.push(electronAPI.on('file-opened', async (path: string) => {
      await openFile(path)
    }))

    unsubscribers.push(electronAPI.on('save-file', () => {
      saveCurrentFile()
    }))

    unsubscribers.push(electronAPI.on('save-all-files', () => {
      saveAllFiles()
    }))

    // View menu events
    unsubscribers.push(electronAPI.on('toggle-ai-panel', () => {
      setAIPanelVisible(prev => !prev)
    }))

    // AI menu events
    unsubscribers.push(electronAPI.on('new-chat', () => {
      // Trigger new chat in AI panel
    }))

    unsubscribers.push(electronAPI.on('open-settings', () => {
      // Open settings
    }))

    // Terminal events
    unsubscribers.push(electronAPI.on('new-terminal', () => {
      setPanelVisible(true)
    }))

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [])

  const openFile = useCallback(async (path: string) => {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return

    // Check if file is already open
    const existingIndex = openFiles.findIndex(f => f.path === path)
    if (existingIndex !== -1) {
      setActiveFileIndex(existingIndex)
      return
    }

    try {
      const content = await electronAPI.fs.readFile(path, 'utf-8')
      const name = path.split('/').pop() || path
      const language = getLanguageFromPath(path)

      const newFile: OpenFile = {
        path,
        name,
        content,
        language,
        isDirty: false
      }

      setOpenFiles(prev => [...prev, newFile])
      setActiveFileIndex(openFiles.length)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }, [openFiles])

  const closeFile = useCallback((index: number) => {
    setOpenFiles(prev => prev.filter((_, i) => i !== index))
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(prev => prev - 1)
    }
  }, [activeFileIndex])

  const saveCurrentFile = useCallback(async () => {
    if (activeFileIndex < 0 || activeFileIndex >= openFiles.length) return
    
    const file = openFiles[activeFileIndex]
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return

    try {
      await electronAPI.fs.writeFile(file.path, file.content)
      setOpenFiles(prev => prev.map((f, i) => 
        i === activeFileIndex ? { ...f, isDirty: false } : f
      ))
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }, [activeFileIndex, openFiles])

  const saveAllFiles = useCallback(async () => {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return

    const dirtyFiles = openFiles.filter(f => f.isDirty)
    for (const file of dirtyFiles) {
      try {
        await electronAPI.fs.writeFile(file.path, file.content)
      } catch (error) {
        console.error('Failed to save file:', file.path, error)
      }
    }

    setOpenFiles(prev => prev.map(f => ({ ...f, isDirty: false })))
  }, [openFiles])

  const updateFileContent = useCallback((index: number, content: string) => {
    setOpenFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, content, isDirty: true } : f
    ))
  }, [])

  // Show welcome screen if no workspace is open
  if (!workspacePath) {
    return (
      <>
        <WelcomeScreen onOpenFolder={setWorkspacePath} />
        <Toaster position="bottom-right" theme={theme} />
      </>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar 
          activeView={activeView}
          onViewChange={setActiveView}
          onToggleSidebar={() => setSidebarVisible(prev => !prev)}
        />

        {/* Sidebar */}
        {sidebarVisible && (
          <Sidebar
            activeView={activeView}
            workspacePath={workspacePath}
            fileTree={fileTree}
            onFileSelect={openFile}
            onRefresh={refreshFileTree}
          />
        )}

        {/* Editor and Panel area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Area */}
          <div className="flex-1 flex overflow-hidden">
            <EditorArea
              openFiles={openFiles}
              activeFileIndex={activeFileIndex}
              onFileSelect={setActiveFileIndex}
              onFileClose={closeFile}
              onContentChange={updateFileContent}
            />

            {/* AI Panel */}
            {aiPanelVisible && (
              <AIPanel
                workspacePath={workspacePath}
                onClose={() => setAIPanelVisible(false)}
              />
            )}
          </div>

          {/* Bottom Panel (Terminal, Output, etc.) */}
          {panelVisible && (
            <Panel
              workspacePath={workspacePath}
              onClose={() => setPanelVisible(false)}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        workspacePath={workspacePath}
        activeFile={openFiles[activeFileIndex]}
        onTogglePanel={() => setPanelVisible(prev => !prev)}
        onToggleAIPanel={() => setAIPanelVisible(prev => !prev)}
      />

      {/* Toast notifications */}
      <Toaster position="bottom-right" theme={theme} />
    </div>
  )
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    ps1: 'powershell',
    dockerfile: 'dockerfile'
  }
  return languageMap[ext || ''] || 'plaintext'
}

export default App

