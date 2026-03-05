import React from 'react'

interface ToolPermissionDialogProps {
  skillName: string
  tool: string
  action: string
  description: string
  onDecision: (decision: 'allow_once' | 'always_allow' | 'deny' | 'always_deny') => void
}

const TOOL_ICONS: Record<string, string> = {
  filesystem: '📁',
  terminal: '💻',
  git: '🌿',
  aws_cli: '☁️',
  docker: '🐳',
}

const TOOL_LABELS: Record<string, string> = {
  filesystem: 'Filesystem',
  terminal: 'Terminal',
  git: 'Git',
  aws_cli: 'AWS CLI',
  docker: 'Docker',
}

export function ToolPermissionDialog({
  skillName,
  tool,
  action,
  description,
  onDecision,
}: ToolPermissionDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Tool permission request"
    >
      <div
        className="rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid #334155' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              🔐
            </span>
            <div>
              <h3 className="text-white font-semibold text-base">Permission Required</h3>
              <p className="text-slate-400 text-xs">Tool execution request</p>
            </div>
          </div>

          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid #1e293b' }}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-14">Skill:</span>
              <span className="text-white font-medium">{skillName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-14">Tool:</span>
              <span className="text-white font-medium">
                {TOOL_ICONS[tool] || '🔧'} {TOOL_LABELS[tool] || tool}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-slate-500 w-14 flex-shrink-0">Action:</span>
              <span
                className="text-amber-300 font-mono text-xs px-2 py-1 rounded-lg break-all"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                {description}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => onDecision('allow_once')}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '1px solid #60a5fa' }}
            >
              Allow Once
            </button>
            <button
              onClick={() => onDecision('always_allow')}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid #34d399' }}
            >
              Always Allow
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onDecision('deny')}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-slate-700"
              style={{ background: 'rgba(100,116,139,0.2)', border: '1px solid #475569', color: '#94a3b8' }}
            >
              Deny
            </button>
            <button
              onClick={() => onDecision('always_deny')}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
            >
              Always Deny
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
