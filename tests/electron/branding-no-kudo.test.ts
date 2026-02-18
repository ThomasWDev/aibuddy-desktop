import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Branding Regression Guard — No Kudo/Kodu References
 * 
 * KAN-49: The app was showing "Kudo" branding in several places because
 * the codebase was forked from kodu-ai/claude-coder. All user-facing
 * references must use "AIBuddy" branding.
 * 
 * JIRA: https://hire-programmers-team.atlassian.net/browse/KAN-49
 * 
 * PREVENTION: These tests scan source files for any remaining Kudo/Kodu
 * references that would be visible to users.
 */

const extensionSrcDir = path.resolve(__dirname, '../../../extension/src')
const webviewSrcDir = path.resolve(__dirname, '../../../extension/webview-ui-vite/src')
const desktopRendererDir = path.resolve(__dirname, '../../renderer/src')

function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function scanDirForPattern(dir: string, pattern: RegExp, extensions = ['.ts', '.tsx', '.js', '.jsx']): Array<{file: string, line: number, text: string}> {
  const results: Array<{file: string, line: number, text: string}> = []
  
  function walk(d: string) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name)
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'build' && entry.name !== 'dist') {
          walk(fullPath)
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const lines = content.split('\n')
          lines.forEach((line, i) => {
            // Skip comments that reference kodu in Sentry filters or protocol docs
            if (line.includes('beforeSend') || line.includes('sentry')) return
            if (pattern.test(line)) {
              results.push({ file: fullPath, line: i + 1, text: line.trim() })
            }
          })
        }
      }
    } catch {}
  }
  
  walk(dir)
  return results
}

describe('KAN-49: No Kodu Branding in Extension Source', () => {
  it('should NOT have "kodu-ai" in user-facing URLs', () => {
    const aibuddyTs = readFileSafe(path.join(extensionSrcDir, 'shared/aibuddy.ts'))
    // Strip comments
    const codeOnly = aibuddyTs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
    expect(codeOnly).not.toContain('kodu-ai.')
  })

  it('should NOT have "kodu-prompt" filesystem scheme', () => {
    const agentRouter = readFileSafe(path.join(extensionSrcDir, 'router/routes/agent-router.ts'))
    expect(agentRouter).not.toContain('"kodu-prompt"')
  })

  it('should NOT have "kodu.savePrompt" command', () => {
    const agentRouter = readFileSafe(path.join(extensionSrcDir, 'router/routes/agent-router.ts'))
    expect(agentRouter).not.toContain('"kodu.savePrompt"')
  })

  it('should use "aibuddy-prompt" filesystem scheme', () => {
    const agentRouter = readFileSafe(path.join(extensionSrcDir, 'router/routes/agent-router.ts'))
    expect(agentRouter).toContain('aibuddy-prompt')
  })

  it('should use "aibuddy.savePrompt" command', () => {
    const agentRouter = readFileSafe(path.join(extensionSrcDir, 'router/routes/agent-router.ts'))
    expect(agentRouter).toContain('aibuddy.savePrompt')
  })

  it('should NOT have "KODU.AI" in file headers', () => {
    const diffView = readFileSafe(path.join(extensionSrcDir, 'integrations/editor/diff-view-provider.ts'))
    expect(diffView).not.toContain('KODU.AI')
    expect(diffView).not.toContain('KODU STREAM')
  })

  it('should NOT have "kodu_task" in export filenames', () => {
    const exportMd = readFileSafe(path.join(extensionSrcDir, 'utils/export-markdown.ts'))
    expect(exportMd).not.toContain('kodu_task')
    expect(exportMd).toContain('aibuddy_task')
  })
})

describe('KAN-49: No Kodu Branding in Webview UI', () => {
  it('should NOT have kodu-ai GitHub links', () => {
    const chatRow = readFileSafe(path.join(webviewSrcDir, 'components/chat-row/chat-row.tsx'))
    expect(chatRow).not.toContain('github.com/kodu-ai')
  })

  it('should NOT have kodu-ai marketplace links', () => {
    const banner = readFileSafe(path.join(webviewSrcDir, 'components/announcement-banner/index.tsx'))
    expect(banner).not.toContain('kodu-ai.claude-dev-experimental')
    expect(banner).toContain('AIBuddyStudio.AIBuddy')
  })

  it('should NOT have koduModels reference in comments', () => {
    const modelPicker = readFileSafe(path.join(webviewSrcDir, 'components/settings-view/preferences/model-picker.tsx'))
    expect(modelPicker).not.toContain('koduModels')
  })
})

describe('KAN-49: No Kodu Branding in Desktop App', () => {
  it('desktop package.json productName should be AIBuddy', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'))
    expect(pkg.build?.productName || '').not.toMatch(/kodu|kudo/i)
  })

  it('desktop renderer should not contain kodu references', () => {
    if (!fs.existsSync(desktopRendererDir)) return
    const hits = scanDirForPattern(desktopRendererDir, /kodu|kudo/i)
    const nonSentryHits = hits.filter(h => !h.text.includes('sentry') && !h.text.includes('beforeSend'))
    expect(nonSentryHits).toHaveLength(0)
  })
})

describe('KAN-49: Extension Test/Bundler Branding', () => {
  it('bundler/mac.sh should reference AIBuddyStudio.AIBuddy', () => {
    const macSh = readFileSafe(path.resolve(__dirname, '../../../bundler/mac.sh'))
    if (!macSh) return
    expect(macSh).not.toContain('kodu-ai.claude-dev-experimental')
    expect(macSh).toContain('AIBuddyStudio.AIBuddy')
  })

  it('test/index.ts should reference AIBuddyStudio.AIBuddy', () => {
    const testIndex = readFileSafe(path.resolve(__dirname, '../../../extension/test/index.ts'))
    if (!testIndex) return
    expect(testIndex).not.toContain('kodu-ai.claude-dev-experimental')
    expect(testIndex).toContain('AIBuddyStudio.AIBuddy')
  })
})
