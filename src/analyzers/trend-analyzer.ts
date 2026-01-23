/**
 * Trend Analysis Engine
 * Analyzes historical performance across multiple PDF reports
 */

import { ConsolidatedData } from '../types';
import fs from 'fs/promises';
import path from 'path';
import { pdfExtractor } from '../extractors/pdf-extractor';
import { fashionBusinessParser, DateInfo } from '../extractors/fashion-business-parser';

export interface TrendPoint {
  date: Date;
  value: number;
  label?: string;  // e.g., "Week 1", "Week 2"
}

export interface TrendAnalysis {
  metric: string;
  brand?: string;
  market?: string;
  channel?: string;
  dataPoints: TrendPoint[];
  trend: '↗️ improving' | '↘️ declining' | '→ stable';
  weekOverWeekChange?: number;  // Percentage
  acceleration?: number;         // Change in growth rate
  forecast?: number;             // Predicted next value
  confidence: number;            // 0-1
  insights: string[];
}

export class TrendAnalyzer {
  /**
   * Analyze trends from multiple PDF files
   */
  async analyzeTrendsFromPDFs(dataFolder: string): Promise<{
    overall: TrendAnalysis[];
    brands: TrendAnalysis[];
    channels: TrendAnalysis[];
    dateRange: { start: Date; end: Date; files: number };
  }> {
    const pdfFiles = await this.getPDFFiles(dataFolder);

    if (pdfFiles.length < 2) {
      return {
        overall: [],
        brands: [],
        channels: [],
        dateRange: { start: new Date(), end: new Date(), files: 0 },
      };
    }

    // Extract data from all PDFs
    const allData: Array<{ date: Date; data: ConsolidatedData; filename: string }> = [];

    for (const file of pdfFiles) {
      try {
        const filename = path.basename(file);
        const rawData = await pdfExtractor.extract(file, `pdf_${filename}`);
        const text = rawData.data.text || '';

        // Extract date info
        const dateInfo = fashionBusinessParser.extractDateInfo(filename, text);

        // Parse metrics
        const metrics = fashionBusinessParser.parseBusinessMetrics(text);
        const dataPoints = fashionBusinessParser.metricsToDataPoints(metrics, `pdf_${filename}`, new Date());

        // Create consolidated data structure
        const consolidatedData: ConsolidatedData = {
          sources: [file],
          dataPoints,
          categories: ['financial', 'brand-performance', 'channel-performance', 'profitability'],
          metrics: Array.from(new Set(dataPoints.map(dp => dp.metric))),
          consolidatedAt: new Date(),
          timeRange: {
            start: dateInfo.mtdStartDate || new Date(),
            end: dateInfo.mtdEndDate || new Date(),
          },
          metadata: { dateInfo },
        };

        allData.push({
          date: dateInfo.mtdEndDate || dateInfo.dataEndDate || new Date(),
          data: consolidatedData,
          filename,
        });
      } catch (error) {
        console.warn(`Failed to process ${file}:`, error);
      }
    }

    // Sort by date
    allData.sort((a, b) => a.date.getTime() - b.date.getTime());

    const dateRange = {
      start: allData[0].date,
      end: allData[allData.length - 1].date,
      files: allData.length,
    };

    // Analyze trends
    const overall = this.analyzeOverallTrends(allData);
    const brands = this.analyzeBrandTrends(allData);
    const channels = this.analyzeChannelTrends(allData);

    return {
      overall,
      brands,
      channels,
      dateRange,
    };
  }

  /**
   * Get all PDF files from a folder
   */
  private async getPDFFiles(folder: string): Promise<string[]> {
    try {
      const files = await fs.readdir(folder);
      return files
        .filter(f => f.endsWith('.pdf'))
        .map(f => path.join(folder, f))
        .sort();
    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze overall MTD revenue trends
   */
  private analyzeOverallTrends(
    allData: Array<{ date: Date; data: ConsolidatedData; filename: string }>
  ): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];

    // MTD Revenue trend
    const mtdRevenuePoints: TrendPoint[] = [];

    for (const item of allData) {
      const mtdRevenue = item.data.dataPoints.find(
        dp => dp.metric === 'MTD Revenue' && dp.category === 'financial'
      );

      if (mtdRevenue) {
        mtdRevenuePoints.push({
          date: item.date,
          value: mtdRevenue.value as number,
          label: this.getWeekLabel(item.date),
        });
      }
    }

    if (mtdRevenuePoints.length >= 2) {
      trends.push(this.calculateTrend('MTD Revenue', mtdRevenuePoints));
    }

    return trends;
  }

