/**
 * Fashion Business Intelligence Parser
 * Specialized for fashion brand performance analysis
 */

import { DataPoint } from '../types';
import { generateId } from '../utils/helpers';

export interface BusinessMetric {
  category: string; // financial, marketing, inventory, sku, channel
  brand?: string; // USPA, Penti, French Connection, CAMPUS
  country?: string; // KSA, UAE
  channel?: string; // Namshi, Noon, CP, Amazon, Trendyol
  metric: string;
  value: number;
  target?: number;
  variance?: number;
  variancePercent?: number;
}

export class FashionBusinessParser {
  private brands = ['USPA', 'Penti', 'French Connection', 'CAMPUS'];
  private countries = ['KSA', 'UAE'];
  private channels = ['Namshi', 'Noon', 'CP', 'Amazon', 'Trendyol'];

  /**
   * Parse comprehensive business metrics from Looker Studio PDF
   */
  parseBusinessMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // 1. Financial Performance
    metrics.push(...this.extractFinancialMetrics(text));

    // 2. Brand Performance
    metrics.push(...this.extractBrandMetrics(text));

    // 3. Channel Performance
    metrics.push(...this.extractChannelMetrics(text));

    // 4. Marketing Performance
    metrics.push(...this.extractMarketingMetrics(text));

    // 5. Profitability Metrics
    metrics.push(...this.extractProfitabilityMetrics(text));

