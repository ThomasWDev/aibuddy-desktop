/**
 * Version Checker Service for Desktop App
 * 
 * Checks for updates and notifies users when a new version is available.
 * Works with Electron's built-in auto-updater and GitHub releases.
 */

// Minimum supported version - versions below this will show urgent update notice
// v1.5.58 is the first version with the correct ALB URL (aibuddy-api-alb-90164252)
// All versions before this use the decommissioned ALB (aibuddy-api-all-981625629) and cannot reach the API
export const MINIMUM_SUPPORTED_VERSION = '1.5.58'

// GitHub releases URL for AIBuddy Desktop
export const GITHUB_RELEASES_URL = 'https://api.github.com/repos/ThomasWDev/aibuddy-desktop/releases/latest'

// Download page URL
export const DOWNLOAD_PAGE_URL = 'https://aibuddy.life/downloads'

export interface VersionInfo {
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
  isUrgent: boolean
  releaseNotes: string | null
  releaseUrl: string | null
  downloadUrls: {
    mac?: string
    macArm64?: string
    windows?: string
    linux?: string
  }
}

/**
 * Compare two semantic versions
 * Returns true if latest is newer than current
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map(Number)
  const currentParts = current.split('.').map(Number)
  
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const l = latestParts[i] || 0
    const c = currentParts[i] || 0
    
    if (l > c) return true
    if (l < c) return false
  }
  
  return false
}

/**
 * Check if current version is older than minimum supported
 */
export function isVersionOutdated(current: string): boolean {
  return isNewerVersion(MINIMUM_SUPPORTED_VERSION, current)
}

/**
 * Check for updates from GitHub releases
 */
export async function checkForUpdates(currentVersion: string): Promise<VersionInfo> {
  const versionInfo: VersionInfo = {
    currentVersion,
    latestVersion: null,
    updateAvailable: false,
    isUrgent: false,
    releaseNotes: null,
    releaseUrl: null,
    downloadUrls: {}
  }
  
  try {
    console.log('[VersionChecker] Checking for updates...')
    
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AIBuddy-Desktop'
      }
    })
    
    if (!response.ok) {
      console.error('[VersionChecker] GitHub API error:', response.status)
      return versionInfo
    }
    
    const release = await response.json() as {
      tag_name: string
      body: string
      html_url: string
      assets: Array<{
        name: string
        browser_download_url: string
      }>
    }
    
    // Parse version from tag (e.g., "v1.4.32" -> "1.4.32")
    const latestVersion = release.tag_name.replace(/^v/, '')
    versionInfo.latestVersion = latestVersion
    versionInfo.releaseNotes = filterReleaseNotes(release.body)
    versionInfo.releaseUrl = release.html_url
    
    // Extract download URLs for each platform
    for (const asset of release.assets) {
      const name = asset.name.toLowerCase()
      if (name.includes('arm64') && name.endsWith('.dmg')) {
        versionInfo.downloadUrls.macArm64 = asset.browser_download_url
      } else if (name.endsWith('.dmg')) {
        versionInfo.downloadUrls.mac = asset.browser_download_url
      } else if (name.endsWith('.exe')) {
        versionInfo.downloadUrls.windows = asset.browser_download_url
      } else if (name.endsWith('.appimage') || name.endsWith('.deb')) {
        versionInfo.downloadUrls.linux = asset.browser_download_url
      }
    }
    
    // Compare versions
    versionInfo.updateAvailable = isNewerVersion(latestVersion, currentVersion)
    versionInfo.isUrgent = isVersionOutdated(currentVersion)
    
    console.log(`[VersionChecker] Current: ${currentVersion}, Latest: ${latestVersion}, Update: ${versionInfo.updateAvailable}`)
    
  } catch (error) {
    console.error('[VersionChecker] Error checking for updates:', error)
  }
  
  return versionInfo
}

/**
 * Filter release notes to only include user-testable items.
 * Strips build system internals, signing details, and infrastructure changes
 * that end users cannot verify or test.
 */
export function filterReleaseNotes(notes: string | null): string | null {
  if (!notes) return null
  
  // Sections/headings to exclude (these are not testable by end users)
  const excludePatterns = [
    /^###?\s*Code-Signed.*$/gim,
    /^###?\s*Build System.*$/gim,
    /^###?\s*Sentry Noise.*$/gim,
    /^###?\s*Deployment Checklist.*$/gim,
    /^###?\s*Download Links.*$/gim,
    /^###?\s*Test Coverage.*$/gim,
  ]

  // Line-level patterns to exclude
  const excludeLinePatterns = [
    /Developer ID Application/i,
    /Certificate hash/i,
    /Notarization pending/i,
    /electron-builder.*upgraded/i,
    /afterPack.*script/i,
    /resource fork cleanup/i,
    /publisherName.*field/i,
    /^\s*-\s*\[x\]/i, // Deployment checklist items
    /Git tag.*created/i,
    /Submodule reference/i,
    /VSIX packaged/i,
    /^---\s*$/,
  ]

  const lines = notes.split('\n')
  const result: string[] = []
  let inExcludedSection = false

  for (const line of lines) {
    // Check if this line starts an excluded section
    if (excludePatterns.some(p => p.test(line))) {
      inExcludedSection = true
      // Reset all regex lastIndex
      excludePatterns.forEach(p => p.lastIndex = 0)
      continue
    }

    // A new heading ends the excluded section
    if (inExcludedSection && /^#{1,3}\s/.test(line)) {
      inExcludedSection = false
    }

    if (inExcludedSection) continue

    // Skip individual non-testable lines
    if (excludeLinePatterns.some(p => p.test(line))) continue

    result.push(line)
  }

  // Clean up: remove multiple consecutive empty lines
  const cleaned = result.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return cleaned || null
}

/**
 * Get update message based on version info
 */
export function getUpdateMessage(versionInfo: VersionInfo): {
  title: string
  message: string
  type: 'info' | 'warning'
} {
  if (versionInfo.isUrgent) {
    return {
      title: 'Critical Update Required',
      message: `AIBuddy ${versionInfo.latestVersion} is available. Your version (${versionInfo.currentVersion}) may have compatibility issues. Please update immediately for the best experience.`,
      type: 'warning'
    }
  }
  
  return {
    title: 'Update Available',
    message: `AIBuddy ${versionInfo.latestVersion} is now available! You're currently using ${versionInfo.currentVersion}. Update to get the latest features and improvements.`,
    type: 'info'
  }
}