  /**
   * Analyze brand-specific trends
   */
  private analyzeBrandTrends(
    allData: Array<{ date: Date; data: ConsolidatedData; filename: string }>
  ): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];

    // Get unique brand-market combinations
    const brandMarkets = new Set<string>();

    for (const item of allData) {
      const brandData = item.data.dataPoints.filter(dp => dp.category === 'brand-performance');
      for (const bd of brandData) {
        const key = `${bd.metadata?.brand}_${bd.metadata?.country}`;
        brandMarkets.add(key);
      }
    }

    // Analyze each brand-market
    for (const key of brandMarkets) {
      const [brand, market] = key.split('_');
      const dataPoints: TrendPoint[] = [];

      for (const item of allData) {
        const brandData = item.data.dataPoints.find(
          dp => dp.category === 'brand-performance' &&
                dp.metadata?.brand === brand &&
                dp.metadata?.country === market
        );

        if (brandData) {
          dataPoints.push({
            date: item.date,
            value: brandData.value as number,
            label: this.getWeekLabel(item.date),
          });
        }
      }

      if (dataPoints.length >= 2) {
        const trendAnalysis = this.calculateTrend(`${brand} - ${market} MTD Revenue`, dataPoints, brand, market);
        trends.push(trendAnalysis);
      }
    }

    return trends;
  }

  /**
   * Analyze channel trends
   */
  private analyzeChannelTrends(
    allData: Array<{ date: Date; data: ConsolidatedData; filename: string }>
  ): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];

    // Get unique channels
    const channels = new Set<string>();

    for (const item of allData) {
      const channelData = item.data.dataPoints.filter(dp => dp.category === 'channel-performance');
      for (const cd of channelData) {
        if (cd.metadata?.channel) {
          channels.add(cd.metadata.channel as string);
        }
      }
    }

    // Analyze each channel
    for (const channel of channels) {
      const dataPoints: TrendPoint[] = [];

      for (const item of allData) {
        const channelData = item.data.dataPoints.find(
          dp => dp.category === 'channel-performance' && dp.metadata?.channel === channel
        );

        if (channelData) {
          dataPoints.push({
            date: item.date,
            value: channelData.value as number,
            label: this.getWeekLabel(item.date),
          });
        }
      }

      if (dataPoints.length >= 2) {
        const trendAnalysis = this.calculateTrend(`${channel} MTD Revenue`, dataPoints, undefined, undefined, channel);
        trends.push(trendAnalysis);
      }
    }

    return trends;
  }

  /**
   * Calculate trend metrics and insights
   */
  private calculateTrend(
    metric: string,
    dataPoints: TrendPoint[],
    brand?: string,
    market?: string,
    channel?: string
  ): TrendAnalysis {
    // Calculate week-over-week change (last vs previous)
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const previousValue = dataPoints[dataPoints.length - 2].value;
    const weekOverWeekChange = ((lastValue - previousValue) / previousValue) * 100;

    // Calculate acceleration (change in growth rate)
    let acceleration = 0;
    if (dataPoints.length >= 3) {
      const secondLastValue = dataPoints[dataPoints.length - 3].value;
      const previousGrowth = ((previousValue - secondLastValue) / secondLastValue) * 100;
      const currentGrowth = weekOverWeekChange;
      acceleration = currentGrowth - previousGrowth;
    }

    // Determine trend direction
    let trend: '↗️ improving' | '↘️ declining' | '→ stable';
    if (Math.abs(weekOverWeekChange) < 1) {
      trend = '→ stable';
    } else if (weekOverWeekChange > 0) {
      trend = '↗️ improving';
    } else {
      trend = '↘️ declining';
    }

    // Simple forecast: linear extrapolation
    const forecast = lastValue * (1 + (weekOverWeekChange / 100));

    // Generate insights
    const insights: string[] = [];

    if (trend === '↗️ improving') {
      insights.push(`Trend: ${trend} with ${weekOverWeekChange.toFixed(1)}% week-over-week growth`);

      if (acceleration < -2) {
        insights.push(`⚠️ Growth is DECELERATING (${acceleration.toFixed(1)} pts) - momentum slowing`);
      } else if (acceleration > 2) {
        insights.push(`📈 Growth is ACCELERATING (+${acceleration.toFixed(1)} pts) - momentum building`);
      }
    } else if (trend === '↘️ declining') {
      insights.push(`🔴 Trend: ${trend} with ${weekOverWeekChange.toFixed(1)}% week-over-week decline`);
      insights.push(`⚠️ CRITICAL: Investigate cause of decline immediately`);
    } else {
      insights.push(`Trend: ${trend} - revenue holding steady`);
    }

    // Add specific recommendations
    if (trend === '↘️ declining' && (brand || channel)) {
      insights.push(`Action: ${brand ? `Review ${brand} ${market}` : `Analyze ${channel}`} performance - check inventory, campaigns, competition`);
    }

    return {
      metric,
      brand,
      market,
      channel,
      dataPoints,
      trend,
      weekOverWeekChange,
      acceleration,
      forecast,
      confidence: dataPoints.length >= 4 ? 0.8 : 0.6,
      insights,
    };
  }

  /**
   * Get week label from date
   */
  private getWeekLabel(date: Date): string {
    const day = date.getDate();
    if (day <= 7) return 'Week 1';
    if (day <= 14) return 'Week 2';
    if (day <= 21) return 'Week 3';
    return 'Week 4';
  }

  /**
   * Format trend summary for display
   */
  formatTrendSummary(trends: TrendAnalysis[]): string {
    if (trends.length === 0) {
      return 'Insufficient historical data for trend analysis (need 2+ PDFs)';
    }

    let summary = '📈 **Trend Analysis**\n\n';

    for (const trend of trends) {
      const points = trend.dataPoints.map(dp =>
        `${dp.label}: $${Math.round(dp.value / 1000)}K`
      ).join(' → ');

      summary += `**${trend.metric}**\n`;
      summary += `${points}\n`;
      summary += `${trend.insights.join('\n')}\n\n`;
    }

    return summary;
  }
}

export const trendAnalyzer = new TrendAnalyzer();
