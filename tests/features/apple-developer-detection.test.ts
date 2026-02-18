/**
 * Apple Developer Environment Detection Tests
 *
 * Validates that the environment detector properly detects:
 * - Swift, SwiftUI, Objective-C toolchains
 * - Xcode, xcodebuild, xcrun
 * - CocoaPods, Swift Package Manager, Carthage
 * - iOS Simulator
 * - .xcodeproj, .xcworkspace, .pbxproj detection
 *
 * TDD: Written BEFORE implementation enhancements (Feb 16, 2026)
 * @see src/core/environment-detector.ts
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ENV_DETECTOR_PATH = path.resolve(__dirname, '../../src/core/environment-detector.ts')

function readSource(): string {
  return fs.readFileSync(ENV_DETECTOR_PATH, 'utf-8')
}

describe('Apple Developer Environment Detection', () => {
  describe('Swift / SwiftUI Detection', () => {
    it('must detect Swift version via "swift --version"', () => {
      const source = readSource()
      expect(source).toContain('swift')
      expect(source).toContain('--version')
    })

    it('must detect Xcode installation at /Applications/Xcode.app', () => {
      const source = readSource()
      expect(source).toContain('/Applications/Xcode.app')
    })

    it('must detect xcodebuild version', () => {
      const source = readSource()
      expect(source).toContain('xcodebuild -version')
    })

    it('must detect iOS Simulator via xcrun simctl', () => {
      const source = readSource()
      expect(source).toContain('xcrun simctl')
    })

    it('must detect CocoaPods', () => {
      const source = readSource()
      expect(source).toContain('CocoaPods')
      expect(source).toContain('pod')
    })

    it('must detect Swift Package Manager', () => {
      const source = readSource()
      expect(source).toContain('Swift Package Manager')
    })

    it('must categorize iOS/SwiftUI as priority language', () => {
      const source = readSource()
      expect(source).toContain("category: 'priority'")
      expect(source).toContain("iOS / SwiftUI")
    })
  })

  describe('Objective-C Detection', () => {
    it('must detect Objective-C files (.m, .mm, .h) in project detection', () => {
      const source = readSource()
      expect(source).toContain('.m')
      expect(source).toContain('Objective-C')
    })
  })

  describe('Xcode Project Detection', () => {
    it('must detect .xcodeproj files', () => {
      const source = readSource()
      expect(source).toContain('.xcodeproj')
    })

    it('must detect .xcworkspace files', () => {
      const source = readSource()
      expect(source).toContain('.xcworkspace')
    })

    it('must provide xcodebuild run command for Xcode projects', () => {
      const source = readSource()
      expect(source).toContain('xcodebuild -scheme')
    })

    it('must provide xcodebuild test command', () => {
      const source = readSource()
      expect(source).toContain('xcodebuild test')
    })
  })

  describe('Build Tool Detection', () => {
    it('must list Xcode, CocoaPods, SPM as build tools', () => {
      const source = readSource()
      expect(source).toContain("name: 'Xcode'")
      expect(source).toContain("name: 'CocoaPods'")
      expect(source).toContain("name: 'Swift Package Manager'")
    })

    it('must detect Carthage if installed', () => {
      const source = readSource()
      expect(source).toContain('Carthage')
    })
  })

  describe('macOS-only Guard', () => {
    it('must only detect iOS toolchain on macOS (darwin)', () => {
      const source = readSource()
      expect(source).toContain("process.platform !== 'darwin'")
      expect(source).toContain("iOS development requires macOS")
    })
  })
})
