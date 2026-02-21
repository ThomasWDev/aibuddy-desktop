/**
 * AI Agent Adapter
 * 
 * This module adapts the AIBuddy extension's AI agent to work in the Electron desktop app.
 * It provides the same interface but uses Electron IPC instead of VS Code APIs.
 */

import { EventEmitter } from 'events'
import path from 'path'
import { vscode } from '../adapters/vscode-shim'
import { terminalManager, ExecutionResult } from '../adapters/terminal-adapter'

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null

// ============================================================================
// Types
// ============================================================================

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | MessageContent[]
}

export interface MessageContent {
  type: 'text' | 'image' | 'tool_use' | 'tool_result'
  text?: string
  source?: { type: string; media_type: string; data: string }
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: string
}

export interface ToolUse {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface AgentConfig {
  apiKey?: string
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  workspacePath?: string
}

export interface AgentState {
  isRunning: boolean
  currentTask?: string
  messages: AgentMessage[]
  tokensUsed: number
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const AVAILABLE_TOOLS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path to the file to read' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_to_file',
    description: 'Write content to a file at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path to the file to write' },
        content: { type: 'string', description: 'The content to write to the file' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_files',
    description: 'List files and directories at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path to list files from' },
        recursive: { type: 'boolean', description: 'Whether to list recursively' }
      },
      required: ['path']
    }
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command in the terminal',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The command to execute' },
        cwd: { type: 'string', description: 'Working directory for the command' }
      },
      required: ['command']
    }
  },
  {
    name: 'search_files',
    description: 'Search for files matching a pattern',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'The search pattern (glob or regex)' },
        path: { type: 'string', description: 'The directory to search in' }
      },
      required: ['pattern']
    }
  },
  {
    name: 'ask_followup_question',
    description: 'Ask the user a follow-up question for clarification',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to ask the user' }
      },
      required: ['question']
    }
  },
  {
    name: 'attempt_completion',
    description: 'Indicate that the task is complete and provide a summary',
    input_schema: {
      type: 'object',
      properties: {
        result: { type: 'string', description: 'Summary of what was accomplished' },
        command: { type: 'string', description: 'Optional command for the user to run' }
      },
      required: ['result']
    }
  }
]

// ============================================================================
// Tool Executor
// ============================================================================

