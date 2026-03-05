import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'header.credits': 'Credits: {{amount}}',
        'header.buyCredits': 'Buy Credits',
        'header.new': 'New',
        'header.openFolder': 'Open Folder',
        'header.settings': 'Settings',
        'header.moreActions': 'More actions',
        'header.history': 'Chat History',
        'header.interview': 'Interview Mode',
        'welcome.hero.greeting': 'Hey there, Coder! 👋',
        'welcome.hero.subtitle': "I'm your AI coding buddy! Let's build something awesome together! 🚀",
        'welcome.hero.openProject': 'Open Project',
        'welcome.hero.opening': 'Opening...',
        'welcome.hero.openProjectDesc': 'Pick a folder with your code',
        'welcome.hero.startChatting': 'Start Chatting',
        'welcome.hero.startChattingDesc': 'Ask me anything about code!',
        'welcome.hero.recentProjects': 'Recent Projects',
        'welcome.hero.poweredBy': 'Powered by AIBuddy',
        'welcome.hero.smartHelper': 'Smart Code Helper',
        'welcome.hero.superFast': 'Super Fast',
        'welcome.hero.footer': 'Made with 💖 for young coders',
        'welcome.hero.apiKeySet': 'API Key Set',
        'welcome.hero.noApiKey': 'No API Key',
        'apiKey.title': 'API Key Required',
        'apiKey.description': 'Add your AIBuddy API key to start chatting with AI',
        'apiKey.addKey': 'Add Key',
        'apiKey.configured': 'API Key configured',
        'apiKey.notConfigured': 'Add your API key',
        'status.ready': 'Ready',
        'status.loading': 'Loading...',
        'app.version': 'v{{version}}',
        'historySidebar.deleteAllTitle': 'Delete All Chats',
        'historySidebar.deleteAllMessage': 'Are you sure you want to delete all chat history?',
        'historySidebar.deleteAllDetail': 'This will permanently remove all {{count}} conversations, including pinned chats. This action cannot be undone.',
        'historySidebar.deleteAllConfirm': 'Delete All',
        'historySidebar.deleteSingleTitle': 'Delete Chat',
        'historySidebar.deleteSingleMessage': 'Are you sure you want to delete this chat?',
        'historySidebar.deleteSingleDetail': 'This action cannot be undone.',
        'historySidebar.deleteSingleConfirm': 'Delete',
        'feedback.whatWentWrong': 'What went wrong?',
        'feedback.wrongAnswer': 'Wrong answer',
        'feedback.tooSlow': 'Too slow',
        'feedback.didntUnderstand': "Didn't understand my question",
        'feedback.other': 'Other',
        'feedback.additionalComments': 'Any additional comments? (optional)',
        'feedback.submitFeedback': 'Submit Feedback',
        'feedback.cancel': 'Cancel',
        'feedback.thankYou': 'Thanks for your feedback!',
        'feedback.npsQuestion': 'How likely are you to recommend AIBuddy to a friend?',
        'feedback.npsNotLikely': 'Not likely',
        'feedback.npsVeryLikely': 'Very likely',
        'feedback.npsSubmit': 'Submit',
        'feedback.npsDontAskAgain': "Don't ask again",
        'feedback.npsMaybeLater': 'Maybe later',
        'menu.rateOnAppStore': 'Rate on App Store',
        'menu.shareFeedback': 'Share Feedback',
      }
      let result = translations[key] || key
      if (opts) {
        Object.entries(opts).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v))
        })
      }
      return result
    },
    i18n: { language: 'en', changeLanguage: vi.fn() }
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} }
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp'),
    getVersion: vi.fn().mockReturnValue('1.5.77'),
  },
  BrowserWindow: vi.fn(),
  shell: { openExternal: vi.fn() },
}))

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

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
    openFile: vi.fn().mockResolvedValue('/test/file.png'),
    saveFile: vi.fn().mockResolvedValue('/test/save.ts'),
    showMessage: vi.fn().mockResolvedValue({ response: 0 })
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(true),
    showItemInFolder: vi.fn().mockResolvedValue(true)
  },
  fs: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('test image data')),
    // KAN-6/KAN-7/KAN-12 FIX: New IPC methods that return plain strings (no Buffer in renderer)
    readFileAsBase64: vi.fn().mockResolvedValue(Buffer.from('test image data').toString('base64')),
    readFileAsText: vi.fn().mockResolvedValue('test file content'),
    getFileSize: vi.fn().mockResolvedValue(1024),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readDir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ isDirectory: false, isFile: true, size: 1024, mtime: Date.now() }),
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
    onExit: vi.fn().mockReturnValue(() => {}),
    execute: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    executeStreaming: vi.fn().mockResolvedValue({ pid: 1 }),
    onOutput: vi.fn().mockReturnValue(() => {}),
    onComplete: vi.fn().mockReturnValue(() => {}),
    onStream: vi.fn().mockReturnValue(() => {}),
    onStreamEnd: vi.fn().mockReturnValue(() => {})
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
  kb: {
    getProviders: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({}),
    isUnlocked: vi.fn().mockResolvedValue(false),
    addProvider: vi.fn().mockResolvedValue({}),
    updateProvider: vi.fn().mockResolvedValue({}),
    deleteProvider: vi.fn().mockResolvedValue(true),
    addServer: vi.fn().mockResolvedValue({}),
    updateServer: vi.fn().mockResolvedValue({}),
    deleteServer: vi.fn().mockResolvedValue(true),
    importDocument: vi.fn().mockResolvedValue({}),
    openFileDialog: vi.fn().mockResolvedValue(null),
    readFilePath: vi.fn().mockResolvedValue(''),
    readMultipleFiles: vi.fn().mockResolvedValue([]),
    unlock: vi.fn().mockResolvedValue(true),
    lock: vi.fn().mockResolvedValue(undefined),
    generateAIContext: vi.fn().mockResolvedValue(''),
    getRelevantContext: vi.fn().mockResolvedValue(''),
    openTerminalWithSsh: vi.fn().mockResolvedValue(true)
  },
  history: {
    getThreads: vi.fn().mockResolvedValue([]),
    getThread: vi.fn().mockResolvedValue(null),
    getActiveThread: vi.fn().mockResolvedValue(null),
    createThread: vi.fn().mockResolvedValue({ id: 'test-thread', title: 'Test' }),
    setActiveThread: vi.fn().mockResolvedValue(true),
    addMessage: vi.fn().mockResolvedValue({}),
    updateMetadata: vi.fn().mockResolvedValue(true),
    updateMessageFeedback: vi.fn().mockResolvedValue(true),
    renameThread: vi.fn().mockResolvedValue(true),
    deleteThread: vi.fn().mockResolvedValue(true),
    clearAll: vi.fn().mockResolvedValue(true),
    search: vi.fn().mockResolvedValue([]),
    export: vi.fn().mockResolvedValue('')
  },
  environment: {
    detectEnvironment: vi.fn().mockResolvedValue({}),
    getSummary: vi.fn().mockResolvedValue('')
  },
  app: {
    getVersion: vi.fn().mockResolvedValue(pkg.version),
    getPlatform: vi.fn().mockReturnValue('darwin'),
    getArch: vi.fn().mockReturnValue('arm64')
  },
  invoke: vi.fn().mockResolvedValue(null),
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

