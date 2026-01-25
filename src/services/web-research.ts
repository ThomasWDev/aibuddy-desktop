/**
 * Web Research Service for AIBuddy Desktop
 * 
 * Provides Cursor-like web research capabilities using AIBuddy's Tavily proxy.
 * Users don't need their own Tavily API key - AIBuddy handles it.
 * 
 * Features:
 * - Web search (tavily_search)
 * - Content extraction (tavily_extract)
 * - Website crawling (tavily_crawl)
 * 
 * Works on Mac, Windows, and Linux
 */

// AIBuddy API endpoints for Tavily proxy
const AIBUDDY_BASE_URL = 'https://aibuddy.life/wp-json/aibuddy-code/v2'

export interface TavilySearchOptions {
  query: string
  searchDepth?: 'basic' | 'advanced'
  topic?: 'general' | 'news'
  maxResults?: number
  includeAnswer?: boolean
  includeRawContent?: boolean
  includeDomains?: string[]
  excludeDomains?: string[]
}

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  publishedDate?: string
}

export interface TavilySearchResponse {
  query: string
  answer?: string
  results: TavilySearchResult[]
  responseTime: number
}

export interface TavilyExtractOptions {
  urls: string[]
  includeImages?: boolean
  extractDepth?: 'basic' | 'advanced'
}

export interface TavilyExtractResult {
  url: string
  rawContent: string
  images?: string[]
}

export interface TavilyExtractResponse {
  results: TavilyExtractResult[]
  failedUrls?: string[]
}

export interface TavilyCrawlOptions {
  url: string
  maxDepth?: number
  maxPages?: number
  includeDomains?: string[]
  excludeDomains?: string[]
}

export interface TavilyCrawlResult {
  url: string
  content: string
  links: string[]
}

export interface TavilyCrawlResponse {
  baseUrl: string
  pages: TavilyCrawlResult[]
  totalPages: number
}

/**
 * Web Research Service
 * Provides web search, extraction, and crawling capabilities
 */
export class WebResearchService {
  private apiKey: string | null = null

  /**
   * Set the AIBuddy API key for authentication
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Check if API key is set
   */
  public hasApiKey(): boolean {
    return !!this.apiKey
  }

  /**
   * Search the web using Tavily
   * 
   * @example
   * ```typescript
   * const results = await webResearch.search({
   *   query: 'React best practices 2024',
   *   maxResults: 5
   * })
   * ```
   */
  public async search(options: TavilySearchOptions): Promise<TavilySearchResponse> {
    if (!this.apiKey) {
      throw new Error('API key not set. Call setApiKey() first.')
    }

    const response = await fetch(`${AIBUDDY_BASE_URL}/tavily/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIBuddy-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: options.query,
        search_depth: options.searchDepth || 'basic',
        topic: options.topic || 'general',
        max_results: options.maxResults || 5,
        include_answer: options.includeAnswer ?? true,
        include_raw_content: options.includeRawContent ?? false,
        include_domains: options.includeDomains || [],
        exclude_domains: options.excludeDomains || [],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Search failed: ${error}`)
    }

    const data = await response.json()
    
