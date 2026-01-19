/**
 * Fashion Business Intelligence Parser
 * Specialized for fashion brand performance analysis from Looker Studio PDFs
 */

import { DataPoint } from '../types';
import { generateId } from '../utils/helpers';

export interface BusinessMetric {
  category: string;
  brand?: string;
  country?: string;
  channel?: string;
  metric: string;
  value: number;
  target?: number;
  variance?: number;
  variancePercent?: number;
}

export class FashionBusinessParser {
  private brands = ['USPA', 'Penti', 'French Connection', 'CAMPUS', 'Nautica'];
  private countries = ['KSA', 'UAE'];
  private channels = ['Namshi', 'Noon', 'CP', 'Amazon', 'Trendyol'];

  /**
   * Parse comprehensive business metrics from Looker Studio PDF
   */
  parseBusinessMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    console.log('=== FASHION BUSINESS PARSER DEBUG ===');
    console.log(`Text length: ${text.length} characters`);
    console.log(`First 500 chars: ${text.substring(0, 500)}`);

    // Extract all key metrics
    const financials = this.extractOverallFinancials(text);
    console.log(`Extracted ${financials.length} financial metrics`);
    metrics.push(...financials);

    const brandCountry = this.extractBrandCountryPerformance(text);
    console.log(`Extracted ${brandCountry.length} brand-country metrics`);
    metrics.push(...brandCountry);

    const channels = this.extractChannelPerformance(text);
    console.log(`Extracted ${channels.length} channel metrics`);
    metrics.push(...channels);

    const marketing = this.extractMarketingMetrics(text);
    console.log(`Extracted ${marketing.length} marketing metrics`);
    metrics.push(...marketing);

    const profitability = this.extractProfitabilityMetrics(text);
    console.log(`Extracted ${profitability.length} profitability metrics`);
    metrics.push(...profitability);

    console.log(`TOTAL: ${metrics.length} metrics extracted`);
    console.log('=====================================');

