/**
 * Looker Studio PDF Parser
 * Specialized parser for Looker Studio exported PDFs
 */

import { DataPoint } from '../types';
import { generateId } from '../utils/helpers';

export interface LookerStudioMetric {
  name: string;
  value: number | string;
  context?: string;
}

export class LookerStudioPDFParser {
  /**
   * Parse Looker Studio PDF text and extract metrics
   */
  parseMetrics(text: string): LookerStudioMetric[] {
    const metrics: LookerStudioMetric[] = [];

    // Extract section headers for context
    const sections = this.extractSections(text);

    // Pattern 1: Section-aware metric extraction
    for (const section of sections) {
      const sectionMetrics = this.extractMetricsFromSection(section);
      metrics.push(...sectionMetrics);
    }

    return metrics;
  }

  /**
   * Extract sections with their headers
   */
  private extractSections(text: string): Array<{ header: string; content: string }> {
    const sections: Array<{ header: string; content: string }> = [];

    // Look for common section headers in Looker Studio
    const sectionHeaders = [
      'Channel Mix',
      'Brand Mix',
      'Profitability',
      'Country-wise Revenue',
      'Brand-wise Revenue',
      'Channel-wise Revenue',
      'Order To Delivery',
      'Ad Performance',
      'Weekly Sales',
    ];

    for (const header of sectionHeaders) {
      const regex = new RegExp(`${header}[^\\n]*`, 'i');
      const match = text.match(regex);

      if (match) {
        const startIndex = match.index!;
        // Get next 500 characters after header
        const content = text.substring(startIndex, startIndex + 500);
        sections.push({
          header: match[0],
          content,
        });
      }
    }

    return sections;
  }

  /**
   * Extract metrics from a specific section with context
   */
  private extractMetricsFromSection(section: { header: string; content: string }): LookerStudioMetric[] {
    const metrics: LookerStudioMetric[] = [];
    const context = section.header;

    // Common metric patterns in Looker Studio
    const patterns = [
      // MTD, DRR, Target, Variance patterns
      /(MTD|DRR|Target|Variance|Expected)\s*\n\s*([-]?[\d,]+\.?\d*)/gi,
      // Percentage patterns
      /(GM%|MKT%|DC%|IOWC%|CM2%|CTR|ROAS|ACos)\s*\n?\s*([-]?[\d,]+\.?\d*)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      const patternCopy = new RegExp(pattern.source, pattern.flags);

      while ((match = patternCopy.exec(section.content)) !== null) {
        const metricName = match[1].trim();
        const value = match[2].replace(/,/g, '').replace(/\$/g, '');
        const numValue = parseFloat(value);

        if (!isNaN(numValue) && Math.abs(numValue) > 0.001) {
          // Only include significant values
          metrics.push({
            name: `${context} - ${metricName}`,
            value: numValue,
            context,
          });
        }
      }
    }

    return metrics;
  }

  /**
   * Parse table-like data from Looker Studio
   */
  parseTables(text: string): any[] {
    const tables: any[] = [];

    // Look for common Looker Studio table headers
    const tableHeaderPatterns = [
      /Country\s*Brand\s*MTD\s*Yesterday\s*Extrapolated\s*Target\s*Variance/i,
      /Channel\s*Week\s*1\s*Week\s*2\s*Week\s*3\s*Week\s*4/i,
      /Brand\s*GM%\s*MKT%\s*DC%\s*IOWC%\s*CM2%/i,
    ];

    for (const headerPattern of tableHeaderPatterns) {
      const headerMatch = text.match(headerPattern);
      if (headerMatch) {
        // Found a table, extract rows after header
        const startIndex = headerMatch.index! + headerMatch[0].length;
        const tableSection = text.substring(startIndex, startIndex + 2000); // Get next 2000 chars

        const rows = this.extractTableRows(tableSection);
        if (rows.length > 0) {
          tables.push({
            header: headerMatch[0],
            rows,
          });
        }
      }
    }

    return tables;
  }

  /**
   * Extract rows from table section
   */
  private extractTableRows(text: string): any[] {
    const rows: any[] = [];
    const lines = text.split('\n').slice(0, 20); // First 20 lines after header

    for (const line of lines) {
      // Skip empty lines
      if (line.trim().length === 0) continue;

      // Look for lines with multiple data points
      const values = line.split(/\s+/).filter(v => v.trim().length > 0);

      // If line has numeric values, it's likely a data row
      const hasNumbers = values.some(v => /[\d,]+/.test(v));
      if (hasNumbers && values.length >= 3) {
        rows.push({
          raw: line,
          values,
        });
      }
    }

    return rows;
  }

  /**
   * Convert parsed metrics to DataPoints
   */
  metricsToDataPoints(
    metrics: LookerStudioMetric[],
    sourceId: string,
    timestamp: Date
  ): DataPoint[] {
    const dataPoints: DataPoint[] = [];

    for (const metric of metrics) {
      if (typeof metric.value === 'number') {
        dataPoints.push({
          id: generateId(),
          timestamp,
          category: 'looker-studio-pdf',
          metric: metric.name,
          value: metric.value,
          source: sourceId,
          metadata: {
            sourceType: 'pdf',
            context: metric.context,
          },
        });
      }
    }

    return dataPoints;
  }
}

export const lookerStudioPDFParser = new LookerStudioPDFParser();
