/**
 * Provider Card Component
 * 
 * Displays a cloud provider with its servers and quick actions.
 */

import React from 'react'
import type { CloudProvider, ServerConfig } from '../../../../src/knowledge/types'

interface ProviderCardProps {
  provider: CloudProvider
  onEdit: (provider: CloudProvider) => void
  onDelete: (providerId: string) => void
  onTestConnection: (provider: CloudProvider) => void
  onSshConnect: (server: ServerConfig) => void
  onViewDetails: (provider: CloudProvider) => void
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  onEdit,
  onDelete,
  onTestConnection,
  onSshConnect,
  onViewDetails,
}) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #2a2a3e 0%, #1e1e2e 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>{provider.emoji}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              {provider.name}
            </h3>
            {provider.connection.region && (
              <span style={{ fontSize: '13px', color: '#888' }}>
                Region: {provider.connection.region}
              </span>
            )}
          </div>
        </div>
        
        {/* Connection Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: provider.isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: provider.isConnected ? '#22c55e' : '#ef4444',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: provider.isConnected ? '#22c55e' : '#ef4444' 
          }} />
          {provider.isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>
      
      {/* Account Info */}
      {provider.connection.accountId && (
        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>Account ID: </span>
          <span style={{ fontSize: '13px', color: '#fff', fontFamily: 'monospace' }}>
            {provider.connection.accountId}
          </span>
        </div>
      )}
      
      {/* Servers */}
      {provider.servers.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#888', fontWeight: 500 }}>
            🖥️ Servers ({provider.servers.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {provider.servers.map((server) => (
              <div
                key={server.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>
                    {server.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
                    {server.ip}
                    {server.domain && ` • ${server.domain}`}
                  </div>
                </div>
                <button
                  onClick={() => onSshConnect(server)}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title={server.sshCommand || 'SSH Connect'}
                >
                  🔗 SSH
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      {provider.quickActions.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#888', fontWeight: 500 }}>
            ⚡ Quick Actions
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {provider.quickActions.slice(0, 4).map((action, index) => (
              <button
                key={index}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onTestConnection(provider)}
          style={{
            padding: '10px 16px',
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            color: '#22c55e',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          🔌 Test Connection
        </button>
        <button
          onClick={() => onViewDetails(provider)}
          style={{
            padding: '10px 16px',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            color: '#3b82f6',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          📋 View Details
        </button>
        <button
          onClick={() => onEdit(provider)}
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onDelete(provider.id)}
          style={{
            padding: '10px 16px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}

export default ProviderCard