    return {
      query: options.query,
      answer: data.answer,
      results: data.results || [],
      responseTime: data.response_time || 0,
    }
  }

  /**
   * Extract content from URLs using Tavily
   * 
   * @example
   * ```typescript
   * const content = await webResearch.extract({
   *   urls: ['https://example.com/article']
   * })
   * ```
   */
  public async extract(options: TavilyExtractOptions): Promise<TavilyExtractResponse> {
    if (!this.apiKey) {
      throw new Error('API key not set. Call setApiKey() first.')
    }

    const response = await fetch(`${AIBUDDY_BASE_URL}/tavily/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIBuddy-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        urls: options.urls,
        include_images: options.includeImages ?? false,
        extract_depth: options.extractDepth || 'basic',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Extract failed: ${error}`)
    }

    const data = await response.json()
    
    return {
      results: data.results || [],
      failedUrls: data.failed_urls,
    }
  }

  /**
   * Crawl a website using Tavily
   * 
   * @example
   * ```typescript
   * const pages = await webResearch.crawl({
   *   url: 'https://docs.example.com',
   *   maxPages: 10
   * })
   * ```
   */
  public async crawl(options: TavilyCrawlOptions): Promise<TavilyCrawlResponse> {
    if (!this.apiKey) {
      throw new Error('API key not set. Call setApiKey() first.')
    }

    const response = await fetch(`${AIBUDDY_BASE_URL}/tavily/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIBuddy-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        url: options.url,
        max_depth: options.maxDepth || 2,
        max_pages: options.maxPages || 10,
        include_domains: options.includeDomains || [],
        exclude_domains: options.excludeDomains || [],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Crawl failed: ${error}`)
    }

    const data = await response.json()
    
    return {
      baseUrl: options.url,
      pages: data.pages || [],
      totalPages: data.total_pages || 0,
    }
  }

  /**
   * Quick search - simplified interface for common use case
   */
  public async quickSearch(query: string): Promise<string> {
    const result = await this.search({
      query,
      maxResults: 3,
      includeAnswer: true,
    })

    if (result.answer) {
      return result.answer
    }

    // Format results as text
    return result.results
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.content}\n   Source: ${r.url}`)
      .join('\n\n')
  }

  /**
   * Quick extract - simplified interface for extracting single URL
   */
  public async quickExtract(url: string): Promise<string> {
    const result = await this.extract({
      urls: [url],
    })

    if (result.results.length > 0) {
      return result.results[0].rawContent
    }

    throw new Error(`Failed to extract content from ${url}`)
  }
}

// Singleton instance
let webResearchInstance: WebResearchService | null = null

/**
 * Get the global WebResearchService instance
 */
export function getWebResearchService(): WebResearchService {
  if (!webResearchInstance) {
    webResearchInstance = new WebResearchService()
  }
  return webResearchInstance
}

/**
 * Reset the global WebResearchService instance
 */
export function resetWebResearchService(): void {
  webResearchInstance = null
}

/**
 * Parse web research commands from user input
 * Returns the type of web action and parameters
 */
export function parseWebCommand(input: string): {
  type: 'search' | 'extract' | 'crawl' | null
  query?: string
  url?: string
} {
  const lowerInput = input.toLowerCase()

  // Search patterns
  const searchPatterns = [
    /search (?:the web |online |google |for )?(?:"|')?(.+?)(?:"|')?$/i,
    /look up (?:"|')?(.+?)(?:"|')?$/i,
    /find (?:information |info )?(?:about |on )?(?:"|')?(.+?)(?:"|')?$/i,
    /what is (?:"|')?(.+?)(?:"|')?$/i,
    /how to (?:"|')?(.+?)(?:"|')?$/i,
  ]

  for (const pattern of searchPatterns) {
    const match = input.match(pattern)
    if (match) {
      return { type: 'search', query: match[1].trim() }
    }
  }

  // Extract patterns
  const extractPatterns = [
    /extract (?:content |text )?from (?:"|')?(.+?)(?:"|')?$/i,
    /read (?:the )?(?:page |content |article )?(?:at |from )?(?:"|')?(.+?)(?:"|')?$/i,
    /get (?:the )?content (?:of |from )?(?:"|')?(.+?)(?:"|')?$/i,
  ]

  for (const pattern of extractPatterns) {
    const match = input.match(pattern)
    if (match && match[1].startsWith('http')) {
      return { type: 'extract', url: match[1].trim() }
    }
  }

  // Crawl patterns
  const crawlPatterns = [
    /crawl (?:the )?(?:website |site )?(?:"|')?(.+?)(?:"|')?$/i,
    /scrape (?:the )?(?:website |site )?(?:"|')?(.+?)(?:"|')?$/i,
  ]

  for (const pattern of crawlPatterns) {
    const match = input.match(pattern)
    if (match && match[1].startsWith('http')) {
      return { type: 'crawl', url: match[1].trim() }
    }
  }

  return { type: null }
}

