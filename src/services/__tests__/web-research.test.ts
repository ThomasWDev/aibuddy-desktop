/**
 * Web Research Service Tests
 * 
 * TDD tests for Tavily-powered web research capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WebResearchService,
  getWebResearchService,
  resetWebResearchService,
  parseWebCommand,
} from '../web-research'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WebResearchService', () => {
  let service: WebResearchService

  beforeEach(() => {
    resetWebResearchService()
    service = new WebResearchService()
    mockFetch.mockReset()
  })

  afterEach(() => {
    resetWebResearchService()
    vi.clearAllMocks()
  })

  describe('API key management', () => {
    it('should not have API key initially', () => {
      expect(service.hasApiKey()).toBe(false)
    })

    it('should set API key', () => {
      service.setApiKey('test-api-key')
      expect(service.hasApiKey()).toBe(true)
    })

    it('should throw error when searching without API key', async () => {
      await expect(service.search({ query: 'test' }))
        .rejects.toThrow('API key not set')
    })

    it('should throw error when extracting without API key', async () => {
      await expect(service.extract({ urls: ['https://example.com'] }))
        .rejects.toThrow('API key not set')
    })

    it('should throw error when crawling without API key', async () => {
      await expect(service.crawl({ url: 'https://example.com' }))
        .rejects.toThrow('API key not set')
    })
  })

  describe('search', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key')
    })

    it('should search the web', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          answer: 'React is a JavaScript library for building user interfaces.',
          results: [
            {
              title: 'React Documentation',
              url: 'https://react.dev',
              content: 'React is a JavaScript library...',
              score: 0.95,
            },
          ],
          response_time: 1.5,
        }),
      })

      const result = await service.search({ query: 'What is React?' })

      expect(result.query).toBe('What is React?')
      expect(result.answer).toBeDefined()
      expect(result.results).toHaveLength(1)
      expect(result.results[0].title).toBe('React Documentation')
    })

    it('should pass search options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })

      await service.search({
        query: 'test',
        searchDepth: 'advanced',
        topic: 'news',
        maxResults: 10,
        includeAnswer: false,
        includeDomains: ['example.com'],
        excludeDomains: ['spam.com'],
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tavily/search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"search_depth":"advanced"'),
        })
      )
    })

    it('should handle search errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Rate limit exceeded',
      })

      await expect(service.search({ query: 'test' }))
        .rejects.toThrow('Search failed: Rate limit exceeded')
    })
  })

  describe('extract', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key')
    })

    it('should extract content from URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              url: 'https://example.com/article',
              rawContent: 'This is the article content...',
            },
          ],
        }),
      })

      const result = await service.extract({
        urls: ['https://example.com/article'],
      })

      expect(result.results).toHaveLength(1)
      expect(result.results[0].rawContent).toContain('article content')
    })

    it('should handle failed URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [],
          failed_urls: ['https://blocked.com'],
        }),
      })

      const result = await service.extract({
        urls: ['https://blocked.com'],
      })

      expect(result.results).toHaveLength(0)
      expect(result.failedUrls).toContain('https://blocked.com')
    })

    it('should handle extract errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid URL',
      })

      await expect(service.extract({ urls: ['invalid'] }))
        .rejects.toThrow('Extract failed: Invalid URL')
    })
  })

  describe('crawl', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key')
    })

    it('should crawl a website', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pages: [
            {
              url: 'https://docs.example.com',
              content: 'Documentation home page',
              links: ['https://docs.example.com/guide'],
            },
            {
              url: 'https://docs.example.com/guide',
              content: 'Getting started guide',
              links: [],
            },
          ],
          total_pages: 2,
        }),
      })

      const result = await service.crawl({
        url: 'https://docs.example.com',
        maxPages: 10,
      })

      expect(result.baseUrl).toBe('https://docs.example.com')
      expect(result.pages).toHaveLength(2)
      expect(result.totalPages).toBe(2)
    })

    it('should handle crawl errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Crawl timeout',
      })

      await expect(service.crawl({ url: 'https://slow.com' }))
        .rejects.toThrow('Crawl failed: Crawl timeout')
    })
  })

  describe('quickSearch', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key')
    })

    it('should return answer if available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          answer: 'The answer is 42.',
          results: [],
        }),
      })

      const result = await service.quickSearch('What is the meaning of life?')
      expect(result).toBe('The answer is 42.')
    })

    it('should format results if no answer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              title: 'Result 1',
              content: 'Content 1',
              url: 'https://example.com/1',
            },
          ],
        }),
      })

      const result = await service.quickSearch('test query')
      expect(result).toContain('Result 1')
      expect(result).toContain('Content 1')
    })
  })

  describe('quickExtract', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key')
    })

    it('should return raw content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              url: 'https://example.com',
              rawContent: 'Page content here',
            },
          ],
        }),
      })

      const result = await service.quickExtract('https://example.com')
      expect(result).toBe('Page content here')
    })

    it('should throw if extraction fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })

      await expect(service.quickExtract('https://blocked.com'))
        .rejects.toThrow('Failed to extract content')
    })
  })

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getWebResearchService()
      const instance2 = getWebResearchService()
      expect(instance1).toBe(instance2)
    })

    it('should reset singleton', () => {
      const instance1 = getWebResearchService()
      resetWebResearchService()
      const instance2 = getWebResearchService()
      expect(instance1).not.toBe(instance2)
    })
  })
})

describe('parseWebCommand', () => {
  describe('search commands', () => {
    it('should parse "search" command', () => {
      const result = parseWebCommand('search React best practices')
      expect(result.type).toBe('search')
      expect(result.query).toBe('React best practices')
    })

    it('should parse "search the web for" command', () => {
      const result = parseWebCommand('search the web for TypeScript tutorials')
      expect(result.type).toBe('search')
      expect(result.query).toContain('TypeScript tutorials')
    })

    it('should parse "look up" command', () => {
      const result = parseWebCommand('look up Node.js documentation')
      expect(result.type).toBe('search')
      expect(result.query).toBe('Node.js documentation')
    })

    it('should parse "find" command', () => {
      const result = parseWebCommand('find information about Flutter')
      expect(result.type).toBe('search')
      expect(result.query).toBe('Flutter')
    })

    it('should parse "what is" command', () => {
      const result = parseWebCommand('what is GraphQL')
      expect(result.type).toBe('search')
      expect(result.query).toBe('GraphQL')
    })

    it('should parse "how to" command', () => {
      const result = parseWebCommand('how to deploy to AWS')
      expect(result.type).toBe('search')
      expect(result.query).toBe('deploy to AWS')
    })
  })

  describe('extract commands', () => {
    it('should parse "extract from" command', () => {
      const result = parseWebCommand('extract content from https://example.com/article')
      expect(result.type).toBe('extract')
      expect(result.url).toBe('https://example.com/article')
    })

    it('should parse "read" command', () => {
      const result = parseWebCommand('read the page at https://docs.example.com')
      expect(result.type).toBe('extract')
      expect(result.url).toBe('https://docs.example.com')
    })

    it('should parse "get content" command', () => {
      const result = parseWebCommand('get the content of https://blog.example.com/post')
      expect(result.type).toBe('extract')
      expect(result.url).toBe('https://blog.example.com/post')
    })
  })

  describe('crawl commands', () => {
    it('should parse "crawl" command', () => {
      const result = parseWebCommand('crawl https://docs.example.com')
      expect(result.type).toBe('crawl')
      expect(result.url).toBe('https://docs.example.com')
    })

    it('should parse "scrape" command', () => {
      const result = parseWebCommand('scrape the website https://example.com')
      expect(result.type).toBe('crawl')
      expect(result.url).toBe('https://example.com')
    })
  })

  describe('non-web commands', () => {
    it('should return null for regular commands', () => {
      const result = parseWebCommand('run npm install')
      expect(result.type).toBeNull()
    })

    it('should return null for code requests', () => {
      const result = parseWebCommand('create a React component')
      expect(result.type).toBeNull()
    })
  })
})

