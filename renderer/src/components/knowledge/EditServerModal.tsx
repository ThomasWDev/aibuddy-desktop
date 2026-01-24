/**
 * Edit Server Modal
 * 
 * Modal for editing server configuration.
 */

import React, { useState, useEffect } from 'react'
import type { ServerConfig } from '../../../../src/knowledge/types'

interface EditServerModalProps {
  isOpen: boolean
  server: ServerConfig | null
  providerId: string | null
  onClose: () => void
  onSave: (providerId: string, serverId: string, updates: Partial<ServerConfig>) => Promise<void>
}

export const EditServerModal: React.FC<EditServerModalProps> = ({
  isOpen,
  server,
  providerId,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [ip, setIp] = useState('')
  const [sshUser, setSshUser] = useState('')
  const [sshPort, setSshPort] = useState('22')
  const [sshKeyPath, setSshKeyPath] = useState('')
  const [domain, setDomain] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [instanceType, setInstanceType] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Load server data when modal opens
  useEffect(() => {
    if (server) {
      setName(server.name)
      setIp(server.ip)
      setSshUser(server.sshUser)
      setSshPort(server.sshPort.toString())
      setSshKeyPath(server.sshKeyPath || '')
      setDomain(server.domain || '')
      setInstanceId(server.instanceId || '')
      setInstanceType(server.instanceType || '')
      setNotes(server.notes || '')
    }
  }, [server])

  const handleSave = async () => {
    if (!server || !providerId) return

    setIsSaving(true)
    try {
      await onSave(providerId, server.id, {
        name,
        ip,
        sshUser,
        sshPort: parseInt(sshPort, 10) || 22,
        sshKeyPath: sshKeyPath || undefined,
        domain: domain || undefined,
        instanceId: instanceId || undefined,
        instanceType: instanceType || undefined,
        notes: notes || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Failed to save server:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !server || !providerId) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #2a2a3e 0%, #1e1e2e 100%)',
          borderRadius: '20px',
          padding: '24px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' }}>
            🖥️ Edit Server
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Name */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Server Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Server"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          {/* IP Address */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              IP Address *
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g., 10.0.0.1"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Domain */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., example.com"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          {/* SSH User */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              SSH User *
            </label>
            <input
              type="text"
              value={sshUser}
              onChange={(e) => setSshUser(e.target.value)}
              placeholder="e.g., ubuntu"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          {/* SSH Port */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              SSH Port
            </label>
            <input
              type="number"
              value={sshPort}
              onChange={(e) => setSshPort(e.target.value)}
              placeholder="22"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          {/* SSH Key Path */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              SSH Key Path
            </label>
            <input
              type="text"
              value={sshKeyPath}
              onChange={(e) => setSshKeyPath(e.target.value)}
              placeholder="e.g., ~/.ssh/my-key.pem"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Instance ID */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Instance ID
            </label>
            <input
              type="text"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              placeholder="e.g., i-0123456789abcdef0"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {/* Instance Type */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Instance Type
            </label>
            <input
              type="text"
              value={instanceType}
              onChange={(e) => setInstanceType(e.target.value)}
              placeholder="e.g., t3.medium"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this server..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* SSH Command Preview */}
        {ip && sshUser && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '8px' }}>
              SSH Command Preview
            </label>
            <code style={{ color: '#22d3ee', fontSize: '13px', fontFamily: 'monospace' }}>
              ssh{sshKeyPath ? ` -i "${sshKeyPath}"` : ''}{sshPort !== '22' ? ` -p ${sshPort}` : ''} {sshUser}@{ip}
            </code>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
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
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !ip.trim() || !sshUser.trim()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSaving || !name.trim() || !ip.trim() || !sshUser.trim() ? 'not-allowed' : 'pointer',
              opacity: isSaving || !name.trim() || !ip.trim() || !sshUser.trim() ? 0.5 : 1,
            }}
          >
            {isSaving ? '⏳ Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditServerModal

