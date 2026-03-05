import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeedbackDialog } from '../../renderer/src/components/FeedbackDialog'
import type { FeedbackPayload } from '../../renderer/src/components/FeedbackDialog'

describe('FeedbackDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()
  const testMessageId = 'msg-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <FeedbackDialog isOpen={false} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when messageId is null', () => {
    const { container } = render(
      <FeedbackDialog isOpen={true} messageId={null} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog when isOpen and messageId are provided', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    expect(screen.getByText('What went wrong?')).toBeInTheDocument()
  })

  it('renders all four feedback categories', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    expect(screen.getByText('Wrong answer')).toBeInTheDocument()
    expect(screen.getByText('Too slow')).toBeInTheDocument()
    expect(screen.getByText("Didn't understand my question")).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    expect(screen.getByText('Submit Feedback')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('submit button is disabled when no category selected and no comment', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    const submitBtn = screen.getByText('Submit Feedback').closest('button')
    expect(submitBtn).toBeDisabled()
  })

  it('selecting a category enables the submit button', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('Wrong answer'))
    const submitBtn = screen.getByText('Submit Feedback').closest('button')
    expect(submitBtn).not.toBeDisabled()
  })

  it('toggling a category deselects it', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    const cat = screen.getByText('Too slow')
    fireEvent.click(cat)
    fireEvent.click(cat)
    const submitBtn = screen.getByText('Submit Feedback').closest('button')
    expect(submitBtn).toBeDisabled()
  })

  it('typing a comment enables the submit button', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    const textarea = screen.getByPlaceholderText('Any additional comments? (optional)')
    fireEvent.change(textarea, { target: { value: 'The code was wrong' } })
    const submitBtn = screen.getByText('Submit Feedback').closest('button')
    expect(submitBtn).not.toBeDisabled()
  })

  it('calls onSubmit with correct payload on submit', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('Wrong answer'))
    const textarea = screen.getByPlaceholderText('Any additional comments? (optional)')
    fireEvent.change(textarea, { target: { value: 'Bad output' } })
    fireEvent.click(screen.getByText('Submit Feedback'))

    expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    const payload: FeedbackPayload = mockOnSubmit.mock.calls[0][0]
    expect(payload.messageId).toBe(testMessageId)
    expect(payload.category).toBe('wrongAnswer')
    expect(payload.comment).toBe('Bad output')
    expect(payload.timestamp).toBeTruthy()
  })

  it('shows thank-you state after submission', async () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('Wrong answer'))
    fireEvent.click(screen.getByText('Submit Feedback'))

    await waitFor(() => {
      expect(screen.getByText('Thanks for your feedback!')).toBeInTheDocument()
    })
  })

  it('calls onClose when cancel is clicked', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the backdrop', () => {
    render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    const backdrop = screen.getByText('What went wrong?').closest('.fixed')
    if (backdrop) fireEvent.click(backdrop)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('resets state when dialog reopens', () => {
    const { rerender } = render(
      <FeedbackDialog isOpen={true} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    fireEvent.click(screen.getByText('Wrong answer'))
    rerender(
      <FeedbackDialog isOpen={false} messageId={testMessageId} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    rerender(
      <FeedbackDialog isOpen={true} messageId="msg-456" onClose={mockOnClose} onSubmit={mockOnSubmit} />
    )
    const submitBtn = screen.getByText('Submit Feedback').closest('button')
    expect(submitBtn).toBeDisabled()
  })
})
