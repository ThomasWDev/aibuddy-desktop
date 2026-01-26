/**
 * Import Document Modal
 * 
 * Modal for importing infrastructure documentation files.
 * Parses markdown/text files and extracts server configs, API keys, etc.
 * 
 * Features:
 * - Browse files from file system
 * - Paste text directly
 * - Paste file paths (multiple) to read from disk
 * - Auto-detect credentials, servers, domains, API keys
 * - Save to local encrypted storage (shared across apps)
 */

import React, { useState, useCallback } from 'react'
import type { ExtractedData, CloudProviderType } from '../../../../src/knowledge/types'

// Extended extracted data with credential detection
interface ExtendedExtractedData extends ExtractedData {
  credentials: {
    type: 'api_key' | 'password' | 'token' | 'secret'
    name: string
    value: string
    service: string
    masked: string
  }[]
  filePaths: string[]
  fileContents: { path: string; content: string; error?: string }[]
}

interface ImportDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (filename: string, content: string, providerId: string) => Promise<void>
  providers: { id: string; name: string; emoji: string; type: CloudProviderType }[]
}

type ImportMode = 'browse' | 'paste' | 'paths'

export const ImportDocumentModal: React.FC<ImportDocumentModalProps> = ({
  isOpen,
  onClose,
  onImport,
  providers,
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [extractedData, setExtractedData] = useState<ExtendedExtractedData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importMode, setImportMode] = useState<ImportMode>('browse')
  const [pastedText, setPastedText] = useState('')
  const [pathsText, setPathsText] = useState('')
  const [loadedFiles, setLoadedFiles] = useState<{ path: string; content: string; error?: string }[]>([])

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  // Process file
  const handleFile = async (file: File) => {
    setSelectedFile(file)
    const content = await file.text()
    setFileContent(content)
    parseContent(content)
  }

  // Handle pasted text
  const handlePastedText = () => {
    if (pastedText.trim()) {
      setFileContent(pastedText)
      setSelectedFile(null)
      parseContent(pastedText)
    }
  }

  // Handle file paths - read multiple files from disk
  const handleFilePaths = async () => {
    if (!pathsText.trim()) return
    
    setIsProcessing(true)
    const paths = pathsText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('#')) // Filter empty lines and comments
    
    const results: { path: string; content: string; error?: string }[] = []
    let combinedContent = ''
    
    for (const filePath of paths) {
      try {
        // Use Electron API to read file
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.kb?.readFilePath) {
          const content = await electronAPI.kb.readFilePath(filePath)
          results.push({ path: filePath, content })
          combinedContent += `\n\n# === ${filePath} ===\n\n${content}`
        } else {
          results.push({ path: filePath, content: '', error: 'API not available' })
        }
      } catch (err) {
        results.push({ path: filePath, content: '', error: (err as Error).message })
      }
    }
    
    setLoadedFiles(results)
    setFileContent(combinedContent)
    parseContent(combinedContent, paths)
    setIsProcessing(false)
  }

  // Mask sensitive values for display
  const maskValue = (value: string): string => {
    if (value.length <= 8) return '****'
    return value.slice(0, 4) + '****' + value.slice(-4)
  }

  // Detect credential type from key name
  const detectCredentialType = (key: string): 'api_key' | 'password' | 'token' | 'secret' => {
    const keyLower = key.toLowerCase()
    if (keyLower.includes('password') || keyLower.includes('pwd')) return 'password'
    if (keyLower.includes('token')) return 'token'
    if (keyLower.includes('secret')) return 'secret'
    return 'api_key'
  }

  // Detect service from context
  const detectService = (key: string, context: string): string => {
    const combined = (key + ' ' + context).toLowerCase()
    if (combined.includes('sendgrid')) return 'SendGrid'
    if (combined.includes('stripe')) return 'Stripe'
    if (combined.includes('aws') || combined.includes('amazon')) return 'AWS'
    if (combined.includes('anthropic') || combined.includes('claude')) return 'Anthropic'
    if (combined.includes('openai') || combined.includes('gpt')) return 'OpenAI'
    if (combined.includes('deepseek')) return 'DeepSeek'
    if (combined.includes('github')) return 'GitHub'
    if (combined.includes('bitbucket')) return 'Bitbucket'
    if (combined.includes('gitlab')) return 'GitLab'
    if (combined.includes('sentry')) return 'Sentry'
    if (combined.includes('firebase')) return 'Firebase'
    if (combined.includes('twilio')) return 'Twilio'
    if (combined.includes('mailgun')) return 'Mailgun'
    if (combined.includes('cloudflare')) return 'Cloudflare'
    if (combined.includes('digitalocean')) return 'DigitalOcean'
    if (combined.includes('heroku')) return 'Heroku'
    if (combined.includes('vercel')) return 'Vercel'
    if (combined.includes('netlify')) return 'Netlify'
    if (combined.includes('supabase')) return 'Supabase'
    if (combined.includes('mongodb')) return 'MongoDB'
    if (combined.includes('postgres')) return 'PostgreSQL'
    if (combined.includes('mysql')) return 'MySQL'
    if (combined.includes('redis')) return 'Redis'
    return 'Unknown'
  }

  // Parse content for infrastructure info
  const parseContent = (content: string, filePaths: string[] = []) => {
    const extracted: ExtendedExtractedData = {
      servers: [],
      apiKeys: [],
      domains: [],
      accountIds: [],
      keyValuePairs: {},
      credentials: [],
      filePaths,
      fileContents: loadedFiles,
    }

    const lines = content.split('\n')
    let currentSection = ''
    let currentServer: any = {}

    // Regex patterns for credential detection
    const apiKeyPatterns = [
      /(?:api[_-]?key|apikey|api_secret|secret_key|access_key|private_key|auth_key|authorization_key)\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]{20,})['"]?/gi,
      /(?:sk|pk|api|key|token|secret)[_-][a-zA-Z0-9_\-]{20,}/gi,
      /(?:SENDGRID|STRIPE|ANTHROPIC|OPENAI|AWS|GITHUB|SENTRY)[_A-Z]*[_-]?(?:KEY|TOKEN|SECRET)\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
    ]

    for (const line of lines) {
      const trimmed = line.trim()

      // Detect section headers
      if (trimmed.startsWith('##')) {
        if (currentServer.ip) {
          extracted.servers.push({ ...currentServer })
        }
        currentSection = trimmed.replace(/^#+\s*/, '').toLowerCase()
        currentServer = {}

        // Detect provider from section
        if (currentSection.includes('aws')) currentServer.provider = 'aws'
        else if (currentSection.includes('digitalocean')) currentServer.provider = 'digitalocean'
        else if (currentSection.includes('gcp')) currentServer.provider = 'gcp'
        continue
      }

      // Parse key-value pairs
      const kvMatch = trimmed.match(/^-?\s*\*?\*?([^:]+)\*?\*?:\s*(.+)$/)
      if (kvMatch) {
        const [, key, value] = kvMatch
        const keyLower = key.toLowerCase().trim()
        const valueTrimmed = value.trim().replace(/^['"`]|['"`]$/g, '') // Remove quotes

        extracted.keyValuePairs[key.trim()] = valueTrimmed

        // Detect credentials (API keys, tokens, secrets, passwords)
        const isCredential = keyLower.includes('key') || 
                            keyLower.includes('token') || 
                            keyLower.includes('secret') || 
                            keyLower.includes('password') ||
                            keyLower.includes('api') ||
                            keyLower.includes('auth')
        
        // Check if value looks like a credential (long alphanumeric string)
        const looksLikeCredential = /^[a-zA-Z0-9_\-\.]{16,}$/.test(valueTrimmed) ||
                                    valueTrimmed.startsWith('sk-') ||
                                    valueTrimmed.startsWith('pk_') ||
                                    valueTrimmed.startsWith('SG.') ||
                                    valueTrimmed.startsWith('xoxb-') ||
                                    valueTrimmed.startsWith('ghp_') ||
                                    valueTrimmed.startsWith('gho_')

        if (isCredential && looksLikeCredential && valueTrimmed.length >= 16) {
          extracted.credentials.push({
            type: detectCredentialType(keyLower),
            name: key.trim(),
            value: valueTrimmed,
            service: detectService(keyLower, currentSection),
            masked: maskValue(valueTrimmed),
          })
        }

        // Extract specific fields
        if (keyLower.includes('server ip') || keyLower === 'ip') {
          currentServer.ip = valueTrimmed
        } else if (keyLower.includes('ssh user') || keyLower === 'user') {
          currentServer.sshUser = valueTrimmed
        } else if (keyLower.includes('ssh key')) {
          currentServer.sshKeyPath = valueTrimmed
        } else if (keyLower.includes('instance id')) {
          currentServer.instanceId = valueTrimmed
        } else if (keyLower === 'domain') {
          currentServer.domain = valueTrimmed
          extracted.domains.push(valueTrimmed)
        } else if (keyLower.includes('account')) {
          extracted.accountIds.push({ provider: currentSection, id: valueTrimmed })
        } else if (keyLower.includes('api') && keyLower.includes('key')) {
          extracted.apiKeys.push({ name: key.trim(), service: currentSection })
        }

        if (!currentServer.name && currentSection) {
          currentServer.name = currentSection
            .replace(/\(.*\)/, '')
            .trim()
            .split(' ')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
        }
      }

      // Detect IP addresses
      const ipMatch = trimmed.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/)
      if (ipMatch && !currentServer.ip) {
        currentServer.ip = ipMatch[1]
      }

      // Detect domains
      const domainMatch = trimmed.match(/\b([a-z0-9][-a-z0-9]*\.)+[a-z]{2,}\b/gi)
      if (domainMatch) {
        extracted.domains.push(...domainMatch.filter((d: string) => !d.match(/^\d/)))
      }
    }

    if (currentServer.ip) {
      extracted.servers.push({ ...currentServer })
    }

    extracted.domains = [...new Set(extracted.domains)]
    setExtractedData(extracted)
  }

  // Handle import
  const handleImport = async () => {
    if (!fileContent || !selectedProvider) return

    setIsProcessing(true)
    try {
      const filename = selectedFile?.name || 'pasted-content.md'
      await onImport(filename, fileContent, selectedProvider)
      onClose()
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Reset state
  const handleClose = () => {
    setSelectedFile(null)
    setFileContent('')
    setExtractedData(null)
    setSelectedProvider('')
    setImportMode('browse')
    setPastedText('')
    setPathsText('')
    setLoadedFiles([])
    onClose()
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
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
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
            📄 Import Documentation
          </h2>
          <button
            onClick={handleClose}
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

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => setImportMode('browse')}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: importMode === 'browse' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.1)',
              border: importMode === 'browse' ? '2px solid #ec4899' : '2px solid transparent',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📁 Browse Files
          </button>
          <button
            onClick={() => setImportMode('paste')}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: importMode === 'paste' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.1)',
              border: importMode === 'paste' ? '2px solid #ec4899' : '2px solid transparent',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📋 Paste Text
          </button>
          <button
            onClick={() => setImportMode('paths')}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: importMode === 'paths' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.1)',
              border: importMode === 'paths' ? '2px solid #ec4899' : '2px solid transparent',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📂 File Paths
          </button>
        </div>

        {/* File Drop Zone, Paste Area, or Paths Input */}
        {importMode === 'browse' && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? '#ec4899' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              marginBottom: '20px',
              background: dragActive ? 'rgba(236, 72, 153, 0.1)' : 'rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <p style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>
              {selectedFile ? selectedFile.name : 'Drop your doc file here'}
            </p>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>
              Supports: .md, .txt, .json, .yaml
            </p>
            <label
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Browse Files
              <input
                type="file"
                accept=".md,.txt,.json,.yaml,.yml"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
        
        {importMode === 'paste' && (
          <div style={{ marginBottom: '20px' }}>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your infrastructure documentation here..."
              style={{
                width: '100%',
                height: '200px',
                padding: '16px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
            <button
              onClick={handlePastedText}
              style={{
                marginTop: '12px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Parse Content
            </button>
          </div>
        )}
        
        {importMode === 'paths' && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>
              Paste file paths (one per line). The tool will read all files and extract credentials, servers, and other infrastructure info.
            </p>
            <textarea
              value={pathsText}
              onChange={(e) => setPathsText(e.target.value)}
              placeholder={`/Users/you/Documents/API_KEYS.md
/Users/you/project/docs/SERVERS.md
/Users/you/project/.env
# Lines starting with # are ignored`}
              style={{
                width: '100%',
                height: '180px',
                padding: '16px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'vertical',
                lineHeight: '1.6',
              }}
            />
            <button
              onClick={handleFilePaths}
              disabled={isProcessing || !pathsText.trim()}
              style={{
                marginTop: '12px',
                padding: '12px 24px',
                background: pathsText.trim() 
                  ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: pathsText.trim() ? 'pointer' : 'not-allowed',
                opacity: pathsText.trim() ? 1 : 0.5,
              }}
            >
              {isProcessing ? '⏳ Reading Files...' : '📖 Read & Parse Files'}
            </button>
            
            {/* Show loaded files status */}
            {loadedFiles.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>
                  📁 Files Loaded ({loadedFiles.filter(f => !f.error).length}/{loadedFiles.length})
                </h4>
                {loadedFiles.map((file, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      background: file.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      fontSize: '12px',
                      color: file.error ? '#ef4444' : '#22c55e',
                      fontFamily: 'monospace',
                    }}
                  >
                    {file.error ? '❌' : '✅'} {file.path.split('/').pop()}
                    {file.error && <span style={{ marginLeft: '8px', color: '#888' }}>({file.error})</span>}
                    {!file.error && <span style={{ marginLeft: '8px', color: '#888' }}>({file.content.length} chars)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Extracted Data Preview */}
        {extractedData && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '12px' }}>
              🔍 AIBuddy detected the following:
            </h3>

            {/* Credentials - Most Important */}
            {extractedData.credentials && extractedData.credentials.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#f59e0b', fontSize: '14px', marginBottom: '8px' }}>
                  🔐 Credentials ({extractedData.credentials.length}) - Will be encrypted
                </h4>
                {extractedData.credentials.map((cred, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      fontSize: '13px',
                      color: '#fff',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{cred.name}</strong>
                        <span style={{ 
                          marginLeft: '8px', 
                          padding: '2px 8px', 
                          background: 'rgba(139, 92, 246, 0.2)', 
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#8b5cf6',
                        }}>
                          {cred.service}
                        </span>
                      </div>
                      <span style={{ 
                        padding: '2px 8px', 
                        background: 'rgba(245, 158, 11, 0.2)', 
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#f59e0b',
                      }}>
                        {cred.type}
                      </span>
                    </div>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px', fontFamily: 'monospace' }}>
                      {cred.masked}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {extractedData.servers.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#22c55e', fontSize: '14px', marginBottom: '8px' }}>
                  🖥️ Servers ({extractedData.servers.length})
                </h4>
                {extractedData.servers.map((server, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      fontSize: '13px',
                      color: '#fff',
                    }}
                  >
                    <div><strong>{server.name || 'Unknown Server'}</strong></div>
                    <div style={{ color: '#888' }}>IP: {server.ip}</div>
                    {server.sshUser && <div style={{ color: '#888' }}>User: {server.sshUser}</div>}
                  </div>
                ))}
              </div>
            )}

            {extractedData.accountIds.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#3b82f6', fontSize: '14px', marginBottom: '8px' }}>
                  🏢 Account IDs ({extractedData.accountIds.length})
                </h4>
                {extractedData.accountIds.map((acc, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      fontSize: '13px',
                      color: '#fff',
                    }}
                  >
                    {acc.provider}: {acc.id}
                  </div>
                ))}
              </div>
            )}

            {extractedData.apiKeys.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#f59e0b', fontSize: '14px', marginBottom: '8px' }}>
                  🔑 API Keys Referenced ({extractedData.apiKeys.length})
                </h4>
                {extractedData.apiKeys.map((key, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      fontSize: '13px',
                      color: '#fff',
                    }}
                  >
                    {key.name} ({key.service})
                  </div>
                ))}
              </div>
            )}

            {extractedData.domains.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#8b5cf6', fontSize: '14px', marginBottom: '8px' }}>
                  🌐 Domains ({extractedData.domains.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {extractedData.domains.slice(0, 20).map((domain, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 12px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: '#8b5cf6',
                      }}
                    >
                      {domain}
                    </span>
                  ))}
                  {extractedData.domains.length > 20 && (
                    <span style={{ padding: '4px 12px', fontSize: '12px', color: '#888' }}>
                      +{extractedData.domains.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Provider Selection */}
        {extractedData && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              Select Provider to Import To:
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
              }}
            >
              <option value="">-- Select Provider --</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
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
            onClick={handleImport}
            disabled={!extractedData || !selectedProvider || isProcessing}
            style={{
              padding: '12px 24px',
              background: extractedData && selectedProvider
                ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
                : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: extractedData && selectedProvider ? 'pointer' : 'not-allowed',
              opacity: extractedData && selectedProvider ? 1 : 0.5,
            }}
          >
            {isProcessing ? '⏳ Importing...' : '📥 Import Selected Items'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportDocumentModal

