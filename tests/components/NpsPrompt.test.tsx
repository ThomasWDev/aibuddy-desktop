import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  NpsPrompt,
  shouldShowNps,
  incrementInteractionCount,
  getInteractionCount
} from '../../renderer/src/components/NpsPrompt'

let store: Record<string, string> = {}
const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
  get length() { return Object.keys(store).length },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
}

describe('NpsPrompt', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    store = {}
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <NpsPrompt isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders prompt when isOpen is true', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    expect(screen.getByText('How likely are you to recommend AIBuddy to a friend?')).toBeInTheDocument()
  })

  it('renders 11 score buttons (0-10)', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('renders Not likely and Very likely labels', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    expect(screen.getByText('Not likely')).toBeInTheDocument()
    expect(screen.getByText('Very likely')).toBeInTheDocument()
  })

  it('submit button is disabled until a score is selected', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    const submitBtn = screen.getByText('Submit').closest('button')
    expect(submitBtn).toBeDisabled()
  })

  it('selecting a score enables submit', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('8'))
    const submitBtn = screen.getByText('Submit').closest('button')
    expect(submitBtn).not.toBeDisabled()
  })

  it('calls onSubmit with the selected score', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('9'))
    fireEvent.click(screen.getByText('Submit'))
    expect(mockOnSubmit).toHaveBeenCalledWith(9)
  })

  it('shows thank-you message after submission', async () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('7'))
    fireEvent.click(screen.getByText('Submit'))
    await waitFor(() => {
      expect(screen.getByText('Thanks for your feedback!')).toBeInTheDocument()
    })
  })

  it('calls onClose when Maybe later is clicked', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('Maybe later'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose and sets dismissed flag when Don\'t ask again is clicked', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText("Don't ask again"))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
    expect(store['aibuddy_nps_dismissed']).toBe('true')
  })

  it('calls onClose on Escape key', () => {
    render(
      <NpsPrompt isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})

describe('NPS trigger logic', () => {
  beforeEach(() => {
    store = {}
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })
  })

  it('incrementInteractionCount starts at 0 and increments', () => {
    expect(getInteractionCount()).toBe(0)
    incrementInteractionCount()
    expect(getInteractionCount()).toBe(1)
    incrementInteractionCount()
    expect(getInteractionCount()).toBe(2)
  })

  it('shouldShowNps returns false when interaction count < 10', () => {
    for (let i = 0; i < 9; i++) incrementInteractionCount()
    expect(shouldShowNps()).toBe(false)
  })

  it('shouldShowNps returns true when interaction count >= 10 and no prior prompt', () => {
    for (let i = 0; i < 10; i++) incrementInteractionCount()
    expect(shouldShowNps()).toBe(true)
  })

  it('shouldShowNps returns false when permanently dismissed', () => {
    for (let i = 0; i < 10; i++) incrementInteractionCount()
    store['aibuddy_nps_dismissed'] = 'true'
    expect(shouldShowNps()).toBe(false)
  })

  it('shouldShowNps returns false when prompted within last 30 days', () => {
    for (let i = 0; i < 10; i++) incrementInteractionCount()
    store['aibuddy_nps_last_prompt'] = String(Date.now())
    expect(shouldShowNps()).toBe(false)
  })

  it('shouldShowNps returns true when prompted > 30 days ago', () => {
    for (let i = 0; i < 10; i++) incrementInteractionCount()
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000
    store['aibuddy_nps_last_prompt'] = String(thirtyOneDaysAgo)
    expect(shouldShowNps()).toBe(true)
  })
})
