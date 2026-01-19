/**
 * Web Data Scraper
 * Scrapes structured data from web pages and APIs
 */

import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { DataSourceType, RawData, DataPoint } from '../types';
import { generateId } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Web scraping options
 */
export interface WebScraperOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  selectors?: {
    [key: string]: string; // CSS selectors for specific data
  };
  jsonPath?: string; // For API responses
  pagination?: {
    enabled: boolean;
    selector?: string;
    maxPages?: number;
  };
  rateLimit?: number; // Milliseconds between requests
  timeout?: number;
}

/**
 * Scraped web content
 */
export interface WebContent {
  url: string;
  html?: string;
  json?: any;
  extractedData: Record<string, any>;
  scrapedAt: Date;
  statusCode: number;
  headers?: Record<string, string>;
}

/**
 * Web Scraper class
 */
export class WebScraper {
  private defaultTimeout = 30000; // 30 seconds
  private defaultUserAgent = 'Opptra-BI-Bot/1.0';

  /**
   * Scrape data from a web page or API
   */
  async scrape(
    url: string,
    sourceId: string,
    options: WebScraperOptions = {}
  ): Promise<RawData> {
    try {
      logger.info(`Scraping data from: ${url}`);

      const config: AxiosRequestConfig = {
        method: options.method || 'GET',
        url,
        headers: {
          'User-Agent': this.defaultUserAgent,
          ...options.headers,
        },
        timeout: options.timeout || this.defaultTimeout,
      };

      const response = await axios(config);

      let content: WebContent = {
        url,
        extractedData: {},
        scrapedAt: new Date(),
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
      };

      // Check if response is JSON
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        content.json = response.data;
        content.extractedData = this.extractFromJSON(response.data, options.jsonPath);
      } else {
        // Assume HTML
        content.html = response.data;
        content.extractedData = this.extractFromHTML(response.data, options.selectors);
      }

      logger.info(`Successfully scraped data from: ${url}`);

      return {
        sourceId,
        sourceType: DataSourceType.WEB,
        extractedAt: new Date(),
        data: content,
        metadata: {
          url,
          statusCode: response.status,
          contentType,
        },
      };
    } catch (error) {
      logger.error(`Error scraping URL: ${url}`, error);
      throw new Error(`Failed to scrape web data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract data from HTML using CSS selectors
   */
  private extractFromHTML(
    html: string,
    selectors?: Record<string, string>
  ): Record<string, any> {
    const $ = cheerio.load(html);
    const extracted: Record<string, any> = {};

    if (!selectors) {
      // Extract common business metrics automatically
      extracted.metrics = this.autoExtractMetrics($);
      extracted.tables = this.extractTables($);
      extracted.text = $('body').text().trim();
    } else {
      // Use provided selectors
      for (const [key, selector] of Object.entries(selectors)) {
        const elements = $(selector);

        if (elements.length === 0) {
          extracted[key] = null;
        } else if (elements.length === 1) {
          extracted[key] = this.extractElementData(elements.first(), $);
        } else {
          extracted[key] = elements
            .map((_, el) => this.extractElementData($(el), $))
            .get();
        }
      }
    }

    return extracted;
  }

  /**
   * Extract data from a single element
   */
  private extractElementData($el: cheerio.Cheerio, $: cheerio.CheerioAPI): any {
    // Check if it's a table
    if ($el.is('table')) {
      return this.parseTable($el, $);
    }

    // Check for common data attributes
    const dataAttrs: Record<string, string> = {};
    const attrs = $el.attr();
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith('data-')) {
          dataAttrs[key.substring(5)] = value;
        }
      }
    }

    if (Object.keys(dataAttrs).length > 0) {
      return {
        text: $el.text().trim(),
        ...dataAttrs,
      };
    }

    // Return text content
    return $el.text().trim();
  }

  /**
   * Parse HTML table into structured data
   */
  private parseTable($table: cheerio.Cheerio, $: cheerio.CheerioAPI): any {
    const headers: string[] = [];
    const rows: any[] = [];

    // Extract headers
    $table.find('thead th, thead td').each((_, el) => {
      headers.push($(el).text().trim());
    });

    // If no thead, use first row as headers
    if (headers.length === 0) {
      $table.find('tr').first().find('th, td').each((_, el) => {
        headers.push($(el).text().trim());
      });
    }

    // Extract rows
    $table.find('tbody tr, tr').each((rowIndex, row) => {
      if (rowIndex === 0 && headers.length === 0) return; // Skip header row

      const rowData: Record<string, string> = {};
      $(row).find('td').each((colIndex, cell) => {
        const header = headers[colIndex] || `column_${colIndex}`;
        rowData[header] = $(cell).text().trim();
      });

      if (Object.keys(rowData).length > 0) {
        rows.push(rowData);
      }
    });

    return {
      headers,
      rows,
      rowCount: rows.length,
    };
  }

  /**
   * Extract tables from HTML
   */
  private extractTables($: cheerio.CheerioAPI): any[] {
    const tables: any[] = [];

    $('table').each((_, table) => {
      tables.push(this.parseTable($(table), $));
    });

    return tables;
  }

  /**
   * Auto-extract common metrics from HTML
   */
  private autoExtractMetrics($: cheerio.CheerioAPI): Array<{ name: string; value: string }> {
    const metrics: Array<{ name: string; value: string }> = [];

    // Look for common metric patterns
    $('.metric, .kpi, [data-metric], [data-value]').each((_, el) => {
      const $el = $(el);
      const name = $el.attr('data-name') || $el.find('.metric-name, .label').text().trim();
      const value = $el.attr('data-value') || $el.find('.metric-value, .value').text().trim() || $el.text().trim();

      if (name && value) {
        metrics.push({ name, value });
      }
    });

    return metrics;
  }

  /**
   * Extract data from JSON response
   */
  private extractFromJSON(data: any, jsonPath?: string): any {
    if (!jsonPath) {
      return data;
    }

    // Simple JSON path implementation (supports dot notation)
    const parts = jsonPath.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }

      // Handle array notation like 'items[0]'
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key]?.[parseInt(index)];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Scrape multiple pages with pagination
   */
  async scrapeWithPagination(
    baseUrl: string,
    sourceId: string,
    options: WebScraperOptions
  ): Promise<RawData[]> {
    const results: RawData[] = [];
    let currentPage = 1;
    const maxPages = options.pagination?.maxPages || 10;

    while (currentPage <= maxPages) {
      logger.info(`Scraping page ${currentPage}/${maxPages}`);

      // Construct URL for current page
      const url = this.buildPaginatedUrl(baseUrl, currentPage);

      try {
        const result = await this.scrape(url, sourceId, options);
        results.push(result);

        // Check if there are more pages
        if (options.pagination?.selector && result.data.html) {
          const $ = cheerio.load(result.data.html);
          const hasNext = $(options.pagination.selector).length > 0;

          if (!hasNext) {
            logger.info('No more pages to scrape');
            break;
          }
        }

        currentPage++;

        // Rate limiting
        if (options.rateLimit && currentPage <= maxPages) {
          await this.sleep(options.rateLimit);
        }
      } catch (error) {
        logger.error(`Error scraping page ${currentPage}`, error);
        break;
      }
    }

    return results;
  }

  /**
   * Build paginated URL
   */
  private buildPaginatedUrl(baseUrl: string, page: number): string {
    const url = new URL(baseUrl);
    url.searchParams.set('page', page.toString());
    return url.toString();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convert raw web data to normalized data points
   */
  async normalize(rawData: RawData): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];
    const content = rawData.data as WebContent;

    // Extract from metrics
    if (content.extractedData.metrics) {
      for (const metric of content.extractedData.metrics) {
        const numericValue = this.tryParseNumber(metric.value);

        dataPoints.push({
          id: generateId(),
          timestamp: content.scrapedAt,
          category: 'web-metrics',
          metric: metric.name,
          value: numericValue !== null ? numericValue : metric.value,
          source: rawData.sourceId,
          metadata: {
            sourceType: DataSourceType.WEB,
            url: content.url,
          },
        });
      }
    }

    // Extract from tables
    if (content.extractedData.tables) {
      for (let i = 0; i < content.extractedData.tables.length; i++) {
        const table = content.extractedData.tables[i];

        for (const row of table.rows) {
          for (const [key, value] of Object.entries(row)) {
            const numericValue = this.tryParseNumber(value);

            if (numericValue !== null) {
              dataPoints.push({
                id: generateId(),
                timestamp: content.scrapedAt,
                category: `web-table-${i + 1}`,
                metric: key,
                value: numericValue,
                source: rawData.sourceId,
                metadata: {
                  sourceType: DataSourceType.WEB,
                  url: content.url,
                  tableIndex: i,
                  rawValue: value,
                },
              });
            }
          }
        }
      }
    }

    logger.info(`Normalized ${dataPoints.length} data points from web source`);
    return dataPoints;
  }

  /**
   * Try to parse a string as a number
   */
  private tryParseNumber(value: string): number | null {
    if (typeof value !== 'string') return null;

    const cleaned = value.replace(/[$,\s%]/g, '');

    const multipliers: Record<string, number> = {
      K: 1000,
      M: 1000000,
      B: 1000000000,
    };

    for (const [suffix, multiplier] of Object.entries(multipliers)) {
      if (cleaned.toUpperCase().endsWith(suffix)) {
        const num = parseFloat(cleaned.slice(0, -1));
        if (!isNaN(num)) {
          return num * multiplier;
        }
      }
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
}

/**
 * Export singleton instance
 */
export const webScraper = new WebScraper();
