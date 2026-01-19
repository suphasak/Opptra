/**
 * PDF Data Extractor
 * Extracts structured data from PDF business reports
 */

import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import { DataSourceType, RawData, DataPoint } from '../types';
import { generateId } from '../utils/helpers';
import { logger } from '../utils/logger';
import { lookerStudioPDFParser } from './looker-studio-pdf-parser';

/**
 * PDF extraction options
 */
export interface PDFExtractionOptions {
  extractTables?: boolean;
  extractMetrics?: boolean;
  extractDates?: boolean;
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    transform?: (match: string) => any;
  }>;
}

/**
 * Extracted PDF content
 */
export interface PDFContent {
  text: string;
  numPages: number;
  metadata?: Record<string, any>;
  tables?: any[];
  metrics?: Array<{
    name: string;
    value: number | string;
    unit?: string;
  }>;
  dates?: Date[];
}

/**
 * PDF Extractor class
 */
export class PDFExtractor {
  /**
   * Extract data from a PDF file
   */
  async extract(
    filePath: string,
    sourceId: string,
    options: PDFExtractionOptions = {}
  ): Promise<RawData> {
    try {
      logger.info(`Extracting data from PDF: ${filePath}`);

      // Read the PDF file
      const dataBuffer = await fs.readFile(filePath);

      // Parse the PDF
      const pdfData = await pdfParse(dataBuffer);

      // Extract content
      const content: PDFContent = {
        text: pdfData.text,
        numPages: pdfData.numpages,
        metadata: pdfData.info,
      };

      // Extract tables if requested
      if (options.extractTables) {
        content.tables = this.extractTables(pdfData.text);
      }

      // Extract metrics if requested
      if (options.extractMetrics) {
        content.metrics = this.extractMetrics(pdfData.text);
      }

      // Extract dates if requested
      if (options.extractDates) {
        content.dates = this.extractDates(pdfData.text);
      }

      // Apply custom patterns
      if (options.customPatterns) {
        for (const pattern of options.customPatterns) {
          const matches = this.applyCustomPattern(pdfData.text, pattern);
          (content as any)[pattern.name] = matches;
        }
      }

      logger.info(`Successfully extracted data from PDF: ${filePath}`);

      return {
        sourceId,
        sourceType: DataSourceType.PDF,
        extractedAt: new Date(),
        data: content,
        metadata: {
          filePath,
          fileName: path.basename(filePath),
          fileSize: dataBuffer.length,
        },
      };
    } catch (error) {
      logger.error(`Error extracting PDF: ${filePath}`, error);
      throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract tables from text (simple implementation)
   */
  private extractTables(text: string): any[] {
    const tables: any[] = [];

    // Look for table-like structures
    // This is a simple implementation - you may want to use a more sophisticated library
    const lines = text.split('\n');
    let currentTable: string[] = [];
    let inTable = false;

    for (const line of lines) {
      // Detect table rows (lines with multiple tab-separated or space-separated values)
      const columns = line.split(/\t+|\s{2,}/);

      if (columns.length >= 3) {
        // Likely a table row
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        currentTable.push(line);
      } else if (inTable && currentTable.length > 2) {
        // End of table
        tables.push(this.parseTable(currentTable));
        currentTable = [];
        inTable = false;
      }
    }

    // Add last table if exists
    if (currentTable.length > 2) {
      tables.push(this.parseTable(currentTable));
    }

    return tables;
  }

  /**
   * Parse a table from lines
   */
  private parseTable(lines: string[]): any {
    const rows = lines.map(line => {
      return line.split(/\t+|\s{2,}/).map(cell => cell.trim()).filter(cell => cell.length > 0);
    });

    if (rows.length === 0) return null;

    // First row is typically headers
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return {
      headers,
      rows: data,
      rowCount: data.length,
    };
  }

  /**
   * Extract numeric metrics from text
   */
  private extractMetrics(text: string): Array<{ name: string; value: number | string; unit?: string }> {
    const metrics: Array<{ name: string; value: number | string; unit?: string }> = [];

    // Common patterns for metrics in business reports
    const patterns = [
      // Revenue: $1.2M, Revenue: $1,234,567
      /(?:revenue|sales|income):\s*\$?([\d,]+\.?\d*)\s*([MKB]|million|thousand|billion)?/gi,
      // Growth: 25%, Increase: 15.5%
      /(?:growth|increase|decrease|change):\s*([\d.]+)%/gi,
      // Total customers: 1,234
      /(?:total|number of|count)\s+(\w+):\s*([\d,]+)/gi,
      // Q1 2024: $500K
      /(Q\d\s+\d{4}):\s*\$?([\d,]+\.?\d*)\s*([MKB])?/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const metric = {
          name: match[0].split(':')[0].trim(),
          value: this.parseNumericValue(match[1]),
          unit: match[2],
        };
        metrics.push(metric);
      }
    }

    return metrics;
  }

  /**
   * Extract dates from text
   */
  private extractDates(text: string): Date[] {
    const dates: Date[] = [];

    // Common date patterns
    const patterns = [
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g, // MM/DD/YYYY or DD-MM-YYYY
      /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g, // YYYY-MM-DD
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/gi, // Month DD, YYYY
      /\b(Q[1-4])\s+(\d{4})/gi, // Q1 2024
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            dates.push(date);
          }
        } catch (error) {
          // Skip invalid dates
        }
      }
    }

    // Remove duplicates
    return Array.from(new Set(dates.map(d => d.getTime()))).map(t => new Date(t));
  }

  /**
   * Apply custom pattern to extract data
   */
  private applyCustomPattern(
    text: string,
    pattern: { name: string; pattern: RegExp; transform?: (match: string) => any }
  ): any[] {
    const results: any[] = [];
    let match;

    while ((match = pattern.pattern.exec(text)) !== null) {
      const value = match[1] || match[0];
      results.push(pattern.transform ? pattern.transform(value) : value);
    }

    return results;
  }

  /**
   * Parse numeric value from string
   */
  private parseNumericValue(value: string): number {
    // Remove commas and parse
    const cleaned = value.replace(/,/g, '');
    return parseFloat(cleaned);
  }

  /**
   * Convert raw PDF data to normalized data points
   */
  async normalize(rawData: RawData): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];
    const content = rawData.data as PDFContent;

    // Check if this looks like a Looker Studio PDF
    const isLookerStudio = content.text.includes('Looker') ||
                           content.text.includes('MTD') && content.text.includes('DRR') ||
                           content.text.includes('Channel Mix') ||
                           content.text.includes('Brand Mix');

    if (isLookerStudio) {
      logger.info('Detected Looker Studio PDF format, using specialized parser');

      // Use Looker Studio parser
      const lookerMetrics = lookerStudioPDFParser.parseMetrics(content.text);
      const lookerPoints = lookerStudioPDFParser.metricsToDataPoints(
        lookerMetrics,
        rawData.sourceId,
        rawData.extractedAt
      );
      dataPoints.push(...lookerPoints);

      logger.info(`Extracted ${lookerPoints.length} metrics from Looker Studio PDF`);
    }

    // Convert metrics to data points (standard extraction)
    if (content.metrics) {
      for (const metric of content.metrics) {
        dataPoints.push({
          id: generateId(),
          timestamp: rawData.extractedAt,
          category: 'business-metrics',
          metric: metric.name,
          value: metric.value,
          unit: metric.unit,
          source: rawData.sourceId,
          metadata: {
            sourceType: DataSourceType.PDF,
          },
        });
      }
    }

    // Convert table data to data points
    if (content.tables) {
      for (let i = 0; i < content.tables.length; i++) {
        const table = content.tables[i];
        if (table && table.rows) {
          for (const row of table.rows) {
            // Try to extract numeric values
            for (const [key, value] of Object.entries(row)) {
              const numericValue = this.tryParseNumber(String(value));
              if (numericValue !== null) {
                dataPoints.push({
                  id: generateId(),
                  timestamp: rawData.extractedAt,
                  category: `table-${i + 1}`,
                  metric: key,
                  value: numericValue,
                  source: rawData.sourceId,
                  metadata: {
                    sourceType: DataSourceType.PDF,
                    tableIndex: i,
                    rawValue: value,
                  },
                });
              }
            }
          }
        }
      }
    }

    logger.info(`Normalized ${dataPoints.length} data points from PDF`);
    return dataPoints;
  }

  /**
   * Try to parse a string as a number
   */
  private tryParseNumber(value: string): number | null {
    if (typeof value !== 'string') return null;

    // Remove common formatting
    const cleaned = value.replace(/[$,\s%]/g, '');

    // Check for multipliers
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
export const pdfExtractor = new PDFExtractor();
