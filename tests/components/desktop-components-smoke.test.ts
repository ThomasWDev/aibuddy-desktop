import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const srcDir = resolve(__dirname, '../../renderer/src')

function read(relativePath: string): string {
  const fullPath = resolve(srcDir, relativePath)
  if (!existsSync(fullPath)) return ''
  return readFileSync(fullPath, 'utf-8')
}

describe('Desktop Components — Smoke Tests', () => {
  describe('Layout Components', () => {
    const sidebarSrc = read('components/layout/Sidebar.tsx')
    const topToolbarSrc = read('components/layout/TopToolbar.tsx')
    const statusBarSrc = read('components/layout/StatusBar.tsx')
    const activityBarSrc = read('components/layout/ActivityBar.tsx')
    const panelSrc = read('components/layout/Panel.tsx')

    it('Sidebar.tsx must exist and export Sidebar', () => {
      expect(sidebarSrc).toBeTruthy()
      expect(sidebarSrc).toContain('export function Sidebar')
    })

    it('Sidebar must accept workspacePath prop', () => {
      expect(sidebarSrc).toContain('workspacePath')
    })

    it('Sidebar must accept fileTree prop', () => {
      expect(sidebarSrc).toContain('fileTree')
    })

    it('TopToolbar.tsx must exist and export TopToolbar', () => {
      expect(topToolbarSrc).toBeTruthy()
      expect(topToolbarSrc).toContain('export function TopToolbar')
    })

    it('TopToolbar must dynamically load version from electronAPI', () => {
      expect(topToolbarSrc).toContain('electronAPI')
      expect(topToolbarSrc).toMatch(/getVersion|version/)
    })

    it('TopToolbar must NOT hardcode version string', () => {
      expect(topToolbarSrc).not.toMatch(/v1\.\d+\.\d+/)
    })

    it('StatusBar.tsx must exist and export StatusBar', () => {
      expect(statusBarSrc).toBeTruthy()
      expect(statusBarSrc).toContain('export function StatusBar')
    })

    it('ActivityBar.tsx must exist', () => {
      expect(activityBarSrc).toBeTruthy()
    })

    it('Panel.tsx must exist', () => {
      expect(panelSrc).toBeTruthy()
    })
  })

  describe('Knowledge Base Components', () => {
    const providerCardSrc = read('components/knowledge/ProviderCard.tsx')
    const importDocSrc = read('components/knowledge/ImportDocumentModal.tsx')
    const cloudKBSrc = read('components/knowledge/CloudKnowledgePanel.tsx')
    const quickActionsSrc = read('components/knowledge/QuickActionsPanel.tsx')
    const kbButtonSrc = read('components/knowledge/KBButton.tsx')
    const editProviderSrc = read('components/knowledge/EditProviderModal.tsx')
    const editServerSrc = read('components/knowledge/EditServerModal.tsx')

    it('ProviderCard.tsx must exist', () => {
      expect(providerCardSrc).toBeTruthy()
    })

    it('ImportDocumentModal.tsx must exist', () => {
      expect(importDocSrc).toBeTruthy()
    })

    it('CloudKnowledgePanel.tsx must exist', () => {
      expect(cloudKBSrc).toBeTruthy()
    })

    it('QuickActionsPanel.tsx must exist', () => {
      expect(quickActionsSrc).toBeTruthy()
    })

    it('KBButton.tsx must exist', () => {
      expect(kbButtonSrc).toBeTruthy()
    })

    it('EditProviderModal.tsx must exist', () => {
      expect(editProviderSrc).toBeTruthy()
    })

    it('EditServerModal.tsx must exist', () => {
      expect(editServerSrc).toBeTruthy()
    })
  })

  describe('Feature Components', () => {
    const historySidebarSrc = read('components/HistorySidebar.tsx')
    const shareModalSrc = read('components/ShareModal.tsx')
    const usageLimitsSrc = read('components/UsageLimitsPanel.tsx')
    const interviewSrc = read('components/InterviewPanel.tsx')

    it('HistorySidebar.tsx must exist', () => {
      expect(historySidebarSrc).toBeTruthy()
    })

    it('ShareModal.tsx must exist', () => {
      expect(shareModalSrc).toBeTruthy()
    })

    it('UsageLimitsPanel.tsx must exist', () => {
      expect(usageLimitsSrc).toBeTruthy()
    })

    it('InterviewPanel.tsx must exist', () => {
      expect(interviewSrc).toBeTruthy()
    })
  })

  describe('AI Panel Component', () => {
    const aiPanelSrc = read('components/ai/AIPanel.tsx')

    it('AIPanel.tsx must exist', () => {
      expect(aiPanelSrc).toBeTruthy()
    })

    it('AIPanel must handle message submission', () => {
      expect(aiPanelSrc).toMatch(/handleSubmit|onSubmit|sendMessage/)
    })

    it('AIPanel must handle user input', () => {
      expect(aiPanelSrc).toMatch(/input|textarea|onChange/i)
    })
  })

  describe('Welcome Screen', () => {
    const welcomeSrc = read('components/welcome/WelcomeScreen.tsx')

    it('WelcomeScreen.tsx must exist and export WelcomeScreen', () => {
      expect(welcomeSrc).toBeTruthy()
      expect(welcomeSrc).toContain('export function WelcomeScreen')
    })

    it('WelcomeScreen must accept onOpenFolder callback', () => {
      expect(welcomeSrc).toContain('onOpenFolder')
    })

    it('WelcomeScreen must handle recent workspaces', () => {
      expect(welcomeSrc).toContain('recentWorkspaces')
    })

    it('WelcomeScreen must dynamically load version', () => {
      expect(welcomeSrc).toContain('appVersion')
      expect(welcomeSrc).toContain('electronAPI')
    })
  })

  describe('Desktop LanguageSelector', () => {
    const langSelectorSrc = read('components/LanguageSelector.tsx')

    it('LanguageSelector.tsx must exist', () => {
      expect(langSelectorSrc).toBeTruthy()
    })

    it('must import SUPPORTED_LANGUAGES', () => {
      expect(langSelectorSrc).toContain('SUPPORTED_LANGUAGES')
    })
  })

  describe('Hooks', () => {
    const voiceInputSrc = read('hooks/useVoiceInput.ts')
    const workspaceSrc = read('hooks/useWorkspace.ts')

    it('useVoiceInput.ts must exist', () => {
      expect(voiceInputSrc).toBeTruthy()
    })

    it('useVoiceInput must use ref pattern for callback stability (KAN-62)', () => {
      expect(voiceInputSrc).toContain('useRef')
      expect(voiceInputSrc).toContain('onResultRef')
      expect(voiceInputSrc).toContain('onErrorRef')
    })

    it('useWorkspace.ts must exist', () => {
      expect(workspaceSrc).toBeTruthy()
    })

    it('useWorkspace must NOT auto-restore workspacePath (KAN-53)', () => {
      expect(workspaceSrc).not.toMatch(/setWorkspacePath\(recent\[0\]\)/)
    })
  })

  describe('App.tsx — Main Entry Point', () => {
    const appSrc = read('App.tsx')

    it('App.tsx must exist and be non-empty', () => {
      expect(appSrc.length).toBeGreaterThan(1000)
    })

    it('must render WelcomeScreen when no workspacePath (KAN-53)', () => {
      expect(appSrc).toMatch(/if\s*\(\s*!workspacePath\s*\)/)
      expect(appSrc).not.toMatch(/!workspacePath\s*&&\s*!hasUsedBefore/)
    })

    it('must have Home button in header (KAN-53)', () => {
      expect(appSrc).toContain('setWorkspacePath(null)')
    })

    it('must have API validation with 30s timeout', () => {
      expect(appSrc).toContain('30000')
      expect(appSrc).toContain('AbortController')
    })

    it('must handle API validation failures gracefully', () => {
      expect(appSrc).toContain('API validation skipped')
      expect(appSrc).toContain('Using cached credits')
    })

    it('CSP in main.ts must allow HTTP ELB connections (KAN-64)', () => {
      const mainSrc = readFileSync(
        resolve(__dirname, '../../electron/main.ts'),
        'utf-8'
      )
      expect(mainSrc).toMatch(/connect-src.*http:\/\/\*\.elb\.amazonaws\.com/)
    })
  })
})
