import React, { useState, useEffect } from 'react'
import { FolderOpen, MessageSquare, CreditCard, Rocket, Star, Sparkles, Code, Zap, Key, Settings, X, Check, HelpCircle, Info } from 'lucide-react'
import { trackButtonClick, trackError, addBreadcrumb } from '../../lib/sentry'

// Tooltip component for better UX
interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false)
  
  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' },
  }
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          ...positionStyles[position],
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#ffffff',
          padding: '10px 14px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          border: '2px solid rgba(255,255,255,0.15)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {text}
          <div style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            background: '#1a1a2e',
            transform: 'rotate(45deg)',
            ...(position === 'top' ? { bottom: '-5px', left: '50%', marginLeft: '-5px' } : {}),
            ...(position === 'bottom' ? { top: '-5px', left: '50%', marginLeft: '-5px' } : {}),
          }} />
        </div>
      )}
    </div>
  )
}

interface WelcomeScreenProps {
  onOpenFolder: (path: string) => void
  onNewChat?: () => void
}

export function WelcomeScreen({ onOpenFolder, onNewChat }: WelcomeScreenProps) {
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([])
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null)
  const [hoverButton, setHoverButton] = useState<string | null>(null)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    addBreadcrumb('WelcomeScreen mounted', 'navigation')
    
    // Check for electronAPI with retry (preload might not be ready immediately)
    const checkAPI = () => {
      const electronAPI = (window as any).electronAPI
      const isAvailable = !!electronAPI?.dialog?.openFolder
      console.log('[WelcomeScreen] electronAPI check:', { 
        exists: !!electronAPI, 
        dialogAvailable: !!electronAPI?.dialog,
        openFolderAvailable: !!electronAPI?.dialog?.openFolder 
      })
      return { isAvailable, electronAPI }
    }
    
    const { isAvailable, electronAPI } = checkAPI()
    setApiAvailable(isAvailable)
    
    // If not available, retry a few times (preload might be loading)
    if (!isAvailable) {
      let retries = 0
      const maxRetries = 10
      const retryInterval = setInterval(() => {
        retries++
        const { isAvailable: nowAvailable, electronAPI: api } = checkAPI()
        if (nowAvailable) {
          setApiAvailable(true)
          clearInterval(retryInterval)
          // Load data now that API is available
          loadAppData(api)
        } else if (retries >= maxRetries) {
          console.warn('[WelcomeScreen] electronAPI not available after retries')
          clearInterval(retryInterval)
        }
      }, 200)
      return () => clearInterval(retryInterval)
    }
    
    // Load app data if API is available
    const loadAppData = (api: any) => {
      // Get recent workspaces
      api.store?.get('recentWorkspaces').then((recent: string[] | undefined) => {
        console.log('[WelcomeScreen] Recent workspaces:', recent)
        if (recent) {
          setRecentWorkspaces(recent)
        }
      }).catch((err: Error) => {
        console.error('[WelcomeScreen] Failed to get recent workspaces:', err)
      })
      
      // Get app version
      api.app?.getVersion?.().then((version: string) => {
        console.log('[WelcomeScreen] App version:', version)
        setAppVersion(version)
      }).catch(() => {})
    }
    
    if (electronAPI) {
      loadAppData(electronAPI)
      // Check if API key exists
      electronAPI.store?.get('apiKey').then((key: string | undefined) => {
        setHasApiKey(!!key && key.length > 0)
      }).catch(() => {})
    }
  }, [])

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    
    trackButtonClick('Save API Key', 'WelcomeScreen')
    addBreadcrumb('Saving API key from welcome screen', 'user')
    
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.store?.set) {
        await electronAPI.store.set('apiKey', apiKeyInput.trim())
        setApiKeySaved(true)
        setHasApiKey(true)
        setTimeout(() => {
          setShowApiKeyModal(false)
          setApiKeySaved(false)
          setApiKeyInput('')
        }, 1500)
      }
    } catch (error) {
      console.error('[WelcomeScreen] Failed to save API key:', error)
      trackError(error as Error, { context: 'saveApiKey' })
      alert('Failed to save API key. Please try again.')
    }
  }

  const handleOpenSettings = () => {
    trackButtonClick('Open Settings', 'WelcomeScreen')
    setShowApiKeyModal(true)
  }

  const handleOpenFolder = async () => {
    console.log('[WelcomeScreen] handleOpenFolder clicked')
    trackButtonClick('Open Folder', 'WelcomeScreen')
    addBreadcrumb('Open Folder button clicked', 'user')
    
    setIsLoading('folder')
    
    try {
      const electronAPI = (window as any).electronAPI
      
      if (!electronAPI?.dialog?.openFolder) {
        console.error('[WelcomeScreen] electronAPI.dialog.openFolder not available')
        trackError(new Error('electronAPI not available'), { context: 'handleOpenFolder' })
        alert('🤖 Oops! The app needs to restart. Please close and reopen AIBuddy!')
        return
      }
      
      console.log('[WelcomeScreen] Calling dialog.openFolder...')
      const path = await electronAPI.dialog.openFolder()
      console.log('[WelcomeScreen] Selected path:', path)
      
      if (path) {
        addBreadcrumb(`Folder selected: ${path}`, 'user')
        
        // Save to recent workspaces
        const recent = recentWorkspaces.filter(p => p !== path)
        const updated = [path, ...recent].slice(0, 10)
        try {
          await electronAPI.store?.set('recentWorkspaces', updated)
        } catch (e) {
          console.warn('Failed to save recent workspaces:', e)
        }
        
        onOpenFolder(path)
      }
    } catch (error) {
      console.error('[WelcomeScreen] Error opening folder:', error)
      trackError(error as Error, { context: 'handleOpenFolder' })
      alert(`🤖 Something went wrong: ${(error as Error).message}`)
    } finally {
      setIsLoading(null)
    }
  }

  const handleNewChat = async () => {
    console.log('[WelcomeScreen] handleNewChat clicked')
    trackButtonClick('New Chat', 'WelcomeScreen')
    addBreadcrumb('New Chat button clicked', 'user')
    
    if (onNewChat) {
      onNewChat()
    } else {
      alert('🤖 First, open a folder with your code project!')
    }
  }

  const handleOpenRecent = async (path: string) => {
    console.log('[WelcomeScreen] handleOpenRecent clicked:', path)
    trackButtonClick('Open Recent', 'WelcomeScreen', { path })
    setIsLoading(path)
    
    try {
      onOpenFolder(path)
    } catch (error) {
      console.error('[WelcomeScreen] Error opening recent:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleBuyCredits = async () => {
    console.log('[WelcomeScreen] handleBuyCredits clicked')
    trackButtonClick('Buy Credits', 'WelcomeScreen')
    
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.shell?.openExternal) {
        await electronAPI.shell.openExternal('https://aibuddy.life/pricing')
      } else {
        window.open('https://aibuddy.life/pricing', '_blank')
      }
    } catch (error) {
      window.open('https://aibuddy.life/pricing', '_blank')
    }
  }

  // Fun, colorful styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: '"Comic Neue", "Nunito", "Segoe UI", system-ui, sans-serif',
      color: '#ffffff',
      overflow: 'auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderBottom: '2px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.2)',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    logoIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(255,107,107,0.4)',
    },
    logoText: {
      fontSize: '24px',
      fontWeight: 800,
      background: 'linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    buyButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      borderRadius: '50px',
      background: 'linear-gradient(135deg, #feca57, #ff9f43)',
      color: '#1a1a2e',
      fontWeight: 700,
      fontSize: '14px',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 15px rgba(254,202,87,0.4)',
      transition: 'all 0.3s ease',
      transform: hoverButton === 'buy' ? 'scale(1.05)' : 'scale(1)',
    },
    main: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      minHeight: 'calc(100vh - 150px)',
    },
    mascot: {
      width: '140px',
      height: '140px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '24px',
      boxShadow: '0 8px 40px rgba(255,107,107,0.5)',
      animation: 'bounce 2s infinite',
    },
    title: {
      fontSize: '48px',
      fontWeight: 900,
      textAlign: 'center' as const,
      marginBottom: '12px',
      background: 'linear-gradient(90deg, #ffffff, #48dbfb)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      fontSize: '20px',
      color: '#a0aec0',
      textAlign: 'center' as const,
      marginBottom: '48px',
      maxWidth: '500px',
    },
    buttonGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px',
      maxWidth: '600px',
      width: '100%',
      marginBottom: '40px',
    },
    actionButton: (color: string, isHovered: boolean, isDisabled: boolean) => ({
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      borderRadius: '24px',
      background: isHovered 
        ? `linear-gradient(135deg, ${color}, ${color}dd)` 
        : 'rgba(255,255,255,0.08)',
      border: `3px solid ${isHovered ? color : 'rgba(255,255,255,0.15)'}`,
      cursor: isDisabled ? 'wait' : 'pointer',
      transition: 'all 0.3s ease',
      transform: isHovered && !isDisabled ? 'translateY(-4px) scale(1.02)' : 'translateY(0)',
      boxShadow: isHovered ? `0 12px 30px ${color}40` : '0 4px 15px rgba(0,0,0,0.2)',
      opacity: isDisabled ? 0.7 : 1,
    }),
    buttonIcon: (color: string) => ({
      width: '64px',
      height: '64px',
      borderRadius: '20px',
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
      boxShadow: `0 4px 20px ${color}50`,
    }),
    buttonTitle: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#ffffff',
      marginBottom: '8px',
    },
    buttonDesc: {
      fontSize: '14px',
      color: '#a0aec0',
      textAlign: 'center' as const,
    },
    recentSection: {
      width: '100%',
      maxWidth: '600px',
      marginBottom: '32px',
    },
    recentTitle: {
      fontSize: '14px',
      fontWeight: 700,
      color: '#feca57',
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    recentItem: (isHovered: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px',
      borderRadius: '16px',
      background: isHovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
      border: '2px solid rgba(255,255,255,0.1)',
      cursor: 'pointer',
      marginBottom: '8px',
      transition: 'all 0.2s ease',
      transform: isHovered ? 'translateX(8px)' : 'translateX(0)',
    }),
    recentIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #48dbfb, #0abde3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    features: {
      display: 'flex',
      gap: '32px',
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
      marginBottom: '24px',
    },
    feature: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: '#a0aec0',
    },
    footer: {
      textAlign: 'center' as const,
      padding: '16px',
      color: '#4a5568',
      fontSize: '12px',
    },
    statusBadge: (available: boolean) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '20px',
      background: available ? 'rgba(72, 219, 251, 0.2)' : 'rgba(255, 107, 107, 0.2)',
      color: available ? '#48dbfb' : '#ff6b6b',
      fontSize: '12px',
      fontWeight: 600,
    }),
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Rocket size={28} color="#1a1a2e" />
          </div>
          <span style={styles.logoText}>AIBuddy</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {apiAvailable !== null && (
            <span style={styles.statusBadge(apiAvailable)}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: apiAvailable ? '#48dbfb' : '#ff6b6b' 
              }} />
              {apiAvailable ? '✓ Ready' : 'Loading...'}
            </span>
          )}
          
          {/* API Key Status */}
          <span style={{
            ...styles.statusBadge(hasApiKey),
            background: hasApiKey ? 'rgba(72, 219, 251, 0.2)' : 'rgba(255, 193, 7, 0.2)',
            color: hasApiKey ? '#48dbfb' : '#ffc107',
          }}>
            <Key size={14} />
            {hasApiKey ? 'API Key Set' : 'No API Key'}
          </span>
          
          {/* Settings Button */}
          <Tooltip text="⚙️ Settings - Add your API key here!" position="bottom">
            <button
              onClick={handleOpenSettings}
              onMouseEnter={() => setHoverButton('settings')}
              onMouseLeave={() => setHoverButton(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '50px',
                background: hoverButton === 'settings' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                border: '2px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </Tooltip>
          
          <Tooltip text="💳 Buy AIBuddy credits to chat with AI!" position="bottom">
            <button
              onClick={handleBuyCredits}
              onMouseEnter={() => setHoverButton('buy')}
              onMouseLeave={() => setHoverButton(null)}
              style={styles.buyButton}
            >
              <CreditCard size={18} />
              Get Credits
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Mascot */}
        <div style={styles.mascot}>
          <Sparkles size={70} color="#ffffff" />
        </div>

        {/* Title */}
        <h1 style={styles.title}>
          Hey there, Coder! 👋
        </h1>
        <p style={styles.subtitle}>
          I'm your AI coding buddy! Let's build something awesome together! 🚀
        </p>

        {/* API Key Warning Banner */}
        {!hasApiKey && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,193,7,0.2), rgba(255,152,0,0.2))',
            border: '2px solid rgba(255,193,7,0.4)',
            borderRadius: '16px',
            padding: '16px 24px',
            marginBottom: '24px',
            maxWidth: '600px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ffc107, #ff9800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Key size={24} color="#1a1a2e" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#ffc107', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                🔑 API Key Required
              </p>
              <p style={{ color: '#a0aec0', fontSize: '14px' }}>
                Add your AIBuddy API key to start chatting with AI
              </p>
            </div>
            <button
              onClick={handleOpenSettings}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ffc107, #ff9800)',
                color: '#1a1a2e',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Add Key
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.buttonGrid}>
          <button
            onClick={handleOpenFolder}
            disabled={isLoading === 'folder'}
            onMouseEnter={() => setHoverButton('folder')}
            onMouseLeave={() => setHoverButton(null)}
            style={styles.actionButton('#48dbfb', hoverButton === 'folder', isLoading === 'folder')}
          >
            <div style={styles.buttonIcon('#48dbfb')}>
              {isLoading === 'folder' ? (
                <div className="spin">
                  <Star size={32} color="#ffffff" />
                </div>
              ) : (
                <FolderOpen size={32} color="#ffffff" />
              )}
            </div>
            <span style={styles.buttonTitle}>
              {isLoading === 'folder' ? 'Opening...' : 'Open Project'}
            </span>
            <span style={styles.buttonDesc}>
              Pick a folder with your code
            </span>
          </button>

          <button
            onClick={handleNewChat}
            onMouseEnter={() => setHoverButton('chat')}
            onMouseLeave={() => setHoverButton(null)}
            style={styles.actionButton('#ff6b6b', hoverButton === 'chat', false)}
          >
            <div style={styles.buttonIcon('#ff6b6b')}>
              <MessageSquare size={32} color="#ffffff" />
            </div>
            <span style={styles.buttonTitle}>Start Chatting</span>
            <span style={styles.buttonDesc}>
              Ask me anything about code!
            </span>
          </button>
        </div>

        {/* Recent Projects */}
        {recentWorkspaces.length > 0 && (
          <div style={styles.recentSection}>
            <h2 style={styles.recentTitle}>
              <Star size={16} color="#feca57" />
              Recent Projects
            </h2>
            {recentWorkspaces.slice(0, 3).map((path, index) => (
              <div
                key={path}
                onClick={() => handleOpenRecent(path)}
                onMouseEnter={() => setHoverButton(`recent-${index}`)}
                onMouseLeave={() => setHoverButton(null)}
                style={styles.recentItem(hoverButton === `recent-${index}`)}
              >
                <div style={styles.recentIcon}>
                  <Code size={22} color="#ffffff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: '#ffffff' }}>
                    {path.split('/').pop() || path}
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {path}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Features */}
        <div style={styles.features}>
          <div style={styles.feature}>
            <Zap size={18} color="#feca57" />
            <span>Powered by AIBuddy</span>
          </div>
          <div style={styles.feature}>
            <Sparkles size={18} color="#48dbfb" />
            <span>Smart Code Helper</span>
          </div>
          <div style={styles.feature}>
            <Rocket size={18} color="#ff6b6b" />
            <span>Super Fast</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        AIBuddy Desktop v{appVersion} • Made with 💖 for young coders
      </footer>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Key size={28} color="#feca57" />
                Add Your API Key
              </h2>
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#a0aec0', marginBottom: '20px', fontSize: '16px', lineHeight: '1.6' }}>
              Enter your AIBuddy API key to start chatting with AI. Don't have one? 
              <a 
                href="https://aibuddy.life/pricing" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#48dbfb', marginLeft: '4px', textDecoration: 'underline' }}
                onClick={(e) => {
                  e.preventDefault()
                  const electronAPI = (window as any).electronAPI
                  if (electronAPI?.shell?.openExternal) {
                    electronAPI.shell.openExternal('https://aibuddy.life/pricing')
                  } else {
                    window.open('https://aibuddy.life/pricing', '_blank')
                  }
                }}
              >
                Get one here! 🚀
              </a>
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#feca57', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="aibuddy_xxxxxxxxxxxxxxxx..."
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#ffffff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                }}
                onFocus={(e) => e.target.style.borderColor = '#48dbfb'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
              />
            </div>

            <button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim() || apiKeySaved}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: apiKeySaved 
                  ? 'linear-gradient(135deg, #10b981, #059669)' 
                  : 'linear-gradient(135deg, #48dbfb, #0abde3)',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 700,
                cursor: apiKeyInput.trim() && !apiKeySaved ? 'pointer' : 'not-allowed',
                opacity: apiKeyInput.trim() || apiKeySaved ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
              }}
            >
              {apiKeySaved ? (
                <>
                  <Check size={22} />
                  Saved! ✨
                </>
              ) : (
                <>
                  <Key size={22} />
                  Save API Key
                </>
              )}
            </button>

            <p style={{ color: '#718096', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
              🔒 Your API key is stored securely on your device
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
