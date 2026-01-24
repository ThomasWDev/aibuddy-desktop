/**
 * Knowledge Base React Hook
 * 
 * Provides access to the knowledge base from React components.
 */

import { useState, useEffect, useCallback } from 'react'
import type { 
  CloudProvider, 
  ServerConfig, 
  CloudProviderType,
  KnowledgeBasePreferences 
} from '../../../src/knowledge/types'

interface KnowledgeBaseStats {
  providerCount: number
  serverCount: number
  credentialCount: number
  documentCount: number
}

interface UseKnowledgeBaseReturn {
  // State
  providers: CloudProvider[]
  stats: KnowledgeBaseStats
  isLoading: boolean
  error: string | null
  isUnlocked: boolean
  
  // Provider operations
  addProvider: (type: CloudProviderType, name?: string) => Promise<CloudProvider | null>
  updateProvider: (id: string, updates: Partial<CloudProvider>) => Promise<CloudProvider | null>
  deleteProvider: (id: string) => Promise<boolean>
  
  // Server operations
  addServer: (providerId: string, name: string, ip: string, config?: Partial<ServerConfig>) => Promise<ServerConfig | null>
  updateServer: (providerId: string, serverId: string, updates: Partial<ServerConfig>) => Promise<ServerConfig | null>
  deleteServer: (providerId: string, serverId: string) => Promise<boolean>
  
  // Document import
  importDocument: (providerId: string, filename: string, content: string) => Promise<any>
  openFileDialog: () => Promise<{ filename: string; content: string; filePath: string } | null>
  
  // Encryption
  unlock: (password: string) => Promise<boolean>
  lock: () => Promise<void>
  
  // AI Context
  generateAIContext: () => Promise<string>
  getRelevantContext: (query: string) => Promise<string>
  
  // SSH
  openTerminalWithSsh: (sshCommand: string) => Promise<boolean>
  
  // Refresh
  refresh: () => Promise<void>
}

