/**
 * Data Consolidation Engine
 * Consolidates data from multiple sources into a unified dataset
 */

import { DataPoint, ConsolidatedData, RawData } from '../types';
import { groupBy, sortBy } from '../utils/helpers';
import { logger } from '../utils/logger';
import { pdfExtractor } from '../extractors/pdf-extractor';
import { webScraper } from '../extractors/web-scraper';
import { lookerStudioConnector } from '../extractors/looker-studio-connector';

/**
 * Consolidation options
 */
export interface ConsolidationOptions {
  deduplication?: boolean;
  normalization?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  metrics?: string[];
}

/**
 * Data Consolidator class
 */
export class DataConsolidator {
  /**
   * Consolidate data from multiple raw data sources
   */
  async consolidate(
    rawDataList: RawData[],
    options: ConsolidationOptions = {}
  ): Promise<ConsolidatedData> {
    try {
      logger.info(`Consolidating data from ${rawDataList.length} sources`);

      // Normalize all raw data to data points
      const allDataPoints: DataPoint[] = [];

      for (const rawData of rawDataList) {
        const dataPoints = await this.normalizeRawData(rawData);
        allDataPoints.push(...dataPoints);
      }

      logger.info(`Total data points before consolidation: ${allDataPoints.length}`);

      // Apply filters
      let filteredPoints = this.applyFilters(allDataPoints, options);

      // Apply deduplication if enabled
      if (options.deduplication) {
        filteredPoints = this.deduplicate(filteredPoints);
      }

      // Apply normalization if enabled
      if (options.normalization) {
        filteredPoints = this.normalize(filteredPoints);
      }

      // Sort by timestamp
      const sortedPoints = sortBy(filteredPoints, p => p.timestamp.getTime());

      // Calculate time range
      const timestamps = sortedPoints.map(p => p.timestamp);
      const timeRange = {
        start: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date(),
        end: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date(),
      };

      // Get unique sources, categories, and metrics
      const sources = Array.from(new Set(sortedPoints.map(p => p.source)));
      const categories = Array.from(new Set(sortedPoints.map(p => p.category)));
      const metrics = Array.from(new Set(sortedPoints.map(p => p.metric)));

      const consolidated: ConsolidatedData = {
        dataPoints: sortedPoints,
        sources,
        consolidatedAt: new Date(),
        timeRange,
        categories,
        metrics,
      };

      logger.info(`Consolidation complete: ${sortedPoints.length} data points`);
      logger.info(`Sources: ${sources.length}, Categories: ${categories.length}, Metrics: ${metrics.length}`);

      return consolidated;
    } catch (error) {
      logger.error('Error consolidating data', error);
      throw new Error(`Failed to consolidate data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize raw data to data points based on source type
   */
  private async normalizeRawData(rawData: RawData): Promise<DataPoint[]> {
    switch (rawData.sourceType) {
      case 'pdf':
        return await pdfExtractor.normalize(rawData);
      case 'web':
        return await webScraper.normalize(rawData);
      case 'looker_studio':
        return await lookerStudioConnector.normalize(rawData);
      default:
        logger.warn(`Unknown source type: ${rawData.sourceType}`);
        return [];
    }
  }

  /**
   * Apply filters to data points
   */
  private applyFilters(
    dataPoints: DataPoint[],
    options: ConsolidationOptions
  ): DataPoint[] {
    let filtered = [...dataPoints];

    // Filter by time range
    if (options.timeRange) {
      filtered = filtered.filter(p => {
        const timestamp = p.timestamp.getTime();
        return (
          timestamp >= options.timeRange!.start.getTime() &&
          timestamp <= options.timeRange!.end.getTime()
        );
      });
    }

    // Filter by categories
    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(p => options.categories!.includes(p.category));
    }

    // Filter by metrics
    if (options.metrics && options.metrics.length > 0) {
      filtered = filtered.filter(p => options.metrics!.includes(p.metric));
    }

    return filtered;
  }

  /**
   * Remove duplicate data points
   */
  private deduplicate(dataPoints: DataPoint[]): DataPoint[] {
    const seen = new Set<string>();
    const unique: DataPoint[] = [];

    for (const point of dataPoints) {
      // Create a hash key based on timestamp, category, metric, and value
      const key = `${point.timestamp.getTime()}-${point.category}-${point.metric}-${point.value}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(point);
      }
    }

    logger.info(`Deduplication: ${dataPoints.length} -> ${unique.length} data points`);
    return unique;
  }

  /**
   * Normalize data points (standardize units, formats, etc.)
   */
  private normalize(dataPoints: DataPoint[]): DataPoint[] {
    return dataPoints.map(point => {
      const normalized = { ...point };

      // Normalize units
      if (typeof point.value === 'number') {
        // Convert percentages
        if (point.unit === '%' && point.value > 1) {
          normalized.value = point.value / 100;
        }

        // Standardize currency (assuming USD)
        if (point.unit === 'currency') {
          normalized.unit = 'USD';
        }
      }

      return normalized;
    });
  }

  /**
   * Group data points by category
   */
  groupByCategory(dataPoints: DataPoint[]): Record<string, DataPoint[]> {
    return groupBy(dataPoints, p => p.category);
  }

  /**
   * Group data points by metric
   */
  groupByMetric(dataPoints: DataPoint[]): Record<string, DataPoint[]> {
    return groupBy(dataPoints, p => p.metric);
  }

  /**
   * Group data points by time period
   */
  groupByTimePeriod(
    dataPoints: DataPoint[],
    period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): Record<string, DataPoint[]> {
    return groupBy(dataPoints, p => {
      const date = p.timestamp;

      switch (period) {
        case 'day':
          return date.toISOString().split('T')[0];
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split('T')[0];
        case 'month':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          return `${date.getFullYear()}-Q${quarter}`;
        case 'year':
          return String(date.getFullYear());
        default:
          return date.toISOString();
      }
    });
  }

  /**
   * Aggregate data points by metric
   */
  aggregate(
    dataPoints: DataPoint[],
    metric: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'sum'
  ): number {
    const metricPoints = dataPoints.filter(p => p.metric === metric && typeof p.value === 'number');

    if (metricPoints.length === 0) return 0;

    const values = metricPoints.map(p => p.value as number);

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }

  /**
   * Get summary statistics for a metric
   */
  getSummaryStats(dataPoints: DataPoint[], metric: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    stdDev: number;
  } {
    const metricPoints = dataPoints.filter(p => p.metric === metric && typeof p.value === 'number');
    const values = metricPoints.map(p => p.value as number);

    if (values.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0, stdDev: 0 };
    }

    const sum = values.reduce((s, v) => s + v, 0);
    const avg = sum / values.length;
    const variance = values.reduce((v, val) => v + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: values.length,
      sum,
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev,
    };
  }
}

/**
 * Export singleton instance
 */
export const dataConsolidator = new DataConsolidator();