export class ToolExecutor {
  private workspacePath: string

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath
  }

  async execute(toolUse: ToolUse): Promise<string> {
    const { name, input } = toolUse

    try {
      switch (name) {
        case 'read_file':
          return await this.readFile(input.path as string)
        
        case 'write_to_file':
          return await this.writeFile(input.path as string, input.content as string)
        
        case 'list_files':
          return await this.listFiles(input.path as string, input.recursive as boolean)
        
        case 'execute_command':
          return await this.executeCommand(input.command as string, input.cwd as string)
        
        case 'search_files':
          return await this.searchFiles(input.pattern as string, input.path as string)
        
        case 'ask_followup_question':
          return `[FOLLOWUP_QUESTION]: ${input.question}`
        
        case 'attempt_completion':
          return `[TASK_COMPLETE]: ${input.result}${input.command ? `\n\nSuggested command: ${input.command}` : ''}`
        
        default:
          return `Unknown tool: ${name}`
      }
    } catch (error) {
      return `[ERROR] Failed to execute ${name}: ${(error as Error).message}`
    }
  }

  private enforceWorkspaceBoundary(fullPath: string): void {
    if (this.workspacePath && !path.normalize(fullPath).startsWith(path.normalize(this.workspacePath))) {
      throw new Error(`[ERROR] Path "${fullPath}" is outside the current workspace "${this.workspacePath}". Please use the Open Folder button to load the target directory first.`)
    }
  }

  private async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath)
    this.enforceWorkspaceBoundary(fullPath)
    
    if (electronAPI) {
      const content = await electronAPI.fs.readFile(fullPath, 'utf-8')
      return content
    }
    
    throw new Error('File system not available')
  }

  private async writeFile(filePath: string, content: string): Promise<string> {
    const fullPath = this.resolvePath(filePath)
    this.enforceWorkspaceBoundary(fullPath)
    
    if (electronAPI) {
      await electronAPI.fs.writeFile(fullPath, content)
      const exists = await electronAPI.fs.exists(fullPath)
      if (!exists) {
        throw new Error(`[ERROR] File write failed to verify — file does not exist at: ${fullPath}. Check folder permissions or macOS sandbox restrictions.`)
      }
      return `Successfully wrote to ${filePath}`
    }
    
    throw new Error('File system not available')
  }

  private async listFiles(filePath: string, recursive = false): Promise<string> {
    const fullPath = this.resolvePath(filePath)
    this.enforceWorkspaceBoundary(fullPath)
    
    if (electronAPI) {
      if (recursive) {
        const tree = await electronAPI.fs.readTree?.(fullPath, 3) || []
        return this.formatTree(tree)
      } else {
        const entries = await electronAPI.fs.readDir(fullPath)
        return entries.map((e: any) => `${e.isDirectory ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n')
      }
    }
    
    throw new Error('File system not available')
  }

  private formatTree(nodes: any[], indent = ''): string {
    let result = ''
    for (const node of nodes) {
      result += `${indent}${node.isDirectory ? '📁' : '📄'} ${node.name}\n`
      if (node.children) {
        result += this.formatTree(node.children, indent + '  ')
      }
    }
    return result
  }

  private async executeCommand(command: string, cwd?: string): Promise<string> {
    const workingDir = cwd ? this.resolvePath(cwd) : this.workspacePath
    if (workingDir) this.enforceWorkspaceBoundary(workingDir)
    
    const result = await terminalManager.executeCommand(command, {
      cwd: workingDir,
      timeout: 60000
    })

    return `Exit code: ${result.exitCode}\n\nOutput:\n${result.output}`
  }

  private async searchFiles(pattern: string, filePath?: string): Promise<string> {
    const searchPath = filePath ? this.resolvePath(filePath) : this.workspacePath
    if (searchPath) this.enforceWorkspaceBoundary(searchPath)
    
    if (electronAPI) {
      const tree = await electronAPI.fs.readTree?.(searchPath, 5) || []
      const matches = this.findMatches(tree, pattern)
      return matches.length > 0 
        ? `Found ${matches.length} matches:\n${matches.join('\n')}`
        : 'No matches found'
    }
    
    throw new Error('File system not available')
  }

  private findMatches(nodes: any[], pattern: string, results: string[] = []): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i')
    
    for (const node of nodes) {
      if (regex.test(node.name)) {
        results.push(node.path)
      }
      if (node.children) {
        this.findMatches(node.children, pattern, results)
      }
    }
    
    return results
  }

  private resolvePath(filePath: string): string {
    if (filePath.startsWith('/') || filePath.startsWith('~')) {
      return filePath
    }
    // KAN-45: Reject empty workspacePath — prevents writing to invalid locations
    if (!this.workspacePath) {
      throw new Error('[ERROR] Workspace path not set. Please open a folder first before creating files.')
    }
    return path.join(this.workspacePath, filePath)
  }
}

// ============================================================================
// AI Agent
// ============================================================================

export class AIAgent extends EventEmitter {
  private config: AgentConfig
  private state: AgentState
  private toolExecutor: ToolExecutor
  private abortController: AbortController | null = null

  constructor(config: AgentConfig) {
    super()
    this.config = config
    this.state = {
      isRunning: false,
      messages: [],
      tokensUsed: 0
    }
    this.toolExecutor = new ToolExecutor(config.workspacePath || '')
  }

  /**
   * Start a new task
   */
  async startTask(task: string, images?: string[]): Promise<void> {
    if (this.state.isRunning) {
      throw new Error('Agent is already running a task')
    }

    this.state.isRunning = true
    this.state.currentTask = task
    this.abortController = new AbortController()

    // Create user message
    const userContent: MessageContent[] = [{ type: 'text', text: task }]
    
    if (images && images.length > 0) {
      for (const image of images) {
        const [header, data] = image.split(',')
        const mediaType = header.split(':')[1]?.split(';')[0] || 'image/png'
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data }
        })
      }
    }

    this.state.messages.push({
      role: 'user',
      content: userContent
    })

    this.emit('taskStarted', { task })

    try {
      await this.runAgentLoop()
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.emit('taskAborted')
      } else {
        this.emit('error', error)
      }
    } finally {
      this.state.isRunning = false
      this.abortController = null
    }
  }

  /**
   * Abort the current task
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  /**
   * Send a follow-up message
   */
  async sendMessage(message: string): Promise<void> {
    if (!this.state.isRunning) {
      // Start a new task
      await this.startTask(message)
    } else {
      // Add to conversation
      this.state.messages.push({
        role: 'user',
        content: message
      })
      await this.runAgentLoop()
    }
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return { ...this.state }
  }

  /**
   * Main agent loop
   */
  private async runAgentLoop(): Promise<void> {
    let continueLoop = true
    let iterations = 0
    const maxIterations = 50

    while (continueLoop && iterations < maxIterations) {
      iterations++

      // Check for abort
      if (this.abortController?.signal.aborted) {
        throw new Error('AbortError')
      }

      // Call the AI API
      const response = await this.callAPI()

      // Process the response
      const { message, toolUses, isComplete } = this.parseResponse(response)

      // Add assistant message
      this.state.messages.push({
        role: 'assistant',
        content: response.content
      })

      // Emit message event
      this.emit('message', { role: 'assistant', content: message })

      // If there are tool uses, execute them
      if (toolUses.length > 0) {
        for (const toolUse of toolUses) {
          this.emit('toolUse', toolUse)

          const result = await this.toolExecutor.execute(toolUse)

          // Check for special results
          if (result.startsWith('[FOLLOWUP_QUESTION]:')) {
            this.emit('followupQuestion', result.replace('[FOLLOWUP_QUESTION]: ', ''))
            continueLoop = false
            break
          }

          if (result.startsWith('[TASK_COMPLETE]:')) {
            this.emit('taskComplete', result.replace('[TASK_COMPLETE]: ', ''))
            continueLoop = false
            break
          }

          // Add tool result to messages
          this.state.messages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result
            }]
          })

          this.emit('toolResult', { toolUse, result })
        }
      } else if (isComplete) {
        continueLoop = false
      }
    }

    if (iterations >= maxIterations) {
      this.emit('maxIterationsReached')
    }
  }

  /**
   * Call the AI API
   */
  private async callAPI(): Promise<any> {
    const apiKey = this.config.apiKey || await this.getStoredApiKey()
    
    if (!apiKey) {
      throw new Error('API key not configured')
    }

    const systemPrompt = this.config.systemPrompt || this.getDefaultSystemPrompt()

    // KAN-54: Sliding window — limit conversation tokens sent to API
    const MAX_AGENT_CONTEXT_TOKENS = 40_000
    let agentMessages = this.state.messages.map(m => ({
      role: m.role,
      content: m.content
    }))
    const estimateChars = (msg: any) => typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length
    let totalChars = agentMessages.reduce((sum, m) => sum + estimateChars(m), 0) + systemPrompt.length
    while (Math.ceil(totalChars / 3.5) > MAX_AGENT_CONTEXT_TOKENS && agentMessages.length > 2) {
      totalChars -= estimateChars(agentMessages[0])
      agentMessages = agentMessages.slice(1)
    }

    const requestBody = {
      model: this.config.model || 'claude-opus-4-20250514',
      max_tokens: this.config.maxTokens || 8192,
      temperature: this.config.temperature || 0.7,
      system: systemPrompt,
      tools: AVAILABLE_TOOLS,
      messages: agentMessages
    }

    // Use AIBuddy API endpoint
    const response = await fetch('https://api.aibuddy.life/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: this.abortController?.signal
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${error}`)
    }

    const data = await response.json()
    
    // Update token usage
    if (data.usage) {
      this.state.tokensUsed += (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
    }

    return data
  }

  /**
   * Parse API response
   */
  private parseResponse(response: any): { message: string; toolUses: ToolUse[]; isComplete: boolean } {
    const content = response.content || []
    let message = ''
    const toolUses: ToolUse[] = []
    let isComplete = response.stop_reason === 'end_turn'

    for (const block of content) {
      if (block.type === 'text') {
        message += block.text
      } else if (block.type === 'tool_use') {
        toolUses.push({
          id: block.id,
          name: block.name,
          input: block.input
        })
      }
    }

    return { message, toolUses, isComplete }
  }

  /**
   * Get stored API key
   */
  private async getStoredApiKey(): Promise<string | undefined> {
    if (electronAPI) {
      return electronAPI.store.get('apiKey')
    }
    return undefined
  }

  /**
   * Get default system prompt
   */
  private getDefaultSystemPrompt(): string {
    return `You are AIBuddy, an intelligent coding assistant powered by AIBuddy. You help developers write, debug, and improve their code.

You have access to the following tools:
- read_file: Read file contents
- write_to_file: Write content to files
- list_files: List directory contents
- execute_command: Run shell commands
- search_files: Search for files
- ask_followup_question: Ask for clarification
- attempt_completion: Mark task as complete

Guidelines:
1. Always read relevant files before making changes
2. Explain your reasoning before taking actions
3. Use tools efficiently - batch operations when possible
4. Ask for clarification if the task is ambiguous
5. Test changes when appropriate
6. Provide clear summaries of what you've done

Current workspace: ${this.config.workspacePath || 'Not set'}

IMPORTANT — Workspace Boundaries:
- You can ONLY access files within the current workspace directory shown above.
- If a workspace path is "Not set", tell the user to open a folder first using the "Open Folder" button.
- If the user asks you to review or modify files outside the current workspace, tell them: "The folder you mentioned is outside the currently loaded workspace. Please use the Open Folder button to load that directory first, then ask me again."
- Do NOT try to access paths outside the workspace — those operations will fail.
- Relative paths are resolved relative to the workspace root.`
  }
}

// ============================================================================
// Factory function
// ============================================================================

export function createAgent(config: AgentConfig): AIAgent {
  return new AIAgent(config)
}

