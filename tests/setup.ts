import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn()

// Mock window.electronAPI for renderer tests
const mockElectronAPI = {
  store: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true)
  },
  dialog: {
    openFolder: vi.fn().mockResolvedValue('/test/path'),
    openFile: vi.fn().mockResolvedValue('/test/file.ts'),
    saveFile: vi.fn().mockResolvedValue('/test/save.ts'),
    showMessage: vi.fn().mockResolvedValue({ response: 0 })
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(true),
    showItemInFolder: vi.fn().mockResolvedValue(true)
  },
  fs: {
    readFile: vi.fn().mockResolvedValue('file content'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readDir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ isDirectory: false, isFile: true, size: 100, mtime: Date.now() }),
    exists: vi.fn().mockResolvedValue(true),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined)
  },
  terminal: {
    create: vi.fn().mockResolvedValue(1),
    write: vi.fn().mockResolvedValue(undefined),
    resize: vi.fn().mockResolvedValue(undefined),
    kill: vi.fn().mockResolvedValue(undefined),
    onData: vi.fn().mockReturnValue(() => {}),
    onExit: vi.fn().mockReturnValue(() => {})
  },
  git: {
    status: vi.fn().mockResolvedValue({ files: [] }),
    diff: vi.fn().mockResolvedValue(''),
    log: vi.fn().mockResolvedValue([]),
    branch: vi.fn().mockResolvedValue({ current: 'main', all: ['main'] }),
    checkout: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue(undefined)
  },
  rpc: {
    invoke: vi.fn().mockResolvedValue(null),
    on: vi.fn().mockReturnValue(() => {})
  },
  app: {
    getVersion: vi.fn().mockResolvedValue('1.4.27'),
    getPlatform: vi.fn().mockReturnValue('darwin'),
    getArch: vi.fn().mockReturnValue('arm64')
  },
  on: vi.fn().mockReturnValue(() => {}),
  off: vi.fn()
}

// Set up global mocks
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// Mock fetch for API tests
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'debug').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Export for use in tests
export { mockElectronAPI }

