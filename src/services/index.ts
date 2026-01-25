/**
 * AIBuddy Desktop Services
 * 
 * Provides Cursor-like capabilities for all platforms:
 * - Web Research (Tavily-powered search, extract, crawl)
 * - More services coming soon...
 */

export {
  WebResearchService,
  TavilySearchOptions,
  TavilySearchResult,
  TavilySearchResponse,
  TavilyExtractOptions,
  TavilyExtractResult,
  TavilyExtractResponse,
  TavilyCrawlOptions,
  TavilyCrawlResult,
  TavilyCrawlResponse,
  getWebResearchService,
  resetWebResearchService,
  parseWebCommand,
} from './web-research'

