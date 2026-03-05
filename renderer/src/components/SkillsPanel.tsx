import React, { useState, useCallback } from 'react'

interface Skill {
  id: string
  name: string
  description: string
  prompt_template: string
  enabled: boolean
  scope: string
  created_by: string
  created_at: number
  updated_at: number
  builtin?: boolean
  order?: number
  visibility?: string
  execution_mode?: string
}

interface SkillsPanelProps {
  skills: Skill[]
  workspacePath: string | null
  onClose: () => void
  onSkillsChanged: () => void
}

export function SkillsPanel({ skills, workspacePath, onClose, onSkillsChanged }: SkillsPanelProps) {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editContent, setEditContent] = useState('')
  const [newEnabled, setNewEnabled] = useState(true)
  const [newScope, setNewScope] = useState<'global' | 'project'>('project')
  const [newVisibility, setNewVisibility] = useState<'private' | 'team'>('private')
  const [newExecutionMode, setNewExecutionMode] = useState<'always' | 'manual' | 'on_demand'>('always')
  const [isEditing, setIsEditing] = useState(false)

  const electronAPI = (window as any).electronAPI

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return
    const result = await electronAPI?.skills?.create({
      name: newName.trim(),
      description: newDescription.trim(),
      prompt_template: editContent,
      enabled: newEnabled,
      scope: newScope,
      visibility: newVisibility,
      execution_mode: newExecutionMode,
    })
    if (result) {
      setIsCreating(false)
      setNewName('')
      setNewDescription('')
      setEditContent('')
      onSkillsChanged()
    }
  }, [newName, newDescription, editContent, newEnabled, newScope, electronAPI, onSkillsChanged])

  const handleUpdate = useCallback(async () => {
    if (!selectedSkill) return
    const result = await electronAPI?.skills?.update(selectedSkill.id, {
      name: newName.trim() || undefined,
      description: newDescription.trim(),
      prompt_template: editContent,
    })
    if (result) {
      setIsEditing(false)
      setSelectedSkill(result)
      onSkillsChanged()
    }
  }, [selectedSkill, newName, newDescription, editContent, electronAPI, onSkillsChanged])

  const handleDelete = useCallback(async (skill: Skill) => {
    if (skill.builtin) return
    const ok = await electronAPI?.skills?.delete(skill.id)
    if (ok) {
      if (selectedSkill?.id === skill.id) setSelectedSkill(null)
      onSkillsChanged()
    }
  }, [selectedSkill, electronAPI, onSkillsChanged])

  const handleToggle = useCallback(async (skill: Skill) => {
    if (skill.builtin) return
    const result = await electronAPI?.skills?.toggle(skill.id)
    if (result) {
      if (selectedSkill?.id === skill.id) setSelectedSkill(result)
      onSkillsChanged()
    }
  }, [selectedSkill, electronAPI, onSkillsChanged])

  const startEdit = (skill: Skill) => {
    setNewName(skill.name)
    setNewDescription(skill.description)
    setEditContent(skill.prompt_template)
    setIsEditing(true)
    setIsCreating(false)
  }

  const startCreate = () => {
    setIsCreating(true)
    setIsEditing(false)
    setSelectedSkill(null)
    setNewName('')
    setNewDescription('')
    setEditContent('')
    setNewEnabled(true)
    setNewScope('project')
    setNewVisibility('private')
    setNewExecutionMode('always')
  }

  const builtinSkills = skills.filter(s => s.builtin)
  const userSkills = skills.filter(s => !s.builtin)

  const formatDate = (ts: number) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div
      className="fixed inset-0 flex z-50"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex w-full max-w-5xl m-auto rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          border: '2px solid #334155',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          height: '85vh',
        }}
      >
        {/* ── Skills Sidebar / List ── */}
        <div className="w-72 flex-shrink-0 border-r border-slate-700 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚡</span> Skills
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-all text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {skills.filter(s => s.enabled).length} active of {skills.length} total
            </p>
          </div>

          {/* Skills List — scrollable */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Built-in section */}
            {builtinSkills.length > 0 && (
              <>
                <p className="px-2 pt-2 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  Built-in
                </p>
                {builtinSkills.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => { setSelectedSkill(skill); setIsCreating(false); setIsEditing(false) }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                      selectedSkill?.id === skill.id ? 'bg-cyan-500/15 border-cyan-500/30' : 'hover:bg-slate-700/50'
                    }`}
                    style={selectedSkill?.id === skill.id ? { border: '1px solid rgba(6,182,212,0.3)' } : { border: '1px solid transparent' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 text-xs">🔒</span>
                      <span className="text-white font-medium truncate">{skill.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate pl-5">{skill.description}</p>
                  </button>
                ))}
              </>
            )}

            {/* User skills section */}
            <div className="flex items-center justify-between px-2 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                Custom
              </p>
              <button
                onClick={startCreate}
                className="text-[10px] font-medium px-2 py-0.5 rounded transition-all text-purple-400 hover:bg-purple-500/10"
              >
                + New
              </button>
            </div>

            {userSkills.length === 0 && !isCreating && (
              <p className="text-xs text-slate-600 italic px-3 py-2">
                No custom skills yet
              </p>
            )}

            {userSkills.map(skill => (
              <button
                key={skill.id}
                onClick={() => { setSelectedSkill(skill); setIsCreating(false); setIsEditing(false) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm group ${
                  selectedSkill?.id === skill.id ? 'bg-purple-500/10 border-purple-500/20' : 'hover:bg-slate-700/50'
                }`}
                style={selectedSkill?.id === skill.id ? { border: '1px solid rgba(168,85,247,0.2)' } : { border: '1px solid transparent' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex-shrink-0 w-2 h-2 rounded-full"
                    style={{ background: skill.enabled ? '#22c55e' : '#475569' }}
                  />
                  <span className="text-white font-medium truncate flex-1">{skill.name}</span>
                  <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {skill.scope}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate pl-4">{skill.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Skill Details Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Creating new skill */}
          {isCreating && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="text-lg font-bold text-purple-300">Create New Skill</h3>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="My Custom Skill"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Description</label>
                <input
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Brief description of what this skill does"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newEnabled}
                    onChange={e => setNewEnabled(e.target.checked)}
                    className="rounded"
                  />
                  Enabled
                </label>
                <select
                  value={newScope}
                  onChange={e => setNewScope(e.target.value as 'global' | 'project')}
                  className="text-sm px-2 py-1 rounded-lg text-white"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                >
                  <option value="project">Project scope</option>
                  <option value="global">Global scope</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Visibility</label>
                  <select
                    value={newVisibility}
                    onChange={e => setNewVisibility(e.target.value as 'private' | 'team')}
                    className="text-sm px-2 py-1 rounded-lg text-white"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                  >
                    <option value="private">Private</option>
                    <option value="team">Team</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Execution Mode</label>
                  <select
                    value={newExecutionMode}
                    onChange={e => setNewExecutionMode(e.target.value as 'always' | 'manual' | 'on_demand')}
                    className="text-sm px-2 py-1 rounded-lg text-white"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                  >
                    <option value="always">Always active</option>
                    <option value="manual">Manual trigger</option>
                    <option value="on_demand">On demand</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Prompt Template</label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Write instructions the AI should follow when this skill is active..."
                  rows={12}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500 font-mono resize-y"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                  }}
                >
                  Create Skill
                </button>
              </div>
            </div>
          )}

          {/* Viewing/editing a selected skill */}
          {selectedSkill && !isCreating && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedSkill.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{selectedSkill.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!selectedSkill.builtin && (
                    <>
                      <button
                        onClick={() => handleToggle(selectedSkill)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: selectedSkill.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                          color: selectedSkill.enabled ? '#22c55e' : '#94a3b8',
                          border: `1px solid ${selectedSkill.enabled ? 'rgba(34,197,94,0.3)' : '#475569'}`,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: selectedSkill.enabled ? '#22c55e' : '#64748b' }}
                        />
                        {selectedSkill.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(selectedSkill)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                          style={{ border: '1px solid #475569' }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(selectedSkill)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-900/20 transition-all"
                        style={{ border: '1px solid rgba(239,68,68,0.15)' }}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  {selectedSkill.builtin && (
                    <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-medium">
                      🔒 Built-in · Always Active
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <span>Scope: <span className="text-slate-400">{selectedSkill.scope}</span></span>
                <span>Visibility: <span className="text-slate-400">{selectedSkill.visibility || 'private'}</span></span>
                <span>Execution: <span className="text-slate-400">{(selectedSkill.execution_mode || 'always').replace('_', ' ')}</span></span>
                <span>Created by: <span className="text-slate-400">{selectedSkill.created_by}</span></span>
                {selectedSkill.created_at > 0 && (
                  <span>Created: <span className="text-slate-400">{formatDate(selectedSkill.created_at)}</span></span>
                )}
                {selectedSkill.updated_at > 0 && selectedSkill.updated_at !== selectedSkill.created_at && (
                  <span>Updated: <span className="text-slate-400">{formatDate(selectedSkill.updated_at)}</span></span>
                )}
              </div>

              <div className="border-t border-slate-700/50 pt-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1">Name</label>
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1">Description</label>
                      <input
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1">Prompt Template</label>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white font-mono resize-y"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdate}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                          color: 'white',
                          boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                        }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Prompt Template</p>
                    <div
                      className="rounded-lg p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto"
                      style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid #334155' }}
                    >
                      {selectedSkill.prompt_template}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!selectedSkill && !isCreating && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-3">⚡</p>
                <p className="text-slate-400 text-sm font-medium">Select a skill to view details</p>
                <p className="text-slate-600 text-xs mt-1">Or create a new one to customize AI behavior</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-700/50 text-[11px] text-slate-600 flex items-center justify-between">
            <span>
              Skills are stored in <code className="text-slate-500">~/.aibuddy/skills/</code> and injected into every AI prompt.
            </span>
            <span className="text-slate-500">
              {skills.filter(s => s.enabled).length} enabled · {skills.filter(s => !s.builtin).length} custom
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
