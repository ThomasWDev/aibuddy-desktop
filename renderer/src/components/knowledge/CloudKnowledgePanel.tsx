/**
 * Cloud Knowledge Panel
 * 
 * Main panel for managing the Cloud Knowledge Base.
 * Displays providers, servers, and allows importing documentation.
 */

import React, { useState } from 'react'
import { ProviderCard } from './ProviderCard'
import { ImportDocumentModal } from './ImportDocumentModal'
import { EditProviderModal } from './EditProviderModal'
import { EditServerModal } from './EditServerModal'
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase'
import type { 
  CloudProvider, 
  ServerConfig, 
  CloudProviderType,
} from '../../../../src/knowledge/types'
import { 
  PROVIDER_NAMES, 
  PROVIDER_EMOJIS,
} from '../../../../src/knowledge/types'

interface CloudKnowledgePanelProps {
  isOpen: boolean
  onClose: () => void
  onSshConnect?: (server: ServerConfig) => void
  onQuickAction?: (action: string, provider: CloudProvider) => void
}

export const CloudKnowledgePanel: React.FC<CloudKnowledgePanelProps> = ({
  isOpen,
  onClose,
  onSshConnect,
  onQuickAction,
}) => {
  // Use the knowledge base hook
  const {
    providers,
    stats,
    isLoading,
    error,
    addProvider,
    updateProvider,
    deleteProvider,
    updateServer,
    importDocument,
    openTerminalWithSsh,
    refresh,
  } = useKnowledgeBase()

  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [selectedProviderType, setSelectedProviderType] = useState<CloudProviderType | ''>('')
  
  // Edit modals
  const [editingProvider, setEditingProvider] = useState<CloudProvider | null>(null)
  const [editingServer, setEditingServer] = useState<{ server: ServerConfig; providerId: string } | null>(null)

  // Handle adding a new provider
  const handleAddProvider = async () => {
    if (!selectedProviderType) return

    await addProvider(selectedProviderType)
    setShowAddProvider(false)
    setSelectedProviderType('')
  }

  // Handle editing a provider
  const handleEditProvider = (provider: CloudProvider) => {
    setEditingProvider(provider)
  }

  // Handle saving provider edits
  const handleSaveProvider = async (id: string, updates: Partial<CloudProvider>) => {
    await updateProvider(id, updates)
    setEditingProvider(null)
  }

  // Handle deleting a provider
  const handleDeleteProvider = async (providerId: string) => {
    if (confirm('Are you sure you want to delete this provider?')) {
      await deleteProvider(providerId)
    }
  }

  // Handle testing connection
  const handleTestConnection = async (provider: CloudProvider) => {
    console.log('Testing connection for:', provider.name)
    // TODO: Implement connection testing
    alert(`Connection test for ${provider.name} - Feature coming soon!`)
  }

  // Handle SSH connection
  const handleSshConnect = async (server: ServerConfig) => {
    if (onSshConnect) {
      onSshConnect(server)
    } else if (server.sshCommand) {
      // Try to open in terminal
      const opened = await openTerminalWithSsh(server.sshCommand)
      if (!opened) {
        // Fallback to clipboard
        navigator.clipboard.writeText(server.sshCommand)
        alert(`SSH command copied to clipboard:\n${server.sshCommand}`)
      }
    }
  }

  // Handle viewing provider details (opens edit modal)
  const handleViewDetails = (provider: CloudProvider) => {
    setEditingProvider(provider)
  }

  // Handle document import
  const handleImport = async (filename: string, content: string, providerId: string) => {
    await importDocument(providerId, filename, content)
    await refresh()
  }

  // Handle saving server edits
  const handleSaveServer = async (providerId: string, serverId: string, updates: Partial<ServerConfig>) => {
    await updateServer(providerId, serverId, updates)
    setEditingServer(null)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>📚</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' }}>
              Cloud Knowledge Base
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#888' }}>
              Store your infrastructure docs locally • Never forget again
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Stats Bar */}
      <div
        style={{
          padding: '16px 24px',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>☁️</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{stats.providers}</span>
          <span style={{ color: '#888' }}>Providers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🖥️</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{stats.servers}</span>
          <span style={{ color: '#888' }}>Servers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🔐</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{stats.credentials}</span>
          <span style={{ color: '#888' }}>Credentials</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>📄</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{stats.docs}</span>
          <span style={{ color: '#888' }}>Documents</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* Import Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(190, 24, 93, 0.1) 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(236, 72, 153, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#fff' }}>
                📄 Import Documentation
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>
                Drop your doc file here or click to browse • Supports: .md, .txt, .json, .yaml
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowImportModal(true)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📁 Browse Files
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📋 Paste Text
              </button>
            </div>
          </div>
        </div>

        {/* Add Provider Section */}
        {showAddProvider ? (
          <div
            style={{
              background: 'linear-gradient(135deg, #2a2a3e 0%, #1e1e2e 100%)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              ➕ Add New Provider
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {(Object.keys(PROVIDER_NAMES) as CloudProviderType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedProviderType(type)}
                  style={{
                    padding: '12px 16px',
                    background: selectedProviderType === type 
                      ? 'rgba(236, 72, 153, 0.2)' 
                      : 'rgba(255,255,255,0.1)',
                    border: selectedProviderType === type 
                      ? '2px solid #ec4899' 
                      : '2px solid transparent',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{PROVIDER_EMOJIS[type]}</span>
                  <span>{PROVIDER_NAMES[type]}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleAddProvider}
                disabled={!selectedProviderType}
                style={{
                  padding: '12px 24px',
                  background: selectedProviderType 
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: selectedProviderType ? 'pointer' : 'not-allowed',
                  opacity: selectedProviderType ? 1 : 0.5,
                }}
              >
                ✓ Add Provider
              </button>
              <button
                onClick={() => {
                  setShowAddProvider(false)
                  setSelectedProviderType('')
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddProvider(true)}
            style={{
              width: '100%',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '2px dashed rgba(255,255,255,0.2)',
              borderRadius: '16px',
              color: '#888',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            ➕ Add Cloud Provider
          </button>
        )}

        {/* Connected Providers */}
        <div>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#fff' }}>
            Connected Providers
          </h2>
          
          {providers.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '16px',
                color: '#888',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>☁️</div>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>No providers configured yet</p>
              <p style={{ fontSize: '14px' }}>
                Import your infrastructure documentation or add a provider manually
              </p>
            </div>
          ) : (
            providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onEdit={handleEditProvider}
                onDelete={handleDeleteProvider}
                onTestConnection={handleTestConnection}
                onSshConnect={handleSshConnect}
                onViewDetails={handleViewDetails}
              />
            ))
          )}
        </div>

        {/* Quick Actions */}
        {providers.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              ⚡ Quick Actions
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                🔍 Check Server Logs
              </button>
              <button
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                💰 Analyze AWS Costs
              </button>
              <button
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                🚀 Deploy to Server
              </button>
              <button
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📊 View Sentry Errors
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <ImportDocumentModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        providers={providers.map(p => ({ id: p.id, name: p.name, emoji: p.emoji, type: p.type }))}
      />

      {/* Edit Provider Modal */}
      <EditProviderModal
        isOpen={!!editingProvider}
        provider={editingProvider}
        onClose={() => setEditingProvider(null)}
        onSave={handleSaveProvider}
      />

      {/* Edit Server Modal */}
      <EditServerModal
        isOpen={!!editingServer}
        server={editingServer?.server || null}
        providerId={editingServer?.providerId || null}
        onClose={() => setEditingServer(null)}
        onSave={handleSaveServer}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
          }}
        >
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p>Loading knowledge base...</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '16px 24px',
            background: 'rgba(239, 68, 68, 0.9)',
            borderRadius: '12px',
            color: '#fff',
            maxWidth: '400px',
            zIndex: 1003,
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  )
}

export default CloudKnowledgePanel

