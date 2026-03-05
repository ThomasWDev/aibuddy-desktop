/**
 * Skill Tool Runner — KAN-289, KAN-290
 *
 * Executes tool actions on behalf of skills with permission checks.
 * Supports filesystem, terminal, git, aws_cli, and docker tools.
 * All tool execution requires the skill to have the tool in its allowed_tools.
 *
 * Security model:
 * - Skills must declare allowed_tools at creation time
 * - Each execution is checked against the skill's permissions
 * - Stored permission preferences (always_allow/always_deny/ask) are checked first
 * - User confirmation is handled by the renderer (UI layer) when preference is 'ask'
 * - Workspace scoping prevents access outside the project directory
 * - All decisions are recorded in the audit log
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type { SkillToolPermission, ToolExecutionRequest, ToolExecutionResult, PermissionLevel } from './types'

const MAX_OUTPUT_LENGTH = 50_000

/** Validate that a skill has permission to use a tool */
export function checkToolPermission(
  allowedTools: SkillToolPermission[] | undefined,
  requestedTool: SkillToolPermission
): { allowed: boolean; reason: string } {
  if (!allowedTools || allowedTools.length === 0) {
    return { allowed: false, reason: 'Skill has no tool permissions declared' }
  }
  if (!allowedTools.includes(requestedTool)) {
    return { allowed: false, reason: `Skill not authorized for "${requestedTool}" tool` }
  }
  return { allowed: true, reason: 'permitted' }
}

/**
 * Check stored permission preference for a skill+tool pair.
 * Returns whether execution should proceed, be denied, or needs user confirmation.
 */
export function checkStoredPermission(
  storedLevel: PermissionLevel
): { action: 'allow' | 'deny' | 'ask'; reason: string } {
  switch (storedLevel) {
    case 'always_allow':
      return { action: 'allow', reason: 'auto-approved (always allow)' }
    case 'always_deny':
      return { action: 'deny', reason: 'auto-denied (always deny)' }
    case 'ask':
    default:
      return { action: 'ask', reason: 'user confirmation required' }
  }
}

/** Build a human-readable description of what a tool execution will do */
export function describeToolAction(
  tool: SkillToolPermission,
  action: string,
  params: Record<string, string>
): string {
  switch (tool) {
    case 'filesystem':
      return `Read ${action === 'list_directory' ? 'directory listing' : 'file'}: ${params.path || '.'}`
    case 'terminal':
      return `Execute command: ${params.command || '(unknown)'}`
    case 'git':
      return `Git ${action}${params.staged === 'true' ? ' (staged)' : ''}`
    case 'aws_cli':
      return `AWS CLI: ${params.command || '(unknown)'}`
    case 'docker':
      return action === 'execute' ? `Docker: ${params.command || '(unknown)'}` : `Docker ${action}`
    default:
      return `${tool}: ${action}`
  }
}

/** Validate that a path is within the workspace (prevents directory traversal) */
export function validateWorkspacePath(workspacePath: string, targetPath: string): boolean {
  const resolved = path.resolve(workspacePath, targetPath)
  return resolved.startsWith(path.resolve(workspacePath))
}

/** Get the list of supported tool actions for each tool type */
export function getSupportedActions(tool: SkillToolPermission): string[] {
  switch (tool) {
    case 'filesystem':
      return ['read_file', 'list_directory', 'file_exists', 'file_stats']
    case 'terminal':
      return ['execute']
    case 'git':
      return ['status', 'diff', 'log', 'branch']
    case 'aws_cli':
      return ['execute']
    case 'docker':
      return ['ps', 'images', 'execute']
    default:
      return []
  }
}

/** Get all supported tool types */
export function getAllToolTypes(): SkillToolPermission[] {
  return ['filesystem', 'terminal', 'git', 'aws_cli', 'docker']
}

/** Human-readable label for a tool type */
export function getToolLabel(tool: SkillToolPermission): string {
  const labels: Record<SkillToolPermission, string> = {
    filesystem: 'Filesystem (read files, list directories)',
    terminal: 'Terminal (execute shell commands)',
    git: 'Git (status, diff, log, branch)',
    aws_cli: 'AWS CLI (cloud operations)',
    docker: 'Docker (container management)',
  }
  return labels[tool] || tool
}

