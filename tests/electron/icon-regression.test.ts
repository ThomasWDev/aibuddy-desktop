import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

/**
 * Icon Regression Guard
 * 
 * ROOT CAUSE (Feb 17, 2026): The VS Code Marketplace showed the old Kodu robot
 * icon because extension/assets/icon.png was never replaced when the project
 * was forked from kodu-ai/claude-coder. The file had been there since the
 * initial fork with "Kodu" written on the robot body.
 * 
 * FIX: Replaced icon.png with the proper AIBuddy logo (robot + human handshake,
 * pink/purple gradient) sourced from aibuddy-desktop/build/icons/icon.png.
 * 
 * PREVENTION: These tests ensure the icon is not the old Kodu robot.
 */

const extensionIconPath = path.resolve(__dirname, '../../../extension/assets/icon.png')
const extensionPkgPath = path.resolve(__dirname, '../../../extension/package.json')
const desktopIconPath = path.resolve(__dirname, '../../build/icons/icon.png')

// SHA256 of the OLD Kodu robot icon (must never appear again)
const KODU_ICON_HASH = '9484ee99bceef3c37db13f7089f3a73a4d40324a5c9cf125358db99563aad940'

describe('Extension Icon — No Kodu Regression', () => {
  it('extension/assets/icon.png should exist', () => {
    expect(fs.existsSync(extensionIconPath)).toBe(true)
  })

  it('icon.png should be a valid PNG file', () => {
    const buffer = fs.readFileSync(extensionIconPath)
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(buffer.subarray(0, 8).equals(pngMagic)).toBe(true)
  })

  it('icon.png should NOT be the old Kodu robot icon', () => {
    const buffer = fs.readFileSync(extensionIconPath)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    expect(hash).not.toBe(KODU_ICON_HASH)
  })

  it('icon.png should be at least 128x128 (min marketplace size)', () => {
    const buffer = fs.readFileSync(extensionIconPath)
    // PNG IHDR chunk starts at byte 16, width at 16-19, height at 20-23
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    expect(width).toBeGreaterThanOrEqual(128)
    expect(height).toBeGreaterThanOrEqual(128)
  })

  it('icon.png should be square', () => {
    const buffer = fs.readFileSync(extensionIconPath)
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    expect(width).toBe(height)
  })

  it('extension/package.json should reference assets/icon.png', () => {
    const pkg = JSON.parse(fs.readFileSync(extensionPkgPath, 'utf-8'))
    expect(pkg.icon).toBe('assets/icon.png')
  })

  it('desktop build/icons/icon.png should also exist', () => {
    expect(fs.existsSync(desktopIconPath)).toBe(true)
  })

  it('icon.png should not be suspiciously small (corrupt or placeholder)', () => {
    const stats = fs.statSync(extensionIconPath)
    expect(stats.size).toBeGreaterThan(10_000) // At least 10KB for a real icon
  })
})