export function useKnowledgeBase(): UseKnowledgeBaseReturn {
  const [providers, setProviders] = useState<CloudProvider[]>([])
  const [stats, setStats] = useState<KnowledgeBaseStats>({
    providerCount: 0,
    serverCount: 0,
    credentialCount: 0,
    documentCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const electronAPI = (window as any).electronAPI

  // Check if electronAPI is available
  const hasAPI = useCallback(() => {
    if (!electronAPI) {
      console.warn('[useKnowledgeBase] electronAPI not available')
      return false
    }
    return true
  }, [])

  // Load providers and stats
  const refresh = useCallback(async () => {
    if (!hasAPI()) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [providersData, statsData, unlockedStatus] = await Promise.all([
        electronAPI.invoke('kb:getProviders'),
        electronAPI.invoke('kb:getStats'),
        electronAPI.invoke('kb:isUnlocked'),
      ])

      setProviders(providersData || [])
      setStats(statsData || { providerCount: 0, serverCount: 0, credentialCount: 0, documentCount: 0 })
      setIsUnlocked(unlockedStatus || false)
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to load:', err)
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [hasAPI])

  // Load on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  // Provider operations
  const addProvider = useCallback(async (type: CloudProviderType, name?: string): Promise<CloudProvider | null> => {
    if (!hasAPI()) return null

    try {
      const provider = await electronAPI.invoke('kb:addProvider', type, name)
      await refresh()
      return provider
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to add provider:', err)
      setError((err as Error).message)
      return null
    }
  }, [hasAPI, refresh])

  const updateProvider = useCallback(async (id: string, updates: Partial<CloudProvider>): Promise<CloudProvider | null> => {
    if (!hasAPI()) return null

    try {
      const provider = await electronAPI.invoke('kb:updateProvider', id, updates)
      await refresh()
      return provider
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to update provider:', err)
      setError((err as Error).message)
      return null
    }
  }, [hasAPI, refresh])

  const deleteProvider = useCallback(async (id: string): Promise<boolean> => {
    if (!hasAPI()) return false

    try {
      const result = await electronAPI.invoke('kb:deleteProvider', id)
      await refresh()
      return result
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to delete provider:', err)
      setError((err as Error).message)
      return false
    }
  }, [hasAPI, refresh])

  // Server operations
  const addServer = useCallback(async (
    providerId: string, 
    name: string, 
    ip: string, 
    config?: Partial<ServerConfig>
  ): Promise<ServerConfig | null> => {
    if (!hasAPI()) return null

    try {
      const server = await electronAPI.invoke('kb:addServer', providerId, name, ip, config)
      await refresh()
      return server
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to add server:', err)
      setError((err as Error).message)
      return null
    }
  }, [hasAPI, refresh])

  const updateServer = useCallback(async (
    providerId: string, 
    serverId: string, 
    updates: Partial<ServerConfig>
  ): Promise<ServerConfig | null> => {
    if (!hasAPI()) return null

    try {
      const server = await electronAPI.invoke('kb:updateServer', providerId, serverId, updates)
      await refresh()
      return server
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to update server:', err)
      setError((err as Error).message)
      return null
    }
  }, [hasAPI, refresh])

  const deleteServer = useCallback(async (providerId: string, serverId: string): Promise<boolean> => {
    if (!hasAPI()) return false

    try {
      const result = await electronAPI.invoke('kb:deleteServer', providerId, serverId)
      await refresh()
      return result
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to delete server:', err)
      setError((err as Error).message)
      return false
    }
  }, [hasAPI, refresh])

  // Document import
  const importDocument = useCallback(async (
    providerId: string, 
    filename: string, 
    content: string
  ): Promise<any> => {
    if (!hasAPI()) return null

    try {
      const doc = await electronAPI.invoke('kb:importDocument', providerId, filename, content)
      await refresh()
      return doc
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to import document:', err)
      setError((err as Error).message)
      return null
    }
  }, [hasAPI, refresh])

  const openFileDialog = useCallback(async (): Promise<{ filename: string; content: string; filePath: string } | null> => {
    if (!hasAPI()) return null

    try {
      return await electronAPI.invoke('kb:openFileDialog')
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to open file dialog:', err)
      setError((err as Error).message)
      return null
    }
  }, [hasAPI])

  // Encryption
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    if (!hasAPI()) return false

    try {
      const result = await electronAPI.invoke('kb:unlock', password)
      setIsUnlocked(result)
      return result
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to unlock:', err)
      setError((err as Error).message)
      return false
    }
  }, [hasAPI])

  const lock = useCallback(async (): Promise<void> => {
    if (!hasAPI()) return

    try {
      await electronAPI.invoke('kb:lock')
      setIsUnlocked(false)
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to lock:', err)
      setError((err as Error).message)
    }
  }, [hasAPI])

  // AI Context
  const generateAIContext = useCallback(async (): Promise<string> => {
    if (!hasAPI()) return ''

    try {
      return await electronAPI.invoke('kb:generateAIContext')
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to generate AI context:', err)
      return ''
    }
  }, [hasAPI])

  const getRelevantContext = useCallback(async (query: string): Promise<string> => {
    if (!hasAPI()) return ''

    try {
      return await electronAPI.invoke('kb:getRelevantContext', query)
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to get relevant context:', err)
      return ''
    }
  }, [hasAPI])

  // SSH
  const openTerminalWithSsh = useCallback(async (sshCommand: string): Promise<boolean> => {
    if (!hasAPI()) return false

    try {
      return await electronAPI.invoke('kb:openTerminalWithSsh', sshCommand)
    } catch (err) {
      console.error('[useKnowledgeBase] Failed to open terminal:', err)
      setError((err as Error).message)
      return false
    }
  }, [hasAPI])

  return {
    providers,
    stats,
    isLoading,
    error,
    isUnlocked,
    addProvider,
    updateProvider,
    deleteProvider,
    addServer,
    updateServer,
    deleteServer,
    importDocument,
    openFileDialog,
    unlock,
    lock,
    generateAIContext,
    getRelevantContext,
    openTerminalWithSsh,
    refresh,
  }
}

export default useKnowledgeBase

