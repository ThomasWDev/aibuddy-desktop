import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIPanel } from '../../renderer/src/components/ai/AIPanel'
import { mockElectronAPI } from '../setup'

// Mock the aibuddy-client module
vi.mock('../../src/api/aibuddy-client', () => ({
  aibuddyClient: {
    getApiKey: vi.fn().mockResolvedValue('test-api-key'),
    saveApiKey: vi.fn().mockResolvedValue(undefined),
    chat: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Hello! I am AIBuddy.' }],
      model: 'claude-opus-4-20250514',
      usage: { input_tokens: 10, output_tokens: 20 }
    })
  }
}))

// Mock sentry
vi.mock('../../renderer/src/lib/sentry', () => ({
  trackButtonClick: vi.fn(),
  trackError: vi.fn(),
  addBreadcrumb: vi.fn(),
  trackAIRequest: vi.fn(),
  trackAIResponse: vi.fn()
}))

describe('AIPanel', () => {
  const mockOnClose = vi.fn()
  const workspacePath = '/test/workspace'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render AI Assistant header', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument()
  })

  it('should render welcome message when no messages', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    expect(screen.getByText(/Welcome to AIBuddy/i)).toBeInTheDocument()
  })

  it('should render input textarea', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    expect(screen.getByPlaceholderText(/Ask AIBuddy anything/i)).toBeInTheDocument()
  })

  it('should render send button', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    const sendButton = screen.getByRole('button', { name: '' }) // Send button has no text, just icon
    expect(sendButton).toBeInTheDocument()
  })

  it('should render Powered by AIBuddy text', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    expect(screen.getByText(/Powered by AIBuddy/i)).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    
    // Find the close button (X icon)
    const closeButton = screen.getByTitle(/Close/i)
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should render new chat button', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    expect(screen.getByTitle(/New Chat/i)).toBeInTheDocument()
  })

  it('should render settings button', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    expect(screen.getByTitle(/Settings/i)).toBeInTheDocument()
  })

  it('should allow typing in the input', async () => {
    const user = userEvent.setup()
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    
    const input = screen.getByPlaceholderText(/Ask AIBuddy anything/i)
    await user.type(input, 'Hello AI!')
    
    expect(input).toHaveValue('Hello AI!')
  })

  it('should render feature hints', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    
    expect(screen.getByText(/Ask questions/i)).toBeInTheDocument()
    expect(screen.getByText(/Debug code/i)).toBeInTheDocument()
    expect(screen.getByText(/Write code/i)).toBeInTheDocument()
  })

  it('should have disabled send button when input is empty', () => {
    render(<AIPanel workspacePath={workspacePath} onClose={mockOnClose} />)
    
    const form = screen.getByPlaceholderText(/Ask AIBuddy anything/i).closest('form')
    const submitButton = form?.querySelector('button[type="submit"]')
    
    expect(submitButton).toBeDisabled()
  })
})

