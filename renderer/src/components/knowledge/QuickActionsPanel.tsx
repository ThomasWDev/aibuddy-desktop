/**
 * Quick Actions Panel Component
 * 
 * Displays quick actions from the knowledge base.
 * Allows SSH connections, AI prompts, and links.
 */

import React, { useState } from 'react'
import type { QuickAction } from '../../../../src/knowledge/ai-integration'

interface QuickActionsPanelProps {
  actions: QuickAction[]
  onExecuteAction: (action: QuickAction) => void
  onCopyCommand?: (command: string) => void
  isCompact?: boolean
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  onExecuteAction,
  onCopyCommand,
  isCompact = false,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (action: QuickAction) => {
    if (action.command && onCopyCommand) {
      onCopyCommand(action.command)
      setCopiedId(action.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  // Group actions by category
  const groupedActions: Record<string, QuickAction[]> = {}
  for (const action of actions) {
    const category = action.category || 'other'
    if (!groupedActions[category]) {
      groupedActions[category] = []
    }
    groupedActions[category].push(action)
  }

  const categoryLabels: Record<string, string> = {
    connection: '🔗 Connection',
    monitoring: '📊 Monitoring',
    navigation: '🌐 Navigation',
    deployment: '🚀 Deployment',
    management: '⚙️ Management',
    billing: '💰 Billing',
    ci: '▶️ CI/CD',
    configuration: '🔧 Configuration',
    other: '⚡ Other',
  }

  if (actions.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          color: '#888',
          fontSize: '14px',
        }}
      >
        No quick actions available
      </div>
    )
  }

  if (isCompact) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onExecuteAction(action)}
            title={action.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Object.entries(groupedActions).map(([category, categoryActions]) => (
        <div key={category}>
          {/* Category Header */}
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#888',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {categoryLabels[category] || category}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {categoryActions.map((action) => (
              <div
                key={action.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Icon */}
                <span style={{ fontSize: '16px' }}>{action.icon}</span>

                {/* Label */}
                <span
                  style={{
                    flex: 1,
                    color: '#fff',
                    fontSize: '13px',
                  }}
                >
                  {action.label}
                </span>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {/* Copy button for SSH commands */}
                  {action.type === 'ssh' && action.command && (
                    <button
                      onClick={() => handleCopy(action)}
                      title="Copy SSH command"
                      style={{
                        padding: '4px 8px',
                        background: copiedId === action.id 
                          ? 'rgba(34, 197, 94, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: copiedId === action.id ? '#22c55e' : '#888',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedId === action.id ? '✓ Copied' : '📋 Copy'}
                    </button>
                  )}

                  {/* Execute button */}
                  <button
                    onClick={() => onExecuteAction(action)}
                    style={{
                      padding: '4px 12px',
                      background: action.type === 'ssh' 
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : action.type === 'ai_prompt'
                          ? 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {action.type === 'ssh' && '▶ Run'}
                    {action.type === 'ai_prompt' && '🤖 Ask'}
                    {action.type === 'link' && '🔗 Open'}
                    {action.type === 'command' && '⚡ Run'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default QuickActionsPanel

