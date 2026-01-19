/**
 * Insight Generation Engine
 * Analyzes consolidated data and generates actionable business insights
 */

import {
  ConsolidatedData,
  DataPoint,
  Insight,
  InsightType,
  Priority,
} from '../types';
import { dataConsolidator } from '../consolidators/data-consolidator';
import { generateId, calculatePercentChange, average, standardDeviation } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Insight generation options
 */
export interface InsightGenerationOptions {
  enableTrendDetection?: boolean;
  enableAnomalyDetection?: boolean;
  enableCorrelation?: boolean;
  enablePrediction?: boolean;
  confidenceThreshold?: number; // 0-1
  minDataPoints?: number;
}

/**
 * Insight Generator class
 */
export class InsightGenerator {
  private defaultOptions: Required<InsightGenerationOptions> = {
    enableTrendDetection: true,
    enableAnomalyDetection: true,
    enableCorrelation: true,
    enablePrediction: false,
    confidenceThreshold: 0.6,
    minDataPoints: 3,
  };

  /**
   * Generate insights from consolidated data
   */
  async generateInsights(
    consolidatedData: ConsolidatedData,
    options: InsightGenerationOptions = {}
  ): Promise<Insight[]> {
    const opts = { ...this.defaultOptions, ...options };
    const insights: Insight[] = [];

    logger.info('Generating insights from consolidated data');

    try {
      // Group data by metric for analysis
      const metricGroups = dataConsolidator.groupByMetric(consolidatedData.dataPoints);

      for (const [metricName, points] of Object.entries(metricGroups)) {
        // Skip if not enough data points
        if (points.length < opts.minDataPoints) {
          continue;
        }

        // Trend detection
        if (opts.enableTrendDetection) {
          const trendInsights = this.detectTrends(points, metricName);
          insights.push(...trendInsights.filter(i => i.confidence >= opts.confidenceThreshold));
        }

        // Anomaly detection
        if (opts.enableAnomalyDetection) {
          const anomalyInsights = this.detectAnomalies(points, metricName);
          insights.push(...anomalyInsights.filter(i => i.confidence >= opts.confidenceThreshold));
        }
      }

      // Correlation analysis
      if (opts.enableCorrelation && consolidatedData.metrics.length >= 2) {
        const correlationInsights = this.detectCorrelations(consolidatedData);
        insights.push(...correlationInsights.filter(i => i.confidence >= opts.confidenceThreshold));
      }

      // Comparison insights
      const comparisonInsights = this.generateComparisons(consolidatedData);
      insights.push(...comparisonInsights.filter(i => i.confidence >= opts.confidenceThreshold));

      logger.info(`Generated ${insights.length} insights`);

      // Sort by priority and confidence
      return insights.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });
    } catch (error) {
      logger.error('Error generating insights', error);
      throw new Error(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect trends in data
   */
  private detectTrends(points: DataPoint[], metricName: string): Insight[] {
    const insights: Insight[] = [];
    const numericPoints = points.filter(p => typeof p.value === 'number');

    if (numericPoints.length < 2) return insights;

    // Sort by timestamp
    const sorted = numericPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const values = sorted.map(p => p.value as number);

    // Calculate trend using linear regression
    const { slope, confidence } = this.linearRegression(values);

    // Determine trend direction and significance
    const avgValue = average(values);
    const relativeSlope = Math.abs(slope / avgValue);

    if (relativeSlope > 0.05) { // 5% change is considered significant
      const trendDirection = slope > 0 ? 'up' : 'down';
      const changePercent = (slope / avgValue) * 100;

      // Calculate priority
      let priority: Priority;
      if (Math.abs(changePercent) > 20) {
        priority = Priority.CRITICAL;
      } else if (Math.abs(changePercent) > 10) {
        priority = Priority.HIGH;
      } else if (Math.abs(changePercent) > 5) {
        priority = Priority.MEDIUM;
      } else {
        priority = Priority.LOW;
      }

      const insight: Insight = {
        id: generateId(),
        type: InsightType.TREND,
        title: `${metricName} is trending ${trendDirection}`,
        description: `${metricName} shows a ${trendDirection}ward trend with approximately ${Math.abs(changePercent).toFixed(1)}% change over the period.`,
        category: sorted[0].category,
        metrics: [metricName],
        priority,
        confidence,
        data: {
          current: values[values.length - 1],
          previous: values[0],
          change: values[values.length - 1] - values[0],
          changePercent,
          trend: trendDirection,
          values: sorted.map(p => ({ date: p.timestamp, value: p.value as number })),
        },
        generatedAt: new Date(),
      };

      insights.push(insight);
    }

    return insights;
  }

  /**
   * Detect anomalies in data
   */
  private detectAnomalies(points: DataPoint[], metricName: string): Insight[] {
    const insights: Insight[] = [];
    const numericPoints = points.filter(p => typeof p.value === 'number');

    if (numericPoints.length < 3) return insights;

    const values = numericPoints.map(p => p.value as number);
    const avg = average(values);
    const stdDev = standardDeviation(values);

    // Detect outliers using z-score (values > 2 standard deviations)
    for (let i = 0; i < numericPoints.length; i++) {
      const value = values[i];
      const zScore = Math.abs((value - avg) / stdDev);

      if (zScore > 2) {
        const deviationPercent = ((value - avg) / avg) * 100;
        const isPositive = value > avg;

        let priority: Priority;
        if (zScore > 3) {
          priority = Priority.CRITICAL;
        } else if (zScore > 2.5) {
          priority = Priority.HIGH;
        } else {
          priority = Priority.MEDIUM;
        }

        const insight: Insight = {
          id: generateId(),
          type: InsightType.ANOMALY,
          title: `Unusual ${isPositive ? 'spike' : 'drop'} in ${metricName}`,
          description: `${metricName} showed an unusual ${isPositive ? 'increase' : 'decrease'} of ${Math.abs(deviationPercent).toFixed(1)}% from the average on ${numericPoints[i].timestamp.toLocaleDateString()}.`,
          category: numericPoints[i].category,
          metrics: [metricName],
          priority,
          confidence: Math.min(zScore / 3, 1), // Normalize z-score to 0-1
          data: {
            current: value,
            previous: avg,
            change: value - avg,
            changePercent: deviationPercent,
          },
          generatedAt: new Date(),
          metadata: {
            zScore,
            timestamp: numericPoints[i].timestamp,
          },
        };

        insights.push(insight);
      }
    }

    return insights;
  }

  /**
   * Detect correlations between metrics
   */
  private detectCorrelations(data: ConsolidatedData): Insight[] {
    const insights: Insight[] = [];
    const metrics = data.metrics;

    // Calculate correlations between all pairs of metrics
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];

        const correlation = this.calculateCorrelation(data.dataPoints, metric1, metric2);

        // Only report strong correlations (|r| > 0.7)
        if (Math.abs(correlation) > 0.7) {
          const isPositive = correlation > 0;

          const insight: Insight = {
            id: generateId(),
            type: InsightType.CORRELATION,
            title: `${isPositive ? 'Positive' : 'Negative'} correlation between ${metric1} and ${metric2}`,
            description: `${metric1} and ${metric2} show a ${isPositive ? 'strong positive' : 'strong negative'} correlation (${(correlation * 100).toFixed(0)}%). As ${metric1} ${isPositive ? 'increases' : 'decreases'}, ${metric2} tends to ${isPositive ? 'increase' : 'decrease'} as well.`,
            category: 'correlation-analysis',
            metrics: [metric1, metric2],
            priority: Priority.MEDIUM,
            confidence: Math.abs(correlation),
            data: {},
            generatedAt: new Date(),
            metadata: {
              correlationCoefficient: correlation,
            },
          };

          insights.push(insight);
        }
      }
    }

    return insights;
  }

  /**
   * Generate comparison insights
   */
  private generateComparisons(data: ConsolidatedData): Insight[] {
    const insights: Insight[] = [];

    // Group by time periods to compare
    const monthly = dataConsolidator.groupByTimePeriod(data.dataPoints, 'month');
    const monthKeys = Object.keys(monthly).sort();

    if (monthKeys.length >= 2) {
      const currentMonth = monthKeys[monthKeys.length - 1];
      const previousMonth = monthKeys[monthKeys.length - 2];

      const metricGroups = dataConsolidator.groupByMetric(data.dataPoints);

      for (const [metricName, points] of Object.entries(metricGroups)) {
        const currentPoints = points.filter(p => {
          const month = `${p.timestamp.getFullYear()}-${String(p.timestamp.getMonth() + 1).padStart(2, '0')}`;
          return month === currentMonth && typeof p.value === 'number';
        });

        const previousPoints = points.filter(p => {
          const month = `${p.timestamp.getFullYear()}-${String(p.timestamp.getMonth() + 1).padStart(2, '0')}`;
          return month === previousMonth && typeof p.value === 'number';
        });

        if (currentPoints.length > 0 && previousPoints.length > 0) {
          const currentAvg = average(currentPoints.map(p => p.value as number));
          const previousAvg = average(previousPoints.map(p => p.value as number));
          const changePercent = calculatePercentChange(currentAvg, previousAvg);

          if (Math.abs(changePercent) > 5) { // 5% change threshold
            const isIncrease = changePercent > 0;

            let priority: Priority;
            if (Math.abs(changePercent) > 20) {
              priority = Priority.HIGH;
            } else if (Math.abs(changePercent) > 10) {
              priority = Priority.MEDIUM;
            } else {
              priority = Priority.LOW;
            }

            const insight: Insight = {
              id: generateId(),
              type: InsightType.COMPARISON,
              title: `${metricName} ${isIncrease ? 'increased' : 'decreased'} month-over-month`,
              description: `${metricName} ${isIncrease ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}% compared to the previous month.`,
              category: currentPoints[0].category,
              metrics: [metricName],
              priority,
              confidence: 0.9,
              data: {
                current: currentAvg,
                previous: previousAvg,
                change: currentAvg - previousAvg,
                changePercent,
                trend: isIncrease ? 'up' : 'down',
              },
              generatedAt: new Date(),
              metadata: {
                currentPeriod: currentMonth,
                previousPeriod: previousMonth,
              },
            };

            insights.push(insight);
          }
        }
      }
    }

    return insights;
  }

  /**
   * Linear regression to calculate trend
   */
  private linearRegression(values: number[]): { slope: number; intercept: number; confidence: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);

    const rSquared = 1 - ssResidual / ssTotal;
    const confidence = Math.max(0, Math.min(1, rSquared));

    return { slope, intercept, confidence };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(points: DataPoint[], metric1: string, metric2: string): number {
    const metric1Points = points.filter(p => p.metric === metric1 && typeof p.value === 'number');
    const metric2Points = points.filter(p => p.metric === metric2 && typeof p.value === 'number');

    // Find matching timestamps
    const pairs: Array<{ x: number; y: number }> = [];

    for (const p1 of metric1Points) {
      const p2 = metric2Points.find(p =>
        Math.abs(p.timestamp.getTime() - p1.timestamp.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day
      );

      if (p2) {
        pairs.push({ x: p1.value as number, y: p2.value as number });
      }
    }

    if (pairs.length < 3) return 0;

    const xValues = pairs.map(p => p.x);
    const yValues = pairs.map(p => p.y);

    const xMean = average(xValues);
    const yMean = average(yValues);

    const numerator = pairs.reduce((sum, p) => sum + (p.x - xMean) * (p.y - yMean), 0);
    const xVariance = pairs.reduce((sum, p) => sum + Math.pow(p.x - xMean, 2), 0);
    const yVariance = pairs.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);

    const denominator = Math.sqrt(xVariance * yVariance);

    return denominator === 0 ? 0 : numerator / denominator;
  }
}

/**
 * Export singleton instance
 */
export const insightGenerator = new InsightGenerator();