    return metrics;
  }

  /**
   * Extract overall financial performance
   */
  private extractOverallFinancials(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Pattern: Multi-line format for Last Day, MTD, Expected, Target, Variance
    // Looking for: "Last Day\n11,992\nMTD\n270,790\n..."
    const overallSection = this.extractLargeSection(text, 'Country-wise Revenue|Grand total', 2000);

    console.log(`  Overall section found: ${!!overallSection}`);
    if (overallSection) {
      console.log(`  Overall section preview: ${overallSection.substring(0, 200)}`);

      // Extract Last Day
      const lastDayMatch = overallSection.match(/Last\s+Day[\s\n]+([\d,]+)/i);
      if (lastDayMatch) {
        metrics.push({
          category: 'financial',
          metric: 'Last Day Revenue',
          value: this.parseNumber(lastDayMatch[1]),
        });
      }

      // Extract MTD, Target, Variance (appears multiple times, take first occurrence)
      const mtdPattern = /MTD[\s\n]+([\d,]+)[\s\S]{0,200}?Target[\s\n]+([\d,]+)[\s\S]{0,200}?Variance[\s\n]+([-]?[\d,]+)[\s\S]{0,200}?Variance\s*%[\s\n]+([-]?[\d.]+)/i;
      const mtdMatch = text.match(mtdPattern);

      if (mtdMatch) {
        const mtd = this.parseNumber(mtdMatch[1]);
        const target = this.parseNumber(mtdMatch[2]);
        const variance = this.parseNumber(mtdMatch[3]);
        const variancePercent = parseFloat(mtdMatch[4]);

        metrics.push({
          category: 'financial',
          metric: 'MTD Revenue',
          value: mtd,
          target,
          variance,
          variancePercent,
        });
      }
    }

    return metrics;
  }

  /**
   * Extract brand x country performance from table
   */
  private extractBrandCountryPerformance(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Look for "Country x Brand-Wise Revenue" table
    const tableSection = this.extractLargeSection(text, 'Country.*Brand.*Revenue', 3000);

    console.log(`  Brand-country table section found: ${!!tableSection}`);
    if (tableSection) {
      console.log(`  Table section preview: ${tableSection.substring(0, 300)}`);
    } else {
      console.log(`  Searching for alternative patterns...`);
      // Try alternative header patterns
      const altSection = this.extractLargeSection(text, 'Country.*Brand|Brand.*Country', 3000);
      console.log(`  Alternative section found: ${!!altSection}`);
      if (altSection) {
        console.log(`  Alt section preview: ${altSection.substring(0, 300)}`);
      }
    }

    if (tableSection) {
      // Pattern for each row: CountryBrandMTDYesterdayExtrapolatedTargetVariance
      // Example: "UAEUSPA-Footwear88,2743,693171,475180,510-9,035"
      for (const country of this.countries) {
        for (const brand of this.brands) {
          // Try different brand formats
          const brandVariants = [
            brand.replace(/\s/g, '-'),
            brand.replace(/\s/g, ''),
            brand,
          ];

          for (const brandVariant of brandVariants) {
            // Pattern: Country + Brand + (optional category) + numbers
            const pattern = new RegExp(
              `${country}${brandVariant}[\\w-]*[\\s\\n]+(\\d[\\d,]+)[\\s\\n]+(\\d[\\d,]*)[\\s\\n]+(\\d[\\d,]+)[\\s\\n]+(\\d[\\d,]+)[\\s\\n]+([-]?\\d[\\d,]*)`,
              'i'
            );

            const match = pattern.exec(tableSection);
            if (match) {
              const mtd = this.parseNumber(match[1]);
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
                variancePercent: target !== 0 ? (variance / target) * 100 : 0,
              });
              break; // Found match, move to next brand
            }
          }
        }
      }
    }

    return metrics;
  }

  /**
   * Extract channel performance
   */
  private extractChannelPerformance(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Look for "Channel-wise Revenue" or "Channel.*Revenue" section
    const channelSection = this.extractLargeSection(text, 'Channel.*Revenue|Channel-wise', 2000);

    if (channelSection) {
      for (const channel of this.channels) {
        // Pattern: ChannelWeek1Week2...MTD_Revenue
        // Look for channel name followed by numbers, find the MTD value
        const pattern = new RegExp(
          `${channel}[\\s\\S]{0,300}?(\\d[\\d,]+)[\s\\n]+MTD`,
          'i'
        );

        const match = pattern.exec(channelSection);
        if (match) {
          metrics.push({
            category: 'channel-performance',
            channel,
            metric: 'MTD Revenue',
            value: this.parseNumber(match[1]),
          });
        }
      }
    }

    return metrics;
  }

  /**
   * Extract marketing performance metrics
   */
  private extractMarketingMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Look for "Ad Performance" or marketing sections
    for (const channel of ['Noon', 'Namshi']) {
      const adSection = this.extractLargeSection(text, `${channel}.*Ad.*Metrics|${channel}.*Performance`, 1000);

      if (adSection) {
        // Extract ROAS
        const roasMatch = adSection.match(/ROAS[\s\n]+([\d.]+)/i);
        if (roasMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'ROAS',
            value: parseFloat(roasMatch[1]),
          });
        }

        // Extract CTR %
        const ctrMatch = adSection.match(/CTR[\s\n]*%[\s\n]+([\d.]+)/i);
        if (ctrMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'CTR %',
            value: parseFloat(ctrMatch[1]),
          });
        }

        // Extract CPC
        const cpcMatch = adSection.match(/CPC[\s\n]*\$[\s\n]+([\d.]+)/i);
        if (cpcMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'CPC',
            value: parseFloat(cpcMatch[1]),
          });
        }

        // Extract ACos %
        const acosMatch = adSection.match(/ACos[\s\n]*\(?\s*%\)?[\s\n]+([\d.]+)/i);
        if (acosMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'ACos %',
            value: parseFloat(acosMatch[1]),
          });
        }

        // Extract Ad Spend
        const spendMatch = adSection.match(/Ad Spend[\s\S]{0,50}?\$?[\s\n]+([\d,]+\.?\d*)/i);
        if (spendMatch) {
          metrics.push({
            category: 'marketing',
            channel,
            metric: 'Ad Spend',
            value: this.parseNumber(spendMatch[1]),
          });
        }
      }
    }

    return metrics;
  }

  /**
   * Extract profitability metrics by brand
   */
  private extractProfitabilityMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Look for "Brand-Wise Profitability" table
    const profitSection = this.extractLargeSection(text, 'Brand.*Profitability|BrandGM%', 1500);

    if (profitSection) {
      for (const brand of this.brands) {
        // Pattern: BrandGM%MKT%DC%IOWC%CM2%
        // Example: "Penti56.418.7000" or with line breaks
        const pattern = new RegExp(
          `${brand}[\\s\\n]+(\\d+\\.?\\d*)[\\s\\n]+(\\d+\\.?\\d*)[\\s\\n]+(\\d+\\.?\\d*)[\\s\\n]+(\\d+\\.?\\d*)[\\s\\n]+(\\d+\\.?\\d*)`,
          'i'
        );

        const match = pattern.exec(profitSection);
        if (match) {
          const profitMetrics = [
            { name: 'GM %', value: parseFloat(match[1]) },
            { name: 'MKT %', value: parseFloat(match[2]) },
            { name: 'DC %', value: parseFloat(match[3]) },
            { name: 'IOWC %', value: parseFloat(match[4]) },
            { name: 'CM2 %', value: parseFloat(match[5]) },
          ];

          for (const pm of profitMetrics) {
            if (!isNaN(pm.value)) {
              metrics.push({
                category: 'profitability',
                brand,
                metric: pm.name,
                value: pm.value,
              });
            }
          }
        }
      }
    }

    return metrics;
  }

  /**
   * Extract a large section of text based on header pattern
   */
  private extractLargeSection(text: string, headerPattern: string, length: number): string | null {
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
