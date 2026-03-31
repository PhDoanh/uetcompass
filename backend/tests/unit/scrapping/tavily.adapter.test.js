/**
 * T012: Tavily Adapter Unit Tests
 * Tests all three search methods with mocked Tavily API responses
 * Verifies query construction and response parsing
 */

describe('Tavily Adapter', () => {
  let tavilyAdapter;
  let mockTavilyClient;

  beforeEach(() => {
    // Clear module cache and reset mocks
    jest.clearAllMocks();

    // Mock the @tavily/core module
    jest.doMock('@tavily/core', () => ({
      tavily: jest.fn().mockImplementation(() => ({
        search: jest.fn()
      }))
    }));

    // Import adapter after mocking
    tavilyAdapter = require('../../../src/modules/scraping/adapters/tavily.adapter');
    mockTavilyClient = tavilyAdapter.client;
  });

  afterEach(() => {
    jest.dontMock('@tavily/core');
  });

  describe('academicSearch', () => {
    it('should construct correct query and parse academic search results', async () => {
      const courseName = 'Phát triển ứng dụng web';
      const mockResults = [
        {
          title: 'Lập trình Web - Slides',
          url: 'https://uet.vnu.edu.vn/web-slides.pdf',
          content: 'HTML CSS JavaScript framework...',
          source: 'UET Official'
        },
        {
          title: 'Web Dev Tutorial',
          url: 'https://github.com/example/web-tutorial',
          content: 'Complete web development guide...',
          source: 'GitHub'
        }
      ];

      mockTavilyClient.search.mockResolvedValue({ results: mockResults });

      const results = await tavilyAdapter.academicSearch(courseName);

      // Verify search was called with correct query
      expect(mockTavilyClient.search).toHaveBeenCalledWith(
        expect.stringContaining(courseName),
        expect.objectContaining({
          include_raw_content: true,
          max_results: 10
        })
      );

      // Verify results are formatted correctly
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        title: 'Lập trình Web - Slides',
        url: 'https://uet.vnu.edu.vn/web-slides.pdf',
        snippet: 'HTML CSS JavaScript framework...',
        source: 'UET Official'
      });
    });

    it('should handle empty results from Tavily', async () => {
      mockTavilyClient.search.mockResolvedValue({ results: [] });

      const results = await tavilyAdapter.academicSearch('Some Course');

      expect(results).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockTavilyClient.search.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(
        tavilyAdapter.academicSearch('Some Course')
      ).rejects.toThrow('Tavily academic search failed');
    });
  });

  describe('trendSearch', () => {
    it('should construct query with personalization context', async () => {
      const courseName = 'Web Development';
      const personalizationContext = {
        major: 'Computer Science',
        careerRole: 'Software Engineer',
        companyType: 'Startup'
      };

      const mockResults = [
        {
          title: 'React Developer Jobs',
          url: 'https://topdev.vn/jobs/react',
          content: 'React skills job market demand...',
          source: 'TopDev'
        }
      ];

      mockTavilyClient.search.mockResolvedValue({ results: mockResults });

      const results = await tavilyAdapter.trendSearch(courseName, personalizationContext);

      // Verify query includes personalization context
      const callArgs = mockTavilyClient.search.mock.calls[0][0];
      expect(callArgs).toContain('Computer Science');
      expect(callArgs).toContain('Software Engineer');
      expect(callArgs).toContain('Startup');

      expect(results).toHaveLength(1);
    });

    it('should work with null personalization context', async () => {
      const courseName = 'Web Development';
      mockTavilyClient.search.mockResolvedValue({ results: [] });

      const results = await tavilyAdapter.trendSearch(courseName, null);

      // Verify query is constructed without personalization
      const callArgs = mockTavilyClient.search.mock.calls[0][0];
      expect(callArgs).toContain(courseName);
      expect(callArgs).toContain('skills job market');

      expect(results).toEqual([]);
    });

    it('should parse salary signals from job posting snippets', async () => {
      const mockResults = [
        {
          title: 'Senior React Developer',
          url: 'https://topdev.vn/jobs/123',
          content: 'Salary: $50k-80k USD. React, Node.js required...',
          source: 'TopDev'
        }
      ];

      mockTavilyClient.search.mockResolvedValue({ results: mockResults });

      const results = await tavilyAdapter.trendSearch('Web Development');

      // Results should include snippet with salary signal for processing by marketTracker
      expect(results[0].snippet).toContain('$50k-80k');
    });
  });

  describe('resourceSearch', () => {
    it('should construct correct resource search query', async () => {
      const skillName = 'React';
      const mockResults = [
        {
          title: 'React: The Complete Guide',
          url: 'https://www.udemy.com/course/react-guide',
          content: 'A comprehensive React course on Udemy...',
          source: 'Udemy'
        },
        {
          title: 'React YouTube Playlist',
          url: 'https://www.youtube.com/playlist?list=react101',
          content: 'Free React tutorials on YouTube...',
          source: 'YouTube'
        }
      ];

      mockTavilyClient.search.mockResolvedValue({ results: mockResults });

      const results = await tavilyAdapter.resourceSearch(skillName);

      // Verify query is constructed with "learn" keyword
      const callArgs = mockTavilyClient.search.mock.calls[0][0];
      expect(callArgs).toContain('learn React');
      expect(callArgs).toContain('course');
      expect(callArgs).toContain('tutorial');

      // Verify results include platform information
      expect(results).toHaveLength(2);
      expect(results[0].source).toBe('Udemy');
      expect(results[1].source).toBe('YouTube');
    });

    it('should classify platforms and resource types from results', async () => {
      const mockResults = [
        {
          title: 'Free React Course on freeCodeCamp',
          url: 'https://www.freecodecamp.org/react',
          content: 'Complete free React course...',
          source: 'freeCodeCamp'
        },
        {
          title: 'React Tutorial on Coursera',
          url: 'https://coursera.org/react-audit',
          content: 'Audit this free React course on Coursera...',
          source: 'Coursera'
        }
      ];

      mockTavilyClient.search.mockResolvedValue({ results: mockResults });

      const results = await tavilyAdapter.resourceSearch('React');

      // Results should be processed by resourceCrawler for free/paid classification
      expect(results[0].source).toBe('freeCodeCamp');
      expect(results[1].source).toBe('Coursera');
    });

    it('should handle resource search errors gracefully', async () => {
      mockTavilyClient.search.mockRejectedValue(new Error('Network timeout'));

      await expect(
        tavilyAdapter.resourceSearch('React')
      ).rejects.toThrow('Tavily resource search failed');
    });
  });

  describe('error handling', () => {
    it('should log and rethrow errors with context', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockTavilyClient.search.mockRejectedValue(new Error('API key invalid'));

      await expect(
        tavilyAdapter.academicSearch('Test')
      ).rejects.toThrow('Tavily academic search failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Tavily] Academic search failed:',
        'API key invalid'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('query construction', () => {
    it('should have correct query patterns', async () => {
      mockTavilyClient.search.mockResolvedValue({ results: [] });

      // Academic query should include educational keywords
      await tavilyAdapter.academicSearch('Web Development');
      let query = mockTavilyClient.search.mock.calls[0][0];
      expect(query).toMatch(/slides|lecture|notes|education/i);

      // Resource query should include learning keywords
      mockTavilyClient.search.mockClear();
      await tavilyAdapter.resourceSearch('React');
      query = mockTavilyClient.search.mock.calls[0][0];
      expect(query).toMatch(/learn|course|tutorial/i);
    });
  });
});
