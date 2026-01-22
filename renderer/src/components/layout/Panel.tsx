import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Terminal as TerminalIcon, AlertCircle, FileText } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface PanelProps {
  workspacePath: string
  onClose: () => void
}

type PanelTab = 'terminal' | 'problems' | 'output'

interface TerminalInstance {
  id: number
  name: string
  terminal: Terminal
  fitAddon: FitAddon
}

export function Panel({ workspacePath, onClose }: PanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('terminal')
  const [terminals, setTerminals] = useState<TerminalInstance[]>([])
  const [activeTerminalIndex, setActiveTerminalIndex] = useState(0)
  const terminalContainerRef = useRef<HTMLDivElement>(null)

  // Create initial terminal on mount
  useEffect(() => {
    createTerminal()
    
    return () => {
      // Cleanup terminals
      terminals.forEach(t => {
        t.terminal.dispose()
        const electronAPI = (window as any).electronAPI
        if (electronAPI) {
          electronAPI.terminal.kill(t.id)
        }
      })
    }
  }, [])

  // Fit terminal on resize
  useEffect(() => {
    const handleResize = () => {
      terminals.forEach(t => {
        t.fitAddon.fit()
        const electronAPI = (window as any).electronAPI
        if (electronAPI) {
          electronAPI.terminal.resize(t.id, t.terminal.cols, t.terminal.rows)
        }
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [terminals])

  const createTerminal = async () => {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return

    try {
      const id = await electronAPI.terminal.create({ cwd: workspacePath })
      
      const terminal = new Terminal({
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: 13,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#1e1e1e',
          selectionBackground: '#264f78',
          black: '#1e1e1e',
          red: '#f44747',
          green: '#6a9955',
          yellow: '#dcdcaa',
          blue: '#569cd6',
          magenta: '#c586c0',
          cyan: '#4ec9b0',
          white: '#d4d4d4',
          brightBlack: '#808080',
          brightRed: '#f44747',
          brightGreen: '#6a9955',
          brightYellow: '#dcdcaa',
          brightBlue: '#569cd6',
          brightMagenta: '#c586c0',
          brightCyan: '#4ec9b0',
          brightWhite: '#ffffff'
        }
      })

      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()

      terminal.loadAddon(fitAddon)
      terminal.loadAddon(webLinksAddon)

      // Handle terminal input
      terminal.onData(data => {
        electronAPI.terminal.write(id, data)
      })

      // Handle terminal output
      const unsubscribe = electronAPI.terminal.onData((termId: number, data: string) => {
        if (termId === id) {
          terminal.write(data)
        }
      })

      const newTerminal: TerminalInstance = {
        id,
        name: `Terminal ${terminals.length + 1}`,
        terminal,
        fitAddon
      }

      setTerminals(prev => [...prev, newTerminal])
      setActiveTerminalIndex(terminals.length)

      // Mount terminal after state update
      setTimeout(() => {
        if (terminalContainerRef.current) {
          terminal.open(terminalContainerRef.current)
          fitAddon.fit()
          electronAPI.terminal.resize(id, terminal.cols, terminal.rows)
        }
      }, 0)

    } catch (error) {
      console.error('Failed to create terminal:', error)
    }
  }

  const closeTerminal = (index: number) => {
    const terminal = terminals[index]
    if (!terminal) return

    terminal.terminal.dispose()
    const electronAPI = (window as any).electronAPI
    if (electronAPI) {
      electronAPI.terminal.kill(terminal.id)
    }

    setTerminals(prev => prev.filter((_, i) => i !== index))
    if (activeTerminalIndex >= index && activeTerminalIndex > 0) {
      setActiveTerminalIndex(prev => prev - 1)
    }
  }

  return (
    <div className="panel h-64 flex flex-col">
      {/* Tab bar */}
      <div className="h-9 flex items-center justify-between border-b border-border px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'terminal' 
                ? 'bg-accent text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TerminalIcon className="w-4 h-4 inline mr-1" />
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('problems')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'problems' 
                ? 'bg-accent text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Problems
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'output' 
                ? 'bg-accent text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Output
          </button>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === 'terminal' && (
            <button
              onClick={createTerminal}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              title="New Terminal"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && (
          <div className="h-full flex flex-col">
            {/* Terminal tabs */}
            {terminals.length > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
                {terminals.map((t, index) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer ${
                      index === activeTerminalIndex
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setActiveTerminalIndex(index)}
                  >
                    <span>{t.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTerminal(index)
                      }}
                      className="hover:bg-destructive/20 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Terminal container */}
            <div 
              ref={terminalContainerRef} 
              className="flex-1 p-2"
            />
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="p-4 text-sm text-muted-foreground">
            No problems detected.
          </div>
        )}

        {activeTab === 'output' && (
          <div className="p-4 text-sm text-muted-foreground">
            No output available.
          </div>
        )}
      </div>
    </div>
  )
}