    return metrics;
  }

  /**
   * Extract overall financial performance
   */
  private extractFinancialMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Pattern: Last Day, MTD, Expected, Target, Variance
    const financialPattern = /Last Day\s+([\d,]+)\s+MTD\s+([\d,]+)\s+Expected\s+([\d,]+|-)\s+Target\s+([\d,]+)\s+Variance\s+([-]?[\d,]+)\s+Variance %\s+([-]?[\d.]+)/gi;

    let match = financialPattern.exec(text);
    if (match) {
      const lastDay = this.parseNumber(match[1]);
      const mtd = this.parseNumber(match[2]);
      const expected = match[3] === '-' ? 0 : this.parseNumber(match[3]);
      const target = this.parseNumber(match[4]);
      const variance = this.parseNumber(match[5]);
      const variancePercent = parseFloat(match[6]);

      metrics.push({
        category: 'financial',
        metric: 'Revenue - Last Day',
        value: lastDay,
      });

      metrics.push({
        category: 'financial',
        metric: 'Revenue - MTD',
        value: mtd,
        target,
        variance,
        variancePercent,
      });

      metrics.push({
        category: 'financial',
        metric: 'Revenue - Expected EOM',
        value: expected,
        target,
      });
    }

    return metrics;
  }

  /**
   * Extract brand-level performance
   */
  private extractBrandMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Look for Country x Brand-Wise table
    const tableSection = this.extractSection(text, 'Country.*Brand.*Revenue', 1500);

    if (tableSection) {
      // Pattern: CountryBrandMTDYesterdayExtrapolatedTargetVariance
      for (const country of this.countries) {
        for (const brand of this.brands) {
          const brandPattern = new RegExp(
            `${country}${brand.replace(/\s/g, '-')}[^\\d]*(\\d+,?\\d*)\\s+(\\d+,?\\d*)\\s+(\\d+,?\\d*)\\s+(\\d+,?\\d*)\\s+([-]?\\d+,?\\d*)`,
            'i'
          );

          const match = brandPattern.exec(tableSection);
          if (match) {
            const mtd = this.parseNumber(match[1]);
            const _yesterday = this.parseNumber(match[2]);
            const _extrapolated = this.parseNumber(match[3]);
            const target = this.parseNumber(match[4]);
            const variance = this.parseNumber(match[5]);

            metrics.push({
              category: 'brand-performance',
              brand,
              country,
              metric: 'MTD Revenue',
              value: mtd,
              target,
              variance,
              variancePercent: (variance / target) * 100,
            });
          }
        }
      }
    }

    return metrics;
  }

  /**
   * Extract channel performance
   */
  private extractChannelMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Look for Channel-wise Revenue section
    const channelSection = this.extractSection(text, 'Channel.*Revenue', 1000);

    if (channelSection) {
      for (const channel of this.channels) {
        // Pattern: ChannelWeek1Week2Week3Week4MTD_Revenue
        const channelPattern = new RegExp(
          `${channel}[\\s\\d,.]+(\\d+,?\\d+)\\s+MTD`,
          'i'
        );

        const match = channelPattern.exec(channelSection);
        if (match) {
          const mtdRevenue = this.parseNumber(match[1]);

          metrics.push({
            category: 'channel-performance',
            channel,
            metric: 'MTD Revenue',
            value: mtdRevenue,
          });
        }
      }
    }

    return metrics;
  }

  /**
   * Extract marketing performance
   */
  private extractMarketingMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Look for Ad Performance sections
    for (const channel of ['Noon', 'Namshi']) {
      const adSection = this.extractSection(text, `${channel}.*Ad.*Metrics`, 500);

      if (adSection) {
        // Extract ROAS, CTR, CPC, ACos
        const roasMatch = adSection.match(/ROAS[\s\n]+([\d.]+)/i);
        const ctrMatch = adSection.match(/CTR.*%[\s\n]+([\d.]+)/i);
        const cpcMatch = adSection.match(/CPC.*\$[\s\n]+([\d.]+)/i);
        const acosMatch = adSection.match(/ACos.*%[\s\n]+([\d.]+)/i);
        const adSpendMatch = adSection.match(/Ad Spend.*\$[\s\n]+([\d,]+\.?\d*)/i);

        if (roasMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'ROAS',
            value: parseFloat(roasMatch[1]),
          });
        }

        if (ctrMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'CTR %',
            value: parseFloat(ctrMatch[1]),
          });
        }

        if (cpcMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'CPC',
            value: parseFloat(cpcMatch[1]),
          });
        }

        if (acosMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'ACos %',
            value: parseFloat(acosMatch[1]),
          });
        }

        if (adSpendMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'Ad Spend',
            value: this.parseNumber(adSpendMatch[1]),
          });
        }
      }
    }

    return metrics;
  }

  /**
   * Extract profitability metrics
   */
  private extractProfitabilityMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Look for Brand-Wise Profitability table
    const profitSection = this.extractSection(text, 'Brand-Wise Profitability', 800);

    if (profitSection) {
      for (const brand of this.brands) {
        const brandPattern = new RegExp(
          `${brand}[\\s\\n]+(\\d+\\.?\\d*)[\\s\\n]+(\\d+\\.?\\d*)[\\s\\n]+(\\d+\\.?\\d*)[\\s\\n]+(\\d+\\.?\\d*)[\\s\\n]+(\\d+\\.?\\d*)`,
          'i'
        );

        const match = brandPattern.exec(profitSection);
        if (match) {
          metrics.push(
            {
              category: 'profitability',
              brand,
              metric: 'GM %',
              value: parseFloat(match[1]),
            },
            {
              category: 'profitability',
              brand,
              metric: 'MKT %',
              value: parseFloat(match[2]),
            },
            {
              category: 'profitability',
              brand,
              metric: 'DC %',
              value: parseFloat(match[3]),
            },
            {
              category: 'profitability',
              brand,
              metric: 'IOWC %',
              value: parseFloat(match[4]),
            },
            {
              category: 'profitability',
              brand,
              metric: 'CM2 %',
              value: parseFloat(match[5]),
            }
          );
        }
      }
    }

    return metrics;
  }

  /**
   * Extract a section of text based on header
   */
  private extractSection(text: string, headerPattern: string, length: number): string | null {
    const regex = new RegExp(headerPattern, 'i');
    const match = text.match(regex);

    if (match && match.index !== undefined) {
      return text.substring(match.index, match.index + length);
    }

    return null;
  }

  /**
   * Parse number from string with commas
   */
  private parseNumber(value: string): number {
    return parseFloat(value.replace(/,/g, ''));
  }

  /**
   * Convert business metrics to DataPoints
   */
  metricsToDataPoints(
    metrics: BusinessMetric[],
    sourceId: string,
    timestamp: Date
  ): DataPoint[] {
    return metrics.map(metric => {
      // Build descriptive metric name
      const parts = [];
      if (metric.brand) parts.push(metric.brand);
      if (metric.country) parts.push(metric.country);
      if (metric.channel) parts.push(metric.channel);
      parts.push(metric.metric);

      const metricName = parts.join(' - ');

      return {
        id: generateId(),
        timestamp,
        category: metric.category,
        metric: metricName,
        value: metric.value,
        source: sourceId,
        metadata: {
          sourceType: 'pdf',
          brand: metric.brand,
          country: metric.country,
          channel: metric.channel,
          target: metric.target,
          variance: metric.variance,
          variancePercent: metric.variancePercent,
        },
      };
    });
  }
}

export const fashionBusinessParser = new FashionBusinessParser();
