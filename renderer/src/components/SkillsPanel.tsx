import React, { useState, useCallback, useMemo, useEffect } from 'react'

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
  tags?: string[]
  source?: string
  catalog_id?: string
  allowed_tools?: string[]
  context_triggers?: { project_types?: string[]; file_patterns?: string[]; keywords?: string[] }
}

interface CatalogSkill {
  catalog_id: string
  name: string
  description: string
  prompt_template: string
  author: string
  tags: string[]
  category: string
  icon: string
  scope: string
  execution_mode: string
  allowed_tools?: string[]
  context_triggers?: { project_types?: string[]; file_patterns?: string[]; keywords?: string[] }
}

const TOOL_OPTIONS = [
  { value: 'filesystem', label: 'Filesystem', icon: '📁' },
  { value: 'terminal', label: 'Terminal', icon: '💻' },
  { value: 'git', label: 'Git', icon: '🌿' },
  { value: 'aws_cli', label: 'AWS CLI', icon: '☁️' },
  { value: 'docker', label: 'Docker', icon: '🐳' },
]

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
  const [newTags, setNewTags] = useState('')
  const [newAllowedTools, setNewAllowedTools] = useState<string[]>([])
  // KAN-293: Context trigger state
  const [newContextProjectTypes, setNewContextProjectTypes] = useState('')
  const [newContextFilePatterns, setNewContextFilePatterns] = useState('')
  const [newContextKeywords, setNewContextKeywords] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  // KAN-288: Marketplace state + KAN-290: audit log + KAN-291: execution history
  const [activeTab, setActiveTab] = useState<'skills' | 'marketplace' | 'audit' | 'activity'>('skills')
  const [auditLog, setAuditLog] = useState<Array<{ timestamp: number; skillId: string; skillName: string; tool: string; action: string; decision: string; success?: boolean; error?: string; durationMs?: number }>>([])
  const [permissions, setPermissions] = useState<Array<{ skillId: string; tool: string; level: string; grantedAt: number }>>([])
  const [executionHistory, setExecutionHistory] = useState<Array<{ id: string; timestamp: number; totalEvaluated: number; totalApplied: number; processingTimeMs: number; conflictCount: number; entries: Array<{ skillId: string; skillName: string; execution_mode: string; applied: boolean; reason: string }> }>>([])
  const [debugMode, setDebugMode] = useState(false)
  // KAN-292: API state
  const [apiSettings, setApiSettingsState] = useState<{ baseUrl: string; apiKey?: string; lastSyncAt?: number; autoSync?: boolean }>({ baseUrl: '' })
  const [apiUrlInput, setApiUrlInput] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiStatus, setApiStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [apiError, setApiError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ added: number; updated: number } | null>(null)
  const [showApiConfig, setShowApiConfig] = useState(false)

  const [catalog, setCatalog] = useState<CatalogSkill[]>([])
  const [installedIds, setInstalledIds] = useState<string[]>([])
  const [selectedCatalogSkill, setSelectedCatalogSkill] = useState<CatalogSkill | null>(null)
  const [catalogFilter, setCatalogFilter] = useState('')
  const [installing, setInstalling] = useState<string | null>(null)

  const electronAPI = (window as any).electronAPI

  // KAN-292: Load API settings on mount
  useEffect(() => {
    electronAPI?.skills?.apiGetSettings?.().then((s: any) => {
      if (s) {
        setApiSettingsState(s)
        setApiUrlInput(s.baseUrl || '')
        setApiKeyInput(s.apiKey || '')
        if (s.baseUrl) setApiStatus('connected')
      }
    })
  }, [electronAPI])

  // KAN-288: Load catalog when marketplace tab is opened (KAN-292: optionally from API)
  useEffect(() => {
    if (activeTab === 'marketplace') {
      if (apiSettings.baseUrl) {
        electronAPI?.skills?.apiGetCatalog?.().then((result: any) => {
          setCatalog(result?.skills || [])
        })
      } else {
        electronAPI?.skills?.getCatalog?.().then((c: CatalogSkill[]) => setCatalog(c || []))
      }
      electronAPI?.skills?.getInstalledCatalogIds?.().then((ids: string[]) => setInstalledIds(ids || []))
    }
  }, [activeTab, electronAPI, apiSettings.baseUrl])

  // KAN-290: Load audit log and permissions when audit tab is opened
  useEffect(() => {
    if (activeTab === 'audit') {
      electronAPI?.skills?.getAuditLog?.(50).then((log: any[]) => setAuditLog(log || []))
      electronAPI?.skills?.getAllPermissions?.().then((perms: any[]) => setPermissions(perms || []))
    }
  }, [activeTab, electronAPI])

  // KAN-291: Load execution history when activity tab is opened
  useEffect(() => {
    if (activeTab === 'activity') {
      electronAPI?.skills?.getExecutionHistory?.(50).then((records: any[]) => setExecutionHistory(records || []))
    }
  }, [activeTab, electronAPI])

  const handleInstall = useCallback(async (catalogId: string) => {
    setInstalling(catalogId)
    const result = await electronAPI?.skills?.install?.(catalogId)
    setInstalling(null)
    if (result) {
      setInstalledIds(prev => [...prev, catalogId])
      onSkillsChanged()
    }
  }, [electronAPI, onSkillsChanged])

  const catalogCategories = useMemo(() => {
    return [...new Set(catalog.map(s => s.category))].sort()
  }, [catalog])

  const filteredCatalog = useMemo(() => {
    if (!catalogFilter) return catalog
    return catalog.filter(s => s.category === catalogFilter)
  }, [catalog, catalogFilter])

  // KAN-287: Detect conflicts via shared tags
  const conflicts = useMemo(() => {
    const result: Array<{ skillA: string; skillB: string; sharedTags: string[] }> = []
    const enabledSkills = skills.filter(s => s.enabled)
    for (let i = 0; i < enabledSkills.length; i++) {
      const a = enabledSkills[i]
      if (!a.tags || a.tags.length === 0) continue
      for (let j = i + 1; j < enabledSkills.length; j++) {
        const b = enabledSkills[j]
        if (!b.tags || b.tags.length === 0) continue
        const shared = a.tags.filter(t => b.tags!.includes(t))
        if (shared.length > 0) {
          result.push({ skillA: a.id, skillB: b.id, sharedTags: shared })
        }
      }
    }
    return result
  }, [skills])

  const getConflictsForSkill = useCallback((skillId: string) => {
    return conflicts.filter(c => c.skillA === skillId || c.skillB === skillId)
  }, [conflicts])

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean)
    const result = await electronAPI?.skills?.create({
      name: newName.trim(),
      description: newDescription.trim(),
      prompt_template: editContent,
      enabled: newEnabled,
      scope: newScope,
      visibility: newVisibility,
      execution_mode: newExecutionMode,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      allowed_tools: newAllowedTools.length > 0 ? newAllowedTools : undefined,
      context_triggers: buildContextTriggers(),
    })
    if (result) {
      setIsCreating(false)
      setNewName('')
      setNewDescription('')
      setEditContent('')
      setNewTags('')
      setNewAllowedTools([])
      onSkillsChanged()
    }
  }, [newName, newDescription, editContent, newEnabled, newScope, newTags, newAllowedTools, electronAPI, onSkillsChanged])

  const handleUpdate = useCallback(async () => {
    if (!selectedSkill) return
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean)
    const result = await electronAPI?.skills?.update(selectedSkill.id, {
      name: newName.trim() || undefined,
      description: newDescription.trim(),
      prompt_template: editContent,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      allowed_tools: newAllowedTools.length > 0 ? newAllowedTools : undefined,
      context_triggers: buildContextTriggers(),
    })
    if (result) {
      setIsEditing(false)
      setSelectedSkill(result)
      onSkillsChanged()
    }
  }, [selectedSkill, newName, newDescription, editContent, newTags, electronAPI, onSkillsChanged])

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

  // KAN-287: Move skill up/down in priority
  const handleMoveUp = useCallback(async (skill: Skill) => {
    if (skill.builtin) return
    const userList = skills.filter(s => !s.builtin)
    const idx = userList.findIndex(s => s.id === skill.id)
    if (idx <= 0) return
    const reordered = [...userList]
    ;[reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]]
    await electronAPI?.skills?.reorder(reordered.map(s => s.id))
    onSkillsChanged()
  }, [skills, electronAPI, onSkillsChanged])

  const handleMoveDown = useCallback(async (skill: Skill) => {
    if (skill.builtin) return
    const userList = skills.filter(s => !s.builtin)
    const idx = userList.findIndex(s => s.id === skill.id)
    if (idx < 0 || idx >= userList.length - 1) return
    const reordered = [...userList]
    ;[reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]]
    await electronAPI?.skills?.reorder(reordered.map(s => s.id))
    onSkillsChanged()
  }, [skills, electronAPI, onSkillsChanged])

  // KAN-293: Build context triggers from form state
  const buildContextTriggers = () => {
    const pt = newContextProjectTypes.split(',').map(s => s.trim()).filter(Boolean)
    const fp = newContextFilePatterns.split(',').map(s => s.trim()).filter(Boolean)
    const kw = newContextKeywords.split(',').map(s => s.trim()).filter(Boolean)
    if (pt.length === 0 && fp.length === 0 && kw.length === 0) return undefined
    return {
      project_types: pt.length > 0 ? pt : undefined,
      file_patterns: fp.length > 0 ? fp : undefined,
      keywords: kw.length > 0 ? kw : undefined,
    }
  }

  const startEdit = (skill: Skill) => {
    setNewName(skill.name)
    setNewDescription(skill.description)
    setEditContent(skill.prompt_template)
    setNewTags((skill.tags || []).join(', '))
    setNewAllowedTools(skill.allowed_tools || [])
    setNewContextProjectTypes((skill.context_triggers?.project_types || []).join(', '))
    setNewContextFilePatterns((skill.context_triggers?.file_patterns || []).join(', '))
    setNewContextKeywords((skill.context_triggers?.keywords || []).join(', '))
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
    setNewTags('')
    setNewAllowedTools([])
    setNewContextProjectTypes('')
    setNewContextFilePatterns('')
    setNewContextKeywords('')
  }

  const toggleTool = (toolValue: string) => {
    setNewAllowedTools(prev =>
      prev.includes(toolValue) ? prev.filter(t => t !== toolValue) : [...prev, toolValue]
    )
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
            {/* KAN-288: Tab switcher */}
            <div className="flex gap-1 mb-2 p-0.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <button
                onClick={() => { setActiveTab('skills'); setSelectedCatalogSkill(null) }}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  activeTab === 'skills' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                My Skills
              </button>
              <button
                onClick={() => { setActiveTab('marketplace'); setSelectedSkill(null); setIsCreating(false) }}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  activeTab === 'marketplace' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🛒 Marketplace
              </button>
              <button
                onClick={() => { setActiveTab('activity'); setSelectedSkill(null); setSelectedCatalogSkill(null); setIsCreating(false) }}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  activeTab === 'activity' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                ⚡ Activity
              </button>
              <button
                onClick={() => { setActiveTab('audit'); setSelectedSkill(null); setSelectedCatalogSkill(null); setIsCreating(false) }}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  activeTab === 'audit' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                📋 Audit
              </button>
            </div>
            {/* KAN-292: API config toggle */}
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setShowApiConfig(!showApiConfig)}
                className={`text-[10px] flex items-center gap-1 transition-colors ${
                  apiSettings.baseUrl ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                ⚙ API {apiSettings.baseUrl ? '(connected)' : '(local only)'}
              </button>
              {apiSettings.baseUrl && (
                <button
                  onClick={async () => {
                    setSyncing(true)
                    setSyncResult(null)
                    try {
                      const result = await electronAPI?.skills?.apiSync?.()
                      if (result?.success) {
                        setSyncResult({ added: result.added, updated: result.updated })
                        const refreshed = await electronAPI?.skills?.getAll?.()
                        if (refreshed) onSkillsChanged?.()
                      } else {
                        setApiError(result?.error || 'Sync failed')
                      }
                    } catch { setApiError('Sync failed') }
                    setSyncing(false)
                  }}
                  disabled={syncing}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  {syncing ? '⟳ Syncing...' : '⟳ Sync'}
                </button>
              )}
            </div>
            {/* KAN-292: API config panel (collapsible) */}
            {showApiConfig && (
              <div className="mb-3 p-3 rounded-lg space-y-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1e293b' }}>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Skills API URL</label>
                  <input
                    value={apiUrlInput}
                    onChange={e => setApiUrlInput(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">API Key (optional)</label>
                  <input
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    type="password"
                    placeholder="Bearer token"
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setApiStatus('connecting')
                      setApiError('')
                      const validation = await electronAPI?.skills?.apiValidateUrl?.(apiUrlInput)
                      if (!validation?.valid) {
                        setApiStatus('error')
                        setApiError(validation?.reason || 'Invalid URL')
                        return
                      }
                      const newSettings = { baseUrl: apiUrlInput.trim(), apiKey: apiKeyInput.trim() || undefined, autoSync: apiSettings.autoSync }
                      await electronAPI?.skills?.apiSetSettings?.(newSettings)
                      setApiSettingsState(newSettings)
                      setApiStatus('connected')
                      setSyncResult(null)
                    }}
                    className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
                  >
                    {apiStatus === 'connecting' ? 'Connecting...' : 'Save & Connect'}
                  </button>
                  {apiSettings.baseUrl && (
                    <button
                      onClick={async () => {
                        await electronAPI?.skills?.apiSetSettings?.({ baseUrl: '', apiKey: undefined })
                        setApiSettingsState({ baseUrl: '' })
                        setApiUrlInput('')
                        setApiKeyInput('')
                        setApiStatus('idle')
                        setSyncResult(null)
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
                {apiStatus === 'error' && apiError && (
                  <p className="text-[10px] text-red-400">{apiError}</p>
                )}
                {syncResult && (
                  <p className="text-[10px] text-emerald-400">
                    Synced: {syncResult.added} added, {syncResult.updated} updated
                  </p>
                )}
                {apiSettings.lastSyncAt && (
                  <p className="text-[10px] text-slate-600">
                    Last sync: {new Date(apiSettings.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500">
              {activeTab === 'skills' ? (
                <>
                  {skills.filter(s => s.enabled).length} active of {skills.length} total
                  {conflicts.length > 0 && (
                    <span className="text-amber-400 ml-1">· {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}</span>
                  )}
                </>
              ) : activeTab === 'marketplace' ? (
                <>{catalog.length} skills available · {installedIds.length} installed</>
              ) : activeTab === 'activity' ? (
                <>{executionHistory.length} execution sessions{debugMode ? ' · Debug mode ON' : ''}</>
              ) : (
                <>{auditLog.length} log entries · {permissions.length} stored permissions</>
              )}
            </p>
          </div>

          {/* Skills List — scrollable */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* KAN-288: Marketplace catalog list */}
            {activeTab === 'marketplace' && (
              <>
                {catalogCategories.length > 1 && (
                  <div className="flex flex-wrap gap-1 px-1 pb-2">
                    <button
                      onClick={() => setCatalogFilter('')}
                      className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                        !catalogFilter ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      All
                    </button>
                    {catalogCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCatalogFilter(cat)}
                        className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                          catalogFilter === cat ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                {filteredCatalog.map(cs => {
                  const isInstalled = installedIds.includes(cs.catalog_id)
                  return (
                    <button
                      key={cs.catalog_id}
                      onClick={() => setSelectedCatalogSkill(cs)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                        selectedCatalogSkill?.catalog_id === cs.catalog_id ? 'bg-purple-500/10 border-purple-500/20' : 'hover:bg-slate-700/50'
                      }`}
                      style={selectedCatalogSkill?.catalog_id === cs.catalog_id ? { border: '1px solid rgba(168,85,247,0.2)' } : { border: '1px solid transparent' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cs.icon}</span>
                        <span className="text-white font-medium truncate flex-1">{cs.name}</span>
                        {isInstalled && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Installed</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate pl-6">{cs.description}</p>
                    </button>
                  )
                })}
              </>
            )}

            {activeTab === 'skills' && <>
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

            {userSkills.map((skill, idx) => {
              const skillConflicts = getConflictsForSkill(skill.id)
              return (
                <div key={skill.id} className="group relative">
                  <button
                    onClick={() => { setSelectedSkill(skill); setIsCreating(false); setIsEditing(false) }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
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
                      {skill.allowed_tools && skill.allowed_tools.length > 0 && (
                        <span className="text-emerald-400 text-[10px]" title={`Tool-enabled: ${skill.allowed_tools.join(', ')}`}>🔧</span>
                      )}
                      {skillConflicts.length > 0 && (
                        <span className="text-amber-400 text-[10px]" title="Has priority conflicts">⚠</span>
                      )}
                      <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        #{(skill.order ?? idx)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate pl-4">{skill.description}</p>
                  </button>
                  {/* KAN-287: Reorder controls */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveUp(skill) }}
                      className="text-[10px] text-slate-500 hover:text-white p-0.5 leading-none"
                      title="Move up (higher priority)"
                      disabled={idx === 0}
                    >
                      ▲
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveDown(skill) }}
                      className="text-[10px] text-slate-500 hover:text-white p-0.5 leading-none"
                      title="Move down (lower priority)"
                      disabled={idx === userSkills.length - 1}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              )
            })}
            </>}
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
                    <option value="on_demand">Context-aware (on demand)</option>
                  </select>
                </div>
              </div>

              {/* KAN-293: Context triggers (shown when execution_mode is on_demand) */}
              {newExecutionMode === 'on_demand' && (
                <div className="space-y-2 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="text-[10px] text-blue-400 font-medium">Context Triggers — skill activates when any condition matches</p>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Project Types (comma-separated, e.g. react, python, docker)</label>
                    <input
                      value={newContextProjectTypes}
                      onChange={e => setNewContextProjectTypes(e.target.value)}
                      placeholder="react, next, node"
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">File Patterns (comma-separated, e.g. Dockerfile, pom.xml)</label>
                    <input
                      value={newContextFilePatterns}
                      onChange={e => setNewContextFilePatterns(e.target.value)}
                      placeholder="Dockerfile, docker-compose.yml"
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Keywords (comma-separated, matched against user message)</label>
                    <input
                      value={newContextKeywords}
                      onChange={e => setNewContextKeywords(e.target.value)}
                      placeholder="deploy, docker, database"
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white placeholder-slate-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Tags (comma-separated, for conflict detection)</label>
                <input
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="security, code-style, testing"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Tool Permissions (user confirmation required)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TOOL_OPTIONS.map(tool => (
                    <button
                      key={tool.value}
                      type="button"
                      onClick={() => toggleTool(tool.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: newAllowedTools.includes(tool.value) ? 'rgba(59,130,246,0.3)' : 'rgba(0,0,0,0.3)',
                        border: newAllowedTools.includes(tool.value) ? '1px solid #3b82f6' : '1px solid #475569',
                        color: newAllowedTools.includes(tool.value) ? '#93c5fd' : '#94a3b8',
                      }}
                    >
                      {tool.icon} {tool.label}
                    </button>
                  ))}
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

              {/* KAN-287: Conflict warnings */}
              {getConflictsForSkill(selectedSkill.id).length > 0 && (
                <div
                  className="rounded-lg p-3 text-xs"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
                >
                  <p className="font-semibold text-amber-400 mb-1">⚠ Priority Conflicts</p>
                  {getConflictsForSkill(selectedSkill.id).map((c, i) => {
                    const otherId = c.skillA === selectedSkill.id ? c.skillB : c.skillA
                    const other = skills.find(s => s.id === otherId)
                    return (
                      <p key={i} className="text-amber-300/80">
                        Overlaps with <strong>{other?.name || otherId}</strong> on tags: {c.sharedTags.join(', ')}
                        {' '}— lower-order skill takes precedence
                      </p>
                    )
                  })}
                </div>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <span>Priority: <span className="text-slate-400">#{selectedSkill.order ?? '—'}</span></span>
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

              {/* Tags display */}
              {selectedSkill.tags && selectedSkill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkill.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Tool permissions display */}
              {selectedSkill.allowed_tools && selectedSkill.allowed_tools.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Tool Permissions</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedSkill.allowed_tools.map(tool => {
                      const opt = TOOL_OPTIONS.find(t => t.value === tool)
                      return (
                        <span
                          key={tool}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}
                        >
                          {opt?.icon || '🔧'} {opt?.label || tool}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* KAN-293: Context triggers display */}
              {selectedSkill.context_triggers && (selectedSkill.context_triggers.project_types?.length || selectedSkill.context_triggers.file_patterns?.length || selectedSkill.context_triggers.keywords?.length) && (
                <div>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Context Triggers</span>
                  <div className="mt-1 space-y-1">
                    {selectedSkill.context_triggers.project_types && selectedSkill.context_triggers.project_types.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-slate-600">Projects:</span>
                        {selectedSkill.context_triggers.project_types.map(pt => (
                          <span key={pt} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }}>{pt}</span>
                        ))}
                      </div>
                    )}
                    {selectedSkill.context_triggers.file_patterns && selectedSkill.context_triggers.file_patterns.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-slate-600">Files:</span>
                        {selectedSkill.context_triggers.file_patterns.map(fp => (
                          <span key={fp} className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(234,179,8,0.1)', color: '#fcd34d' }}>{fp}</span>
                        ))}
                      </div>
                    )}
                    {selectedSkill.context_triggers.keywords && selectedSkill.context_triggers.keywords.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-slate-600">Keywords:</span>
                        {selectedSkill.context_triggers.keywords.map(kw => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.1)', color: '#c4b5fd' }}>{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                      <label className="text-xs font-medium text-slate-400 block mb-1">Tags (comma-separated)</label>
                      <input
                        value={newTags}
                        onChange={e => setNewTags(e.target.value)}
                        placeholder="security, code-style"
                        className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #475569' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1">Tool Permissions</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {TOOL_OPTIONS.map(tool => (
                          <button
                            key={tool.value}
                            type="button"
                            onClick={() => toggleTool(tool.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: newAllowedTools.includes(tool.value) ? 'rgba(59,130,246,0.3)' : 'rgba(0,0,0,0.3)',
                              border: newAllowedTools.includes(tool.value) ? '1px solid #3b82f6' : '1px solid #475569',
                              color: newAllowedTools.includes(tool.value) ? '#93c5fd' : '#94a3b8',
                            }}
                          >
                            {tool.icon} {tool.label}
                          </button>
                        ))}
                      </div>
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

          {/* KAN-288: Marketplace skill details */}
          {activeTab === 'marketplace' && selectedCatalogSkill && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCatalogSkill.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedCatalogSkill.name}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">{selectedCatalogSkill.description}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {installedIds.includes(selectedCatalogSkill.catalog_id) ? (
                    <span className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                      ✓ Installed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleInstall(selectedCatalogSkill.catalog_id)}
                      disabled={installing === selectedCatalogSkill.catalog_id}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                      }}
                    >
                      {installing === selectedCatalogSkill.catalog_id ? 'Installing...' : '+ Install Skill'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <span>Author: <span className="text-slate-400">{selectedCatalogSkill.author}</span></span>
                <span>Category: <span className="text-slate-400">{selectedCatalogSkill.category}</span></span>
                <span>Scope: <span className="text-slate-400">{selectedCatalogSkill.scope}</span></span>
                <span>Execution: <span className="text-slate-400">{selectedCatalogSkill.execution_mode.replace('_', ' ')}</span></span>
              </div>

              {selectedCatalogSkill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCatalogSkill.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(168,85,247,0.15)', color: '#c4b5fd', border: '1px solid rgba(168,85,247,0.25)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {selectedCatalogSkill.allowed_tools && selectedCatalogSkill.allowed_tools.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Tool Permissions Required</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedCatalogSkill.allowed_tools.map(tool => {
                      const opt = TOOL_OPTIONS.find(t => t.value === tool)
                      return (
                        <span
                          key={tool}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}
                        >
                          {opt?.icon || '🔧'} {opt?.label || tool}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-700/50 pt-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Prompt Template (Preview)</p>
                <div
                  className="rounded-lg p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid #334155' }}
                >
                  {selectedCatalogSkill.prompt_template}
                </div>
              </div>
            </div>
          )}

          {/* KAN-291: Skill Activity / Execution Logs */}
          {activeTab === 'activity' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Skill Activity</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debugMode}
                      onChange={e => setDebugMode(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">Debug Mode</span>
                  </label>
                  {executionHistory.length > 0 && (
                    <button
                      onClick={async () => {
                        await electronAPI?.skills?.clearExecutionHistory?.()
                        setExecutionHistory([])
                      }}
                      className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                    >
                      Clear History
                    </button>
                  )}
                </div>
              </div>

              {executionHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-2">⚡</p>
                  <p className="text-xs text-slate-500 italic">No skill executions recorded yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Send a message to see which skills run.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...executionHistory].reverse().map(record => (
                    <div
                      key={record.id}
                      className="rounded-xl overflow-hidden"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #1e293b' }}
                    >
                      {/* Session header */}
                      <div className="px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: '1px solid #1e293b' }}>
                        <span className="text-[10px] text-slate-500">{new Date(record.timestamp).toLocaleString()}</span>
                        <span className="text-[10px] font-medium text-blue-400">{record.totalApplied}/{record.totalEvaluated} applied</span>
                        {debugMode && (
                          <>
                            <span className="text-[10px] text-slate-600">{record.processingTimeMs}ms</span>
                            {record.conflictCount > 0 && (
                              <span className="text-[10px] text-amber-400">{record.conflictCount} conflict(s)</span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Skill entries */}
                      <div className="px-4 py-2 space-y-1">
                        {record.entries
                          .filter(e => debugMode || e.applied)
                          .map((entry, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.applied ? 'bg-emerald-400' : 'bg-slate-600'}`}
                              />
                              <span className={`font-medium ${entry.applied ? 'text-white' : 'text-slate-500'}`}>
                                {entry.skillName}
                              </span>
                              {debugMode && (
                                <>
                                  <span
                                    className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                                    style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b' }}
                                  >
                                    {entry.execution_mode}
                                  </span>
                                  <span className="text-[10px] text-slate-600 truncate">{entry.reason}</span>
                                </>
                              )}
                            </div>
                          ))}
                        {!debugMode && record.entries.filter(e => !e.applied).length > 0 && (
                          <p className="text-[10px] text-slate-600 pt-0.5">
                            + {record.entries.filter(e => !e.applied).length} skipped (enable debug to see)
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KAN-290: Audit log + permissions panel */}
          {activeTab === 'audit' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stored Permissions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Stored Permissions</h3>
                  <span className="text-[10px] text-slate-500">{permissions.length} entries</span>
                </div>
                {permissions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No stored permissions yet. Permissions are saved when you choose "Always Allow" or "Always Deny".</p>
                ) : (
                  <div className="space-y-1.5">
                    {permissions.map((p, i) => {
                      const skillObj = skills.find(s => s.id === p.skillId)
                      const toolOpt = TOOL_OPTIONS.find(t => t.value === p.tool)
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #1e293b' }}
                        >
                          <span className="text-white font-medium truncate flex-1">{skillObj?.name || p.skillId}</span>
                          <span className="text-slate-400">{toolOpt?.icon || '🔧'} {toolOpt?.label || p.tool}</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                              background: p.level === 'always_allow' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: p.level === 'always_allow' ? '#6ee7b7' : '#fca5a5',
                              border: p.level === 'always_allow' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
                            }}
                          >
                            {p.level === 'always_allow' ? 'Always Allow' : 'Always Deny'}
                          </span>
                          <button
                            onClick={async () => {
                              await electronAPI?.skills?.resetPermission?.(p.skillId, p.tool)
                              const perms = await electronAPI?.skills?.getAllPermissions?.()
                              setPermissions(perms || [])
                            }}
                            className="text-slate-600 hover:text-red-400 transition-colors text-[10px]"
                            title="Reset to Ask"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Audit Log */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Audit Log</h3>
                  {auditLog.length > 0 && (
                    <button
                      onClick={async () => {
                        await electronAPI?.skills?.clearAuditLog?.()
                        setAuditLog([])
                      }}
                      className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                    >
                      Clear Log
                    </button>
                  )}
                </div>
                {auditLog.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No tool execution history yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {[...auditLog].reverse().map((entry, i) => {
                      const toolOpt = TOOL_OPTIONS.find(t => t.value === entry.tool)
                      const isAllow = entry.decision.includes('allow')
                      const isDeny = entry.decision.includes('deny')
                      return (
                        <div
                          key={i}
                          className="px-3 py-2 rounded-lg text-xs"
                          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #1e293b' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isAllow ? 'bg-emerald-400' : isDeny ? 'bg-red-400' : 'bg-slate-500'}`} />
                            <span className="text-white font-medium truncate">{entry.skillName}</span>
                            <span className="text-slate-500">{toolOpt?.icon || '🔧'} {entry.action}</span>
                            <span className="text-slate-600 ml-auto flex-shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center gap-2 pl-3.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                              style={{
                                background: isAllow ? 'rgba(16,185,129,0.1)' : isDeny ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)',
                                color: isAllow ? '#6ee7b7' : isDeny ? '#fca5a5' : '#94a3b8',
                              }}
                            >
                              {entry.decision.replace(/_/g, ' ')}
                            </span>
                            {entry.success !== undefined && (
                              <span className={entry.success ? 'text-emerald-400' : 'text-red-400'}>{entry.success ? '✓' : '✗'}</span>
                            )}
                            {entry.durationMs !== undefined && (
                              <span className="text-slate-600">{entry.durationMs}ms</span>
                            )}
                            {entry.error && (
                              <span className="text-red-400 truncate" title={entry.error}>{entry.error}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!selectedSkill && !isCreating && !selectedCatalogSkill && activeTab !== 'audit' && activeTab !== 'activity' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                {activeTab === 'marketplace' ? (
                  <>
                    <p className="text-4xl mb-3">🛒</p>
                    <p className="text-slate-400 text-sm font-medium">Browse the Skill Marketplace</p>
                    <p className="text-slate-600 text-xs mt-1">Select a skill to preview and install</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl mb-3">⚡</p>
                    <p className="text-slate-400 text-sm font-medium">Select a skill to view details</p>
                    <p className="text-slate-600 text-xs mt-1">Or create a new one to customize AI behavior</p>
                  </>
                )}
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
