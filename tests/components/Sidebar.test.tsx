import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../../renderer/src/components/layout/Sidebar'

describe('Sidebar', () => {
  const mockOnFileSelect = vi.fn()
  const mockOnRefresh = vi.fn()
  const workspacePath = '/test/workspace'
  const fileTree = [
    {
      name: 'src',
      path: '/test/workspace/src',
      isDirectory: true,
      isFile: false,
      children: [
        {
          name: 'index.ts',
          path: '/test/workspace/src/index.ts',
          isDirectory: false,
          isFile: true
        },
        {
          name: 'App.tsx',
          path: '/test/workspace/src/App.tsx',
          isDirectory: false,
          isFile: true
        }
      ]
    },
    {
      name: 'package.json',
      path: '/test/workspace/package.json',
      isDirectory: false,
      isFile: true
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render Explorer header when activeView is explorer', () => {
    render(
      <Sidebar
        activeView="explorer"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    // Look for the header text which includes emoji
    expect(screen.getByText(/📁 Explorer/i)).toBeInTheDocument()
  })

  it('should render Search header when activeView is search', () => {
    render(
      <Sidebar
        activeView="search"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/🔍 Search/i)).toBeInTheDocument()
  })

  it('should render Source Control header when activeView is git', () => {
    render(
      <Sidebar
        activeView="git"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/🌿 Source Control/i)).toBeInTheDocument()
  })

  it('should render Extensions header when activeView is extensions', () => {
    render(
      <Sidebar
        activeView="extensions"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText(/🧩 Extensions/i)).toBeInTheDocument()
  })

  it('should render workspace name', () => {
    render(
      <Sidebar
        activeView="explorer"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText('workspace')).toBeInTheDocument()
  })

  it('should render file tree items', () => {
    render(
      <Sidebar
        activeView="explorer"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('package.json')).toBeInTheDocument()
  })

  it('should call onFileSelect when a file is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <Sidebar
        activeView="explorer"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    const packageJson = screen.getByText('package.json')
    await user.click(packageJson)

    expect(mockOnFileSelect).toHaveBeenCalledWith('/test/workspace/package.json')
  })

  it('should call onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <Sidebar
        activeView="explorer"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    const refreshButton = screen.getByTitle('Refresh')
    await user.click(refreshButton)

    expect(mockOnRefresh).toHaveBeenCalled()
  })

  it('should render search input when activeView is search', () => {
    render(
      <Sidebar
        activeView="search"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    // Search input has emoji in placeholder
    expect(screen.getByPlaceholderText(/🔍 Search files/i)).toBeInTheDocument()
  })

  it('should expand folder when clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <Sidebar
        activeView="explorer"
        workspacePath={workspacePath}
        fileTree={fileTree}
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    // src folder should be expanded by default (depth < 2)
    expect(screen.getByText('index.ts')).toBeInTheDocument()
    expect(screen.getByText('App.tsx')).toBeInTheDocument()
  })
})

