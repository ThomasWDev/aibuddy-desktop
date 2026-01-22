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
      <div className="editor-area flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No file open</p>
          <p className="text-sm">Open a file from the explorer or use Cmd+O</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-area flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="tab-bar flex items-center overflow-x-auto">
        {openFiles.map((file, index) => (
          <div
            key={file.path}
            className={`tab ${index === activeFileIndex ? 'active' : ''}`}
            onClick={() => onFileSelect(index)}
          >
            {file.isDirty && (
              <Circle className="w-2 h-2 fill-current text-primary" />
            )}
            <span className="truncate max-w-[150px]">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFileClose(index)
              }}
              className="p-0.5 rounded hover:bg-accent ml-1"
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

