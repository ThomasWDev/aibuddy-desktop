/**
 * KAN-191: [Mac] Add "Delete All Chats" Option with Confirmation in Chat History
 * 
 * TDD Tests — written BEFORE implementation.
 * Tests the HistorySidebar component for:
 * 1. "Delete All" button visibility
 * 2. Native Electron confirmation dialog (not window.confirm)
 * 3. Clearing all threads on confirm
 * 4. Cancellation preserves threads
 * 5. Single-thread delete upgraded to Electron dialog
 * 6. Empty state hides Delete All button
 * 7. Thread count updates after deletion
 * 8. Active thread deselected after clear
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistorySidebar } from '../../renderer/src/components/HistorySidebar'
import type { ChatThread } from '../../src/history/types'

const makeThread = (overrides: Partial<ChatThread> = {}): ChatThread => ({
  id: `thread-${Math.random().toString(36).slice(2)}`,
  title: 'Test Thread',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [{ id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() }],
  ...overrides
})

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSelectThread: vi.fn(),
  onNewThread: vi.fn(),
  activeThreadId: null,
  refreshTrigger: 0
}

describe('KAN-191: Delete All Chats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Delete All button visibility', () => {
    it('should show "Delete All" button when threads exist', async () => {
      const threads = [makeThread({ title: 'Thread 1' }), makeThread({ title: 'Thread 2' })]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })
    })

    it('should NOT show "Delete All" button when no threads exist', async () => {
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue([])

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByTitle('historySidebar.deleteAll')).not.toBeInTheDocument()
      })
    })

    it('should show "Delete All" button in the footer area', async () => {
      const threads = [makeThread()]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        const deleteAllBtn = screen.getByTitle('historySidebar.deleteAll')
        expect(deleteAllBtn).toBeInTheDocument()
      })
    })
  })

  describe('Confirmation dialog', () => {
    it('should use Electron native dialog.showMessage for Delete All confirmation', async () => {
      const threads = [makeThread(), makeThread()]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 0 })

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(window.electronAPI.dialog.showMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            buttons: expect.arrayContaining(['Cancel', expect.any(String)]),
            defaultId: 0,
            cancelId: 0
          })
        )
      })
    })

    it('should call history.clearAll when user confirms deletion', async () => {
      const threads = [makeThread(), makeThread(), makeThread()]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)
      // response: 1 means user clicked "Delete All" (second button)
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 1 })
      vi.mocked(window.electronAPI.history.clearAll).mockResolvedValue(true)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(window.electronAPI.history.clearAll).toHaveBeenCalled()
      })
    })

    it('should NOT call history.clearAll when user cancels', async () => {
      const threads = [makeThread()]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)
      // response: 0 means user clicked "Cancel" (first button)
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 0 })

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(window.electronAPI.dialog.showMessage).toHaveBeenCalled()
      })

      expect(window.electronAPI.history.clearAll).not.toHaveBeenCalled()
    })
  })

  describe('Post-deletion state', () => {
    it('should reload threads after successful clear all', async () => {
      const threads = [makeThread(), makeThread()]
      vi.mocked(window.electronAPI.history.getThreads)
        .mockResolvedValueOnce(threads)  // initial load
        .mockResolvedValueOnce([])       // after clear
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 1 })
      vi.mocked(window.electronAPI.history.clearAll).mockResolvedValue(true)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(window.electronAPI.history.getThreads).toHaveBeenCalledTimes(2)
      })
    })

    it('should show empty state after deleting all chats', async () => {
      const threads = [makeThread()]
      vi.mocked(window.electronAPI.history.getThreads)
        .mockResolvedValueOnce(threads)
        .mockResolvedValueOnce([])
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 1 })
      vi.mocked(window.electronAPI.history.clearAll).mockResolvedValue(true)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(screen.getByText('historySidebar.noHistory')).toBeInTheDocument()
      })
    })

    it('should update footer chat count to 0 after clear all', async () => {
      const threads = [makeThread(), makeThread(), makeThread()]
      vi.mocked(window.electronAPI.history.getThreads)
        .mockResolvedValueOnce(threads)
        .mockResolvedValueOnce([])
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 1 })
      vi.mocked(window.electronAPI.history.clearAll).mockResolvedValue(true)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/3/)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(screen.getByText(/0/)).toBeInTheDocument()
      })
    })
  })

  describe('Single-thread delete with Electron dialog', () => {
    it('should use Electron dialog.showMessage for single thread delete', async () => {
      const thread = makeThread({ title: 'My Chat' })
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue([thread])
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 0 })

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteChat')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteChat'))

      await waitFor(() => {
        expect(window.electronAPI.dialog.showMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            buttons: expect.arrayContaining(['Cancel', expect.any(String)])
          })
        )
      })
    })

    it('should delete single thread when confirmed via Electron dialog', async () => {
      const thread = makeThread({ title: 'Delete Me' })
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue([thread])
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 1 })
      vi.mocked(window.electronAPI.history.deleteThread).mockResolvedValue(true)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteChat')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteChat'))

      await waitFor(() => {
        expect(window.electronAPI.history.deleteThread).toHaveBeenCalledWith(thread.id)
      })
    })

    it('should NOT delete when user cancels single thread deletion', async () => {
      const thread = makeThread({ title: 'Keep Me' })
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue([thread])
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 0 })

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteChat')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteChat'))

      await waitFor(() => {
        expect(window.electronAPI.dialog.showMessage).toHaveBeenCalled()
      })

      expect(window.electronAPI.history.deleteThread).not.toHaveBeenCalled()
    })
  })

  describe('Pinned chats handling', () => {
    it('should include pinned chats in Delete All operation', async () => {
      const threads = [
        makeThread({ title: 'Pinned Chat', isPinned: true }),
        makeThread({ title: 'Regular Chat', isPinned: false })
      ]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 1 })
      vi.mocked(window.electronAPI.history.clearAll).mockResolvedValue(true)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(window.electronAPI.history.clearAll).toHaveBeenCalled()
      })
    })

    it('should mention pinned chats in confirmation dialog detail text', async () => {
      const threads = [
        makeThread({ title: 'Pinned', isPinned: true }),
        makeThread({ title: 'Normal' })
      ]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 0 })

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(window.electronAPI.dialog.showMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.stringContaining('pinned')
          })
        )
      })
    })
  })

  describe('Error handling', () => {
    it('should handle clearAll failure gracefully', async () => {
      const threads = [makeThread()]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)
      vi.mocked(window.electronAPI.dialog.showMessage).mockResolvedValue({ response: 1 })
      vi.mocked(window.electronAPI.history.clearAll).mockRejectedValue(new Error('Storage error'))

      const consoleSpy = vi.spyOn(console, 'error')

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[HistorySidebar]'),
          expect.any(Error)
        )
      })
    })

    it('should fall back to window.confirm if Electron dialog unavailable', async () => {
      const threads = [makeThread()]
      vi.mocked(window.electronAPI.history.getThreads).mockResolvedValue(threads)

      const originalShowMessage = window.electronAPI.dialog.showMessage
      ;(window.electronAPI.dialog as any).showMessage = undefined

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(<HistorySidebar {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTitle('historySidebar.deleteAll')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('historySidebar.deleteAll'))

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled()
      })

      ;(window.electronAPI.dialog as any).showMessage = originalShowMessage
      confirmSpy.mockRestore()
    })
  })

  describe('Component render', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(<HistorySidebar {...defaultProps} isOpen={false} />)
      expect(container.firstChild).toBeNull()
    })
  })
})
