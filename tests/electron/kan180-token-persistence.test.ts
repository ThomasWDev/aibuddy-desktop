import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-180: In/Out Token Metrics Disappear After App Restart
 *
 * Root cause: All 4 message hydration paths in App.tsx explicitly map only
 * id, role, content, cost, model — DROPPING tokensIn, tokensOut, responseTime,
 * and timestamp when loading messages from history.
 *
 * The data IS persisted correctly (ChatMessage type includes these fields,
 * addMessage spreads all properties), but it's lost during rehydration.
 *
 * Fix: Add tokensIn, tokensOut, responseTime, timestamp to all 4 mapping paths:
 * 1. Startup with embedded messages (threadToRestore.messages.map)
 * 2. Startup via getThread (fullThread.messages.map)
 * 3. Recent threads quick-select (thread.messages.map in WelcomeScreen)
 * 4. HistorySidebar thread select (thread.messages.map in onSelectThread)
 *
 * Also: Add responseTime to ChatMessage type for proper persistence typing.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../..')

const APP_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'renderer/src/App.tsx'),
  'utf-8'
)

const TYPES_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/history/types.ts'),
  'utf-8'
)

const HISTORY_MANAGER_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/history/history-manager.ts'),
  'utf-8'
)

describe('KAN-180: Token Metrics Persistence After Restart', () => {

  // ==========================================================================
  // 1. ChatMessage type must include responseTime for proper persistence
  // ==========================================================================
  describe('ChatMessage type — persistence fields', () => {
    const getChatMessageBlock = () => {
      const start = TYPES_SOURCE.indexOf('interface ChatMessage')
      const nextInterface = TYPES_SOURCE.indexOf('interface ChatThread')
      return TYPES_SOURCE.slice(start, nextInterface)
    }

    it('must include tokensIn field', () => {
      expect(getChatMessageBlock()).toContain('tokensIn')
    })

    it('must include tokensOut field', () => {
      expect(getChatMessageBlock()).toContain('tokensOut')
    })

    it('must include responseTime field', () => {
      expect(getChatMessageBlock()).toContain('responseTime')
    })
  })

  // ==========================================================================
  // 2. Hydration path 1: startup with embedded messages
  // ==========================================================================
  describe('Hydration path 1 — startup embedded messages', () => {
    const getBlock = () => {
      const marker = 'threadToRestore.messages.map'
      const idx = APP_SOURCE.indexOf(marker)
      expect(idx).toBeGreaterThan(-1)
      return APP_SOURCE.slice(idx, idx + 600)
    }

    it('must map tokensIn from persisted message', () => {
      expect(getBlock()).toContain('tokensIn')
    })

    it('must map tokensOut from persisted message', () => {
      expect(getBlock()).toContain('tokensOut')
    })

    it('must map responseTime from persisted message', () => {
      expect(getBlock()).toContain('responseTime')
    })

    it('must map timestamp from persisted message', () => {
      expect(getBlock()).toContain('timestamp')
    })
  })

  // ==========================================================================
  // 3. Hydration path 2: startup via getThread
  // ==========================================================================
  describe('Hydration path 2 — startup getThread fallback', () => {
    const getBlock = () => {
      const marker = 'fullThread.messages.map'
      const idx = APP_SOURCE.indexOf(marker)
      expect(idx).toBeGreaterThan(-1)
      return APP_SOURCE.slice(idx, idx + 600)
    }

    it('must map tokensIn from persisted message', () => {
      expect(getBlock()).toContain('tokensIn')
    })

    it('must map tokensOut from persisted message', () => {
      expect(getBlock()).toContain('tokensOut')
    })

    it('must map responseTime from persisted message', () => {
      expect(getBlock()).toContain('responseTime')
    })

    it('must map timestamp from persisted message', () => {
      expect(getBlock()).toContain('timestamp')
    })
  })

  // ==========================================================================
  // 4. Hydration path 3: recent threads quick-select (WelcomeScreen)
  // ==========================================================================
  describe('Hydration path 3 — recent threads quick-select', () => {
    const getBlock = () => {
      const marker = 'recentThreads.slice(0, 3).map'
      const idx = APP_SOURCE.indexOf(marker)
      expect(idx).toBeGreaterThan(-1)
      const mapIdx = APP_SOURCE.indexOf('thread.messages.map', idx)
      expect(mapIdx).toBeGreaterThan(-1)
      return APP_SOURCE.slice(mapIdx, mapIdx + 600)
    }

    it('must map tokensIn from persisted message', () => {
      expect(getBlock()).toContain('tokensIn')
    })

    it('must map tokensOut from persisted message', () => {
      expect(getBlock()).toContain('tokensOut')
    })

    it('must map responseTime from persisted message', () => {
      expect(getBlock()).toContain('responseTime')
    })

    it('must map timestamp from persisted message', () => {
      expect(getBlock()).toContain('timestamp')
    })
  })

  // ==========================================================================
  // 5. Hydration path 4: HistorySidebar thread select
  // ==========================================================================
  describe('Hydration path 4 — HistorySidebar onSelectThread', () => {
    const getBlock = () => {
      const marker = 'onSelectThread'
      const idx = APP_SOURCE.indexOf(marker)
      expect(idx).toBeGreaterThan(-1)
      const mapIdx = APP_SOURCE.indexOf('thread.messages.map', idx)
      expect(mapIdx).toBeGreaterThan(-1)
      return APP_SOURCE.slice(mapIdx, mapIdx + 600)
    }

    it('must map tokensIn from persisted message', () => {
      expect(getBlock()).toContain('tokensIn')
    })

    it('must map tokensOut from persisted message', () => {
      expect(getBlock()).toContain('tokensOut')
    })

    it('must map responseTime from persisted message', () => {
      expect(getBlock()).toContain('responseTime')
    })

    it('must map timestamp from persisted message', () => {
      expect(getBlock()).toContain('timestamp')
    })
  })

  // ==========================================================================
  // 6. Persistence layer — addMessage must spread all fields
  // ==========================================================================
  describe('Persistence — addMessage spreads all fields', () => {
    it('addMessage must use spread operator on incoming message', () => {
      const addMsgIdx = HISTORY_MANAGER_SOURCE.indexOf('addMessage(')
      expect(addMsgIdx).toBeGreaterThan(-1)
      const endIdx = HISTORY_MANAGER_SOURCE.indexOf('\n  }', addMsgIdx + 100)
      const block = HISTORY_MANAGER_SOURCE.slice(addMsgIdx, endIdx > addMsgIdx ? endIdx : addMsgIdx + 1200)
      expect(block).toContain('...message')
    })
  })

  // ==========================================================================
  // 7. Regression: cost and model must still be mapped in all paths
  // ==========================================================================
  describe('Regression — cost and model still mapped', () => {
    it('startup embedded path must map cost', () => {
      const idx = APP_SOURCE.indexOf('threadToRestore.messages.map')
      const block = APP_SOURCE.slice(idx, idx + 600)
      expect(block).toContain('cost')
    })

    it('startup getThread path must map cost', () => {
      const idx = APP_SOURCE.indexOf('fullThread.messages.map')
      const block = APP_SOURCE.slice(idx, idx + 600)
      expect(block).toContain('cost')
    })

    it('HistorySidebar path must map cost', () => {
      const marker = 'onSelectThread'
      const idx = APP_SOURCE.indexOf(marker)
      const mapIdx = APP_SOURCE.indexOf('thread.messages.map', idx)
      const block = APP_SOURCE.slice(mapIdx, mapIdx + 600)
      expect(block).toContain('cost')
    })
  })
})
