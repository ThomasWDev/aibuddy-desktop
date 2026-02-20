/**
 * AIBuddy Desktop Services
 * 
 * Provides Cursor-like capabilities for all platforms:
 * - Web Research (Tavily-powered search, extract, crawl)
 * - Version Checker (update notifications)
 * - More services coming soon...
 */

export {
  WebResearchService,
  getWebResearchService,
  resetWebResearchService,
  parseWebCommand,
} from './web-research'
export type {
  TavilySearchOptions,
  TavilySearchResult,
  TavilySearchResponse,
  TavilyExtractOptions,
  TavilyExtractResult,
  TavilyExtractResponse,
  TavilyCrawlOptions,
  TavilyCrawlResult,
  TavilyCrawlResponse,
} from './web-research'

export {
  checkForUpdates,
  getUpdateMessage,
  isNewerVersion,
  isVersionOutdated,
  MINIMUM_SUPPORTED_VERSION,
  GITHUB_RELEASES_URL,
  DOWNLOAD_PAGE_URL,
  type VersionInfo,
} from './version-checker'
