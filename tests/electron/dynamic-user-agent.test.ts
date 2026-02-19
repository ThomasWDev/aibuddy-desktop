import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Dynamic User-Agent Regression Guard
 * 
 * ROOT CAUSE (Feb 17, 2026): User-Agent was hardcoded as 'AIBuddy-Desktop/1.4.29'
 * in App.tsx, even though package.json was v1.5.59. This caused server-side
 * analytics to report incorrect version and could break API version gates.
 * 
 * FIX: Replaced with dynamic `AIBuddy-Desktop/${appVersion || '<fallback>'}`
 * 
 * PREVENTION: These tests ensure User-Agent is never hardcoded again.
 */

const appTsxPath = path.resolve(__dirname, '../../renderer/src/App.tsx')
const packageJsonPath = path.resolve(__dirname, '../../package.json')
const appTsx = fs.readFileSync(appTsxPath, 'utf-8')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

describe('Dynamic User-Agent — No Hardcoded Versions', () => {

  it('should NOT have hardcoded AIBuddy-Desktop/1.4.x in User-Agent', () => {
    expect(appTsx).not.toMatch(/['"]AIBuddy-Desktop\/1\.4\.\d+['"]/)
  })

  it('should NOT have hardcoded AIBuddy-Desktop/1.3.x in User-Agent', () => {
    expect(appTsx).not.toMatch(/['"]AIBuddy-Desktop\/1\.3\.\d+['"]/)
  })

  it('should NOT have any static AIBuddy-Desktop/X.Y.Z User-Agent string', () => {
    // Find all User-Agent headers with hardcoded versions
    const hardcodedPattern = /['"]User-Agent['"]\s*:\s*['"]AIBuddy-Desktop\/\d+\.\d+\.\d+['"]/g
    const matches = appTsx.match(hardcodedPattern) || []
    expect(matches).toHaveLength(0)
  })

  it('should use template literal with appVersion for User-Agent', () => {
    // The correct pattern uses a template literal with the appVersion variable
    expect(appTsx).toMatch(/`AIBuddy-Desktop\/\$\{appVersion/)
  })

  it('should have a fallback version in the User-Agent template', () => {
    // Ensure there's a fallback (|| 'x.y.z') in the template
    expect(appTsx).toMatch(/\$\{appVersion\s*\|\|\s*['"]/)
  })

  it('package.json version should be >= 1.5.59', () => {
    const [major, minor, patch] = packageJson.version.split('.').map(Number)
    const versionNum = major * 10000 + minor * 100 + patch
    expect(versionNum).toBeGreaterThanOrEqual(10559) // 1.5.59
  })

  it('should fetch version from Electron IPC app:getVersion', () => {
    // App.tsx should call the IPC handler for version
    expect(appTsx).toContain('app:getVersion')
  })

  it('should have appVersion state variable', () => {
    expect(appTsx).toMatch(/\bappVersion\b/)
  })
})

describe('User-Agent Fallback Version Match', () => {
  it('User-Agent fallback should use "unknown" (no hardcoded version)', () => {
    const unknownFallback = appTsx.match(/\$\{appVersion\s*\|\|\s*['"]unknown['"]/)
    expect(unknownFallback).not.toBeNull()
  })

  it('User-Agent fallback must NOT contain a hardcoded numeric version', () => {
    const hardcoded = appTsx.match(/\$\{appVersion\s*\|\|\s*['"](\d+\.\d+\.\d+)['"]/)
    expect(hardcoded).toBeNull()
  })
})

describe('API URL Configuration — Not Hardcoded', () => {
  it('should import API URL from constants', () => {
    // API URL should come from a constants/urls import, not be hardcoded inline
    const hasApiUrlImport = appTsx.includes('AIBUDDY_API_INFERENCE_URL') || 
                             appTsx.includes('API_URL') ||
                             appTsx.includes('from') && appTsx.includes('urls')
    expect(hasApiUrlImport).toBe(true)
  })

  it('should use AIBUDDY_API_INFERENCE_URL constant for fetch calls', () => {
    expect(appTsx).toContain('AIBUDDY_API_INFERENCE_URL')
  })

  it('should not have localhost API URLs in production fetch calls', () => {
    const lines = appTsx.split('\n')
    const apiUrlLines = lines.filter(l => 
      l.includes('fetch(') && l.includes('localhost')
    )
    expect(apiUrlLines).toHaveLength(0)
  })
})
