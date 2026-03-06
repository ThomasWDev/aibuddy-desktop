import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * API Endpoint Separation Tests
 * 
 * Ensures V1 endpoints are used for AI coding (desktop + extension)
 * and V2 endpoints are reserved for mobile multimedia (video, music, image).
 * 
 * Architecture:
 *   V1 (/v1/inference, ALB /)  → AI coding inference (desktop, extension)
 *   V2 (/v2/chat, /v2/image/*, /v2/video/*, /v2/music/*) → mobile multimedia
 */

const DESKTOP_SRC = path.resolve(__dirname, '../../src')
const DESKTOP_RENDERER = path.resolve(__dirname, '../../renderer/src')

function readSourceFiles(dir: string, ext = '.ts'): { file: string; content: string }[] {
  const results: { file: string; content: string }[] = []
  if (!fs.existsSync(dir)) return results

  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(full)
      } else if (entry.isFile() && (full.endsWith(ext) || full.endsWith('.tsx'))) {
        results.push({ file: full, content: fs.readFileSync(full, 'utf-8') })
      }
    }
  }
  walk(dir)
  return results
}

describe('API Endpoint Separation — Desktop', () => {
  describe('V1 for AI Coding', () => {
    it('urls.ts should derive inference URL from ALB (V1 architecture)', () => {
      const urlsFile = path.resolve(DESKTOP_SRC, 'constants/urls.ts')
      const content = fs.readFileSync(urlsFile, 'utf-8')

      expect(content).toContain('AIBUDDY_ALB_URL')
      expect(content).toContain('AIBUDDY_API_INFERENCE_URL')
      expect(content).not.toMatch(/\/v2\/chat/)
      expect(content).not.toMatch(/\/v2\/image/)
      expect(content).not.toMatch(/\/v2\/video/)
      expect(content).not.toMatch(/\/v2\/music/)
    })

    it('aibuddy-client.ts should use /v1/inference for API Gateway', () => {
      const clientFile = path.resolve(DESKTOP_SRC, 'api/aibuddy-client.ts')
      const content = fs.readFileSync(clientFile, 'utf-8')

      expect(content).toContain('/v1/inference')
      expect(content).not.toMatch(/\/v2\/chat/)
      expect(content).not.toMatch(/\/v2\/image/)
      expect(content).not.toMatch(/\/v2\/video/)
      expect(content).not.toMatch(/\/v2\/music/)
    })
  })

  describe('No hardcoded unresolvable URLs', () => {
    it('agent-adapter.ts should NOT hardcode api.aibuddy.life (DNS unresolvable)', () => {
      const adapterFile = path.resolve(DESKTOP_SRC, 'core/agent-adapter.ts')
      const content = fs.readFileSync(adapterFile, 'utf-8')

      expect(content).not.toContain('api.aibuddy.life')
    })

    it('no source file should hardcode api.aibuddy.life in fetch/request calls', () => {
      const files = readSourceFiles(DESKTOP_SRC)
      const violations: string[] = []

      for (const { file, content } of files) {
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.includes('api.aibuddy.life') && (line.includes('fetch') || line.includes('axios') || line.includes('request'))) {
            violations.push(`${path.relative(DESKTOP_SRC, file)}:${i + 1}`)
          }
        }
      }

      expect(violations).toEqual([])
    })
  })

  describe('V2 multimedia endpoints are NOT called by desktop', () => {
    it('no source file calls /v2/chat endpoint', () => {
      const allFiles = [...readSourceFiles(DESKTOP_SRC), ...readSourceFiles(DESKTOP_RENDERER)]
      const violations: string[] = []

      for (const { file, content } of allFiles) {
        if (file.includes('.test.') || file.includes('__tests__')) continue
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/['"`].*\/v2\/chat['"`]/) || lines[i].match(/\/v2\/chat['"`]/)) {
            violations.push(`${path.relative(DESKTOP_SRC, file)}:${i + 1}`)
          }
        }
      }

      expect(violations).toEqual([])
    })

    it('no source file calls /v2/image/generate endpoint', () => {
      const allFiles = [...readSourceFiles(DESKTOP_SRC), ...readSourceFiles(DESKTOP_RENDERER)]
      const violations: string[] = []

      for (const { file, content } of allFiles) {
        if (file.includes('.test.') || file.includes('__tests__')) continue
        if (content.includes('/v2/image/generate')) {
          violations.push(path.relative(DESKTOP_SRC, file))
        }
      }

      expect(violations).toEqual([])
    })

    it('no source file calls /v2/video/generate endpoint', () => {
      const allFiles = [...readSourceFiles(DESKTOP_SRC), ...readSourceFiles(DESKTOP_RENDERER)]
      const violations: string[] = []

      for (const { file, content } of allFiles) {
        if (file.includes('.test.') || file.includes('__tests__')) continue
        if (content.includes('/v2/video/generate')) {
          violations.push(path.relative(DESKTOP_SRC, file))
        }
      }

      expect(violations).toEqual([])
    })

    it('no source file calls /v2/music/generate endpoint', () => {
      const allFiles = [...readSourceFiles(DESKTOP_SRC), ...readSourceFiles(DESKTOP_RENDERER)]
      const violations: string[] = []

      for (const { file, content } of allFiles) {
        if (file.includes('.test.') || file.includes('__tests__')) continue
        if (content.includes('/v2/music/generate')) {
          violations.push(path.relative(DESKTOP_SRC, file))
        }
      }

      expect(violations).toEqual([])
    })
  })

  describe('Agent adapter uses configurable endpoint via config', () => {
    it('agent-adapter.ts should use config.apiUrl (not hardcoded)', () => {
      const adapterFile = path.resolve(DESKTOP_SRC, 'core/agent-adapter.ts')
      const content = fs.readFileSync(adapterFile, 'utf-8')

      expect(content).toContain('this.config.apiUrl')
    })

    it('AgentConfig interface should include apiUrl field', () => {
      const adapterFile = path.resolve(DESKTOP_SRC, 'core/agent-adapter.ts')
      const content = fs.readFileSync(adapterFile, 'utf-8')

      expect(content).toMatch(/apiUrl\??\s*:\s*string/)
    })
  })
})