/** Execute a tool request */
export function executeToolRequest(
  request: ToolExecutionRequest,
  allowedTools: SkillToolPermission[] | undefined,
  workspacePath: string
): ToolExecutionResult {
  const start = performance.now()

  const permCheck = checkToolPermission(allowedTools, request.tool)
  if (!permCheck.allowed) {
    return {
      success: false,
      output: '',
      error: permCheck.reason,
      tool: request.tool,
      action: request.action,
      durationMs: Math.round(performance.now() - start),
    }
  }

  const supported = getSupportedActions(request.tool)
  if (!supported.includes(request.action)) {
    return {
      success: false,
      output: '',
      error: `Unsupported action "${request.action}" for tool "${request.tool}". Supported: ${supported.join(', ')}`,
      tool: request.tool,
      action: request.action,
      durationMs: Math.round(performance.now() - start),
    }
  }

  try {
    let output = ''

    switch (request.tool) {
      case 'filesystem':
        output = executeFilesystemAction(request.action, request.params, workspacePath)
        break
      case 'terminal':
        output = executeTerminalAction(request.action, request.params, workspacePath)
        break
      case 'git':
        output = executeGitAction(request.action, request.params, workspacePath)
        break
      case 'aws_cli':
        output = executeAwsAction(request.action, request.params, workspacePath)
        break
      case 'docker':
        output = executeDockerAction(request.action, request.params, workspacePath)
        break
    }

    if (output.length > MAX_OUTPUT_LENGTH) {
      output = output.substring(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)'
    }

    return {
      success: true,
      output,
      tool: request.tool,
      action: request.action,
      durationMs: Math.round(performance.now() - start),
    }
  } catch (err: any) {
    return {
      success: false,
      output: '',
      error: err?.message || 'Unknown error',
      tool: request.tool,
      action: request.action,
      durationMs: Math.round(performance.now() - start),
    }
  }
}

// ─── Tool Implementations ─────────────────────────────────────────────────────

function executeFilesystemAction(action: string, params: Record<string, string>, workspacePath: string): string {
  const target = params.path || '.'
  if (!validateWorkspacePath(workspacePath, target)) {
    throw new Error('Path traversal denied: path is outside workspace')
  }
  const fullPath = path.resolve(workspacePath, target)

  switch (action) {
    case 'read_file':
      return fs.readFileSync(fullPath, 'utf-8')
    case 'list_directory':
      return fs.readdirSync(fullPath).join('\n')
    case 'file_exists':
      return fs.existsSync(fullPath) ? 'true' : 'false'
    case 'file_stats': {
      const stat = fs.statSync(fullPath)
      return JSON.stringify({ size: stat.size, isDirectory: stat.isDirectory(), mtime: stat.mtime.toISOString() })
    }
    default:
      throw new Error(`Unknown filesystem action: ${action}`)
  }
}

function executeTerminalAction(action: string, params: Record<string, string>, workspacePath: string): string {
  if (action !== 'execute') throw new Error(`Unknown terminal action: ${action}`)
  const command = params.command
  if (!command) throw new Error('Missing "command" parameter')
  const result = execSync(command, { cwd: workspacePath, timeout: 30_000, encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 })
  return result
}

function executeGitAction(action: string, params: Record<string, string>, workspacePath: string): string {
  const gitCmd = (args: string) => execSync(`git ${args}`, { cwd: workspacePath, timeout: 15_000, encoding: 'utf-8' })
  switch (action) {
    case 'status': return gitCmd('status --porcelain')
    case 'diff': return gitCmd(params.staged === 'true' ? 'diff --staged' : 'diff')
    case 'log': return gitCmd(`log --oneline -${params.count || '10'}`)
    case 'branch': return gitCmd('branch -a')
    default: throw new Error(`Unknown git action: ${action}`)
  }
}

function executeAwsAction(action: string, params: Record<string, string>, workspacePath: string): string {
  if (action !== 'execute') throw new Error(`Unknown aws_cli action: ${action}`)
  const command = params.command
  if (!command) throw new Error('Missing "command" parameter')
  if (!command.startsWith('aws ')) throw new Error('Command must start with "aws"')
  return execSync(command, { cwd: workspacePath, timeout: 30_000, encoding: 'utf-8' })
}

function executeDockerAction(action: string, params: Record<string, string>, workspacePath: string): string {
  switch (action) {
    case 'ps': return execSync('docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"', { cwd: workspacePath, timeout: 15_000, encoding: 'utf-8' })
    case 'images': return execSync('docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"', { cwd: workspacePath, timeout: 15_000, encoding: 'utf-8' })
    case 'execute': {
      const command = params.command
      if (!command) throw new Error('Missing "command" parameter')
      if (!command.startsWith('docker ')) throw new Error('Command must start with "docker"')
      return execSync(command, { cwd: workspacePath, timeout: 30_000, encoding: 'utf-8' })
    }
    default: throw new Error(`Unknown docker action: ${action}`)
  }
}
