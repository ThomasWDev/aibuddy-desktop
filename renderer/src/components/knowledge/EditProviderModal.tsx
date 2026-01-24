/**
 * Edit Provider Modal
 * 
 * Modal for editing cloud provider details.
 */

import React, { useState, useEffect } from 'react'
import type { CloudProvider } from '../../../../src/knowledge/types'

interface EditProviderModalProps {
  isOpen: boolean
  provider: CloudProvider | null
  onClose: () => void
  onSave: (id: string, updates: Partial<CloudProvider>) => Promise<void>
}

export const EditProviderModal: React.FC<EditProviderModalProps> = ({
  isOpen,
  provider,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [accountId, setAccountId] = useState('')
  const [region, setRegion] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Load provider data when modal opens
  useEffect(() => {
    if (provider) {
      setName(provider.name)
      setAccountId(provider.connection.accountId || '')
      setRegion(provider.connection.region || '')
      setNotes(provider.notes || '')
    }
  }, [provider])

  const handleSave = async () => {
    if (!provider) return

    setIsSaving(true)
    try {
      await onSave(provider.id, {
        name,
        connection: {
          ...provider.connection,
          accountId: accountId || undefined,
          region: region || undefined,
        },
        notes: notes || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Failed to save provider:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !provider) return null

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
          maxWidth: '500px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' }}>
            {provider.emoji} Edit {provider.name}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          {/* Account ID */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Account ID
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="e.g., 123456789012"
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

          {/* Region */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Region
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., us-east-1"
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
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this provider..."
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
            disabled={isSaving || !name.trim()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSaving || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: isSaving || !name.trim() ? 0.5 : 1,
            }}
          >
            {isSaving ? '⏳ Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditProviderModal

