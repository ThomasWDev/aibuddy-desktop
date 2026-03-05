import React, { useState, useCallback } from 'react'

interface ProjectRule {
  filename: string
  description?: string
  alwaysApply?: boolean
  content: string
  builtin?: boolean
}

interface SkillsPanelProps {
  projectRules: ProjectRule[]
  workspacePath: string | null
  onClose: () => void
  onRulesChanged: () => void
}

export function SkillsPanel({ projectRules, workspacePath, onClose, onRulesChanged }: SkillsPanelProps) {
  const [editingRule, setEditingRule] = useState<ProjectRule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newFilename, setNewFilename] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editContent, setEditContent] = useState('')
  const [newAlwaysApply, setNewAlwaysApply] = useState(true)

  const electronAPI = (window as any).electronAPI

  const handleSave = useCallback(async () => {
    if (!workspacePath) return
    const filename = editingRule
      ? editingRule.filename
      : (newFilename.endsWith('.md') ? newFilename : newFilename + '.md')

    if (!filename.replace('.md', '').trim()) return

    const description = editingRule ? (editingRule.description || '') : newDescription
    const alwaysApply = editingRule ? editingRule.alwaysApply : newAlwaysApply

    const frontmatter = `---\ndescription: "${description}"\nalwaysApply: ${alwaysApply}\n---\n`
    const fullContent = frontmatter + editContent

    const ok = await electronAPI?.workspace?.saveProjectRule(workspacePath, filename, fullContent)
    if (ok) {
      setEditingRule(null)
      setIsCreating(false)
      setNewFilename('')
      setNewDescription('')
      setEditContent('')
      onRulesChanged()
    }
  }, [workspacePath, editingRule, newFilename, newDescription, editContent, newAlwaysApply, electronAPI, onRulesChanged])

  const handleDelete = useCallback(async (rule: ProjectRule) => {
    if (rule.builtin) return
    if (!workspacePath) return
    const ok = await electronAPI?.workspace?.deleteProjectRule(workspacePath, rule.filename)
    if (ok) onRulesChanged()
  }, [workspacePath, electronAPI, onRulesChanged])

  const handleToggle = useCallback(async (rule: ProjectRule) => {
    if (rule.builtin || !workspacePath) return
    const toggled = !rule.alwaysApply
    const frontmatter = `---\ndescription: "${rule.description || ''}"\nalwaysApply: ${toggled}\n---\n`
    const fullContent = frontmatter + rule.content
    const ok = await electronAPI?.workspace?.saveProjectRule(workspacePath, rule.filename, fullContent)
    if (ok) onRulesChanged()
  }, [workspacePath, electronAPI, onRulesChanged])

  const startEdit = (rule: ProjectRule) => {
    setEditingRule(rule)
    setEditContent(rule.content)
    setIsCreating(false)
  }

  const startCreate = () => {
    setIsCreating(true)
    setEditingRule(null)
    setNewFilename('')
    setNewDescription('')
    setEditContent('')
    setNewAlwaysApply(true)
  }

  const builtinRules = projectRules.filter(r => r.builtin)
  const userRules = projectRules.filter(r => !r.builtin)

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl"
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          border: '2px solid #334155',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>⚡</span> Project Skills
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Skills modify AI behavior for every response in this project
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Built-in Skills */}
          {builtinRules.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Built-in Skills
              </h3>
              <div className="space-y-2">
                {builtinRules.map(rule => (
                  <div
                    key={rule.filename}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-cyan-400 text-sm">🔒</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {rule.description || rule.filename}
                        </p>
                        <p className="text-xs text-slate-500">builtin · always active</p>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-medium">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Skills */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Custom Skills
              </h3>
              <button
                onClick={startCreate}
                disabled={!workspacePath}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                }}
              >
                + New Skill
              </button>
            </div>

            {!workspacePath && (
              <p className="text-sm text-slate-500 italic">
                Open a project folder to create custom skills
              </p>
            )}

            {userRules.length === 0 && workspacePath && !isCreating && (
              <p className="text-sm text-slate-500 italic">
                No custom skills yet. Create one to customize AI behavior.
              </p>
            )}

            <div className="space-y-2">
              {userRules.map(rule => (
                <div
                  key={rule.filename}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #334155' }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      className="flex-shrink-0 w-8 h-5 rounded-full transition-all relative"
                      style={{
                        background: rule.alwaysApply ? 'rgba(34, 197, 94, 0.5)' : 'rgba(100, 116, 139, 0.3)',
                        border: `1px solid ${rule.alwaysApply ? 'rgba(34, 197, 94, 0.6)' : '#475569'}`,
                      }}
                      title={rule.alwaysApply ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span
                        className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all"
                        style={{
                          background: rule.alwaysApply ? '#22c55e' : '#64748b',
                          left: rule.alwaysApply ? '14px' : '2px',
                        }}
                      />
                    </button>
                    <div className="min-w-0 cursor-pointer" onClick={() => startEdit(rule)}>
                      <p className="text-sm font-medium text-white truncate">
                        {rule.description || rule.filename}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{rule.filename}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(rule)}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs"
                    >
                      ✏️
                    </button>
                    {!rule.builtin && (
                      <button
                        onClick={() => handleDelete(rule)}
                        className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-all text-xs"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create / Edit Form */}
          {(isCreating || editingRule) && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.2)' }}
            >
              <h4 className="text-sm font-semibold text-purple-300">
                {editingRule ? `Editing: ${editingRule.description || editingRule.filename}` : 'Create New Skill'}
              </h4>

              {isCreating && (
                <>
                  <input
                    value={newFilename}
                    onChange={e => setNewFilename(e.target.value)}
                    placeholder="skill-filename.md"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                  />
                  <input
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Brief description of this skill"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={newAlwaysApply}
                      onChange={e => setNewAlwaysApply(e.target.checked)}
                      className="rounded"
                    />
                    Always active (inject into every prompt)
                  </label>
                </>
              )}

              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="Write skill instructions in Markdown..."
                rows={8}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500 font-mono resize-y"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setIsCreating(false); setEditingRule(null) }}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                  }}
                >
                  {editingRule ? 'Save Changes' : 'Create Skill'}
                </button>
              </div>
            </div>
          )}

          {/* Info footer */}
          <div className="text-xs text-slate-600 pt-2 border-t border-slate-800">
            Skills are stored in <code className="text-slate-500">.aibuddy/rules/</code> as Markdown files with YAML frontmatter.
            Active skills are injected into every AI prompt for this project.
          </div>
        </div>
      </div>
    </div>
  )
}
