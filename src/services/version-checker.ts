/**
 * Version Checker Service for Desktop App
 * 
 * Checks for updates and notifies users when a new version is available.
 * Works with Electron's built-in auto-updater and GitHub releases.
 */

// Minimum supported version - versions below this will show urgent update notice
export const MINIMUM_SUPPORTED_VERSION = '1.4.30'

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
    versionInfo.releaseNotes = release.body
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
