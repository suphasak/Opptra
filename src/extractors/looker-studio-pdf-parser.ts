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

    // Pattern 1: Label followed by value on next line
    // Example: "MTD\n583,826"
    const labelValuePattern = /([A-Z]{2,}|[A-Za-z\s]+)\n([-]?[\d,]+\.?\d*)/g;
    let match;

    while ((match = labelValuePattern.exec(text)) !== null) {
      const label = match[1].trim();
      const value = match[2].replace(/,/g, '');

      // Skip if label is too long or value isn't numeric
      if (label.length > 50) continue;

      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        metrics.push({
          name: label,
          value: numValue,
        });
      }
    }

    // Pattern 2: Inline metrics "Label: Value" or "Label Value"
    const inlinePatterns = [
      /([A-Z][A-Za-z\s]+):\s*([-]?[\d,]+\.?\d*)/g,
      /(Revenue|Target|Variance|MTD|DRR|Expected)[\s:]+\$?([-]?[\d,]+\.?\d*)/gi,
      /(GM%|MKT%|DC%|CM2%|IOWC%)[\s:]+(\d+\.?\d*)/g,
      /(ROAS|CTR|CPC|ACos)[\s:]+(\d+\.?\d*)/gi,
    ];

    for (const pattern of inlinePatterns) {
      while ((match = pattern.exec(text)) !== null) {
        const label = match[1].trim();
        const value = match[2].replace(/,/g, '').replace(/\$/g, '');
        const numValue = parseFloat(value);

        if (!isNaN(numValue)) {
          metrics.push({
            name: label,
            value: numValue,
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
