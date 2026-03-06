import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.join(__dirname, '..', '..')
const sidebarSrc = fs.readFileSync(
  path.join(ROOT, 'renderer/src/components/HistorySidebar.tsx'),
  'utf-8'
)

describe('KAN-299: Desktop HistorySidebar — button click targets', () => {

  describe('action buttons meet minimum 28px click target', () => {
    it('pin button must use p-1.5 padding (not p-1)', () => {
      const pinJsx = sidebarSrc.indexOf('handleTogglePin(thread.id')
      expect(pinJsx).toBeGreaterThan(-1)
      const pinArea = sidebarSrc.slice(pinJsx, sidebarSrc.indexOf('</button>', pinJsx))
      expect(pinArea).toContain('p-1.5')
    })

    it('edit button must use p-1.5 padding (not p-1)', () => {
      const editArea = sidebarSrc.slice(
        sidebarSrc.indexOf('startEditing(thread'),
        sidebarSrc.indexOf('</button>', sidebarSrc.indexOf('startEditing(thread'))
      )
      expect(editArea).toContain('p-1.5')
    })

    it('delete button must use p-1.5 padding (not p-1)', () => {
      const deleteArea = sidebarSrc.slice(
        sidebarSrc.indexOf('handleDelete(thread.id'),
        sidebarSrc.indexOf('</button>', sidebarSrc.indexOf('handleDelete(thread.id'))
      )
      expect(deleteArea).toContain('p-1.5')
    })
  })

  describe('icons are 16px (w-4 h-4) minimum', () => {
    it('Star icon in pin action button must be w-4 h-4', () => {
      const pinBtnIdx = sidebarSrc.indexOf('handleTogglePin(thread.id')
      expect(pinBtnIdx).toBeGreaterThan(-1)
      const starIdx = sidebarSrc.indexOf('<Star', pinBtnIdx)
      const starTag = sidebarSrc.slice(starIdx, sidebarSrc.indexOf('/>', starIdx) + 2)
      expect(starTag).toContain('w-4 h-4')
    })

    it('Edit2 icon must be w-4 h-4', () => {
      const editArea = sidebarSrc.slice(
        sidebarSrc.indexOf('startEditing(thread'),
        sidebarSrc.indexOf('</button>', sidebarSrc.indexOf('startEditing(thread'))
      )
      expect(editArea).toMatch(/w-4\s+h-4|h-4\s+w-4/)
    })

    it('Trash2 icon in thread row must be w-4 h-4', () => {
      const deleteArea = sidebarSrc.slice(
        sidebarSrc.indexOf('handleDelete(thread.id'),
        sidebarSrc.indexOf('</button>', sidebarSrc.indexOf('handleDelete(thread.id'))
      )
      expect(deleteArea).toMatch(/w-4\s+h-4|h-4\s+w-4/)
    })
  })

  describe('all action buttons have hover background feedback', () => {
    it('pin button has hover:bg-', () => {
      const pinJsx = sidebarSrc.indexOf('handleTogglePin(thread.id')
      expect(pinJsx).toBeGreaterThan(-1)
      const pinArea = sidebarSrc.slice(pinJsx, sidebarSrc.indexOf('</button>', pinJsx))
      expect(pinArea).toMatch(/hover:bg-/)
    })

    it('edit button has hover:bg-', () => {
      const editArea = sidebarSrc.slice(
        sidebarSrc.indexOf('startEditing(thread'),
        sidebarSrc.indexOf('</button>', sidebarSrc.indexOf('startEditing(thread'))
      )
      expect(editArea).toMatch(/hover:bg-/)
    })

    it('delete button has hover:bg-', () => {
      const deleteArea = sidebarSrc.slice(
        sidebarSrc.indexOf('handleDelete(thread.id'),
        sidebarSrc.indexOf('</button>', sidebarSrc.indexOf('handleDelete(thread.id'))
      )
      expect(deleteArea).toMatch(/hover:bg-/)
    })
  })

  describe('buttons use rounded-md for consistent styling', () => {
    it('all action buttons use rounded-md', () => {
      const actionArea = sidebarSrc.slice(
        sidebarSrc.indexOf('handleTogglePin'),
        sidebarSrc.indexOf('</div>', sidebarSrc.indexOf('handleDelete(thread.id') + 30)
      )
      const roundedCount = (actionArea.match(/rounded-md/g) || []).length
      expect(roundedCount).toBeGreaterThanOrEqual(3)
    })
  })
})
