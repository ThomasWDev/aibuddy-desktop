import React, { useCallback } from 'react'
import { X, Circle } from 'lucide-react'
import Editor from '@monaco-editor/react'
import type { OpenFile } from '../../App'

interface EditorAreaProps {
  openFiles: OpenFile[]
  activeFileIndex: number
  onFileSelect: (index: number) => void
  onFileClose: (index: number) => void
  onContentChange: (index: number, content: string) => void
}

export function EditorArea({ 
  openFiles, 
  activeFileIndex, 
  onFileSelect, 
  onFileClose,
  onContentChange 
}: EditorAreaProps) {
  const activeFile = openFiles[activeFileIndex]

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined && activeFileIndex >= 0) {
      onContentChange(activeFileIndex, value)
    }
  }, [activeFileIndex, onContentChange])

  if (openFiles.length === 0) {
    return (
      <div 
        className="editor-area flex-1 flex items-center justify-center"
        style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: "'Nunito', sans-serif"
        }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-xl font-bold mb-2 text-white">
            No file open
          </p>
          <p className="text-sm text-slate-400 mb-4">
            Open a file from the explorer or use <kbd className="px-2 py-0.5 bg-slate-700 rounded text-cyan-400 font-mono text-xs">Cmd+O</kbd>
          </p>
          <div className="flex gap-2 justify-center">
            <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-md text-xs font-medium border border-amber-500/20">
              Click a file in Explorer
            </span>
            <span className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-md text-xs font-medium border border-cyan-500/20">
              Or ask AI to create one
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-area flex-1 flex flex-col overflow-hidden" style={{ background: '#0f172a' }}>
      {/* Tab bar */}
      <div 
        className="flex items-center overflow-x-auto"
        style={{ height: '35px', background: '#1e293b', borderBottom: '1px solid #334155' }}
      >
        {openFiles.map((file, index) => (
          <div
            key={file.path}
            className={`flex items-center gap-1.5 px-3 h-full cursor-pointer border-r text-sm ${
              index === activeFileIndex 
                ? 'bg-[#0f172a] text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            style={{ borderColor: '#334155' }}
            onClick={() => onFileSelect(index)}
          >
            {file.isDirty && (
              <Circle className="w-2 h-2 fill-current text-pink-400" />
            )}
            <span className="truncate max-w-[150px]">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFileClose(index)
              }}
              className="p-0.5 rounded hover:bg-slate-600 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {activeFile && (
          <Editor
            height="100%"
            language={activeFile.language}
            value={activeFile.content}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              fontSize: 14,
              lineHeight: 1.6,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 16 }
            }}
          />
        )}
      </div>
    </div>
  )
}
