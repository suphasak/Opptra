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
    console.log(`\n=== FIRST 1000 CHARS ===`);
    console.log(text.substring(0, 1000));
    console.log(`\n=== CHARS 5000-6000 ===`);
    console.log(text.substring(5000, 6000));
    console.log(`\n=== CHARS 10000-11000 ===`);
    console.log(text.substring(10000, 11000));
    console.log(`\n=== LAST 500 CHARS ===`);
    console.log(text.substring(text.length - 500));

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
      console.log(`  Processing brand-country combinations...`);
      // Pattern for each row: CountryBrandMTDYesterdayExtrapolatedTargetVariance
      // Example: "UAEUSPA-Footwear88,2743,693171,475180,510-9,035"
      // Numbers are concatenated WITHOUT spaces!
      for (const country of this.countries) {
        for (const brand of this.brands) {
          // Try different brand formats
          const brandVariants = [
            brand.replace(/\s/g, '-'),
            brand.replace(/\s/g, ''),
            brand,
          ];

          for (const brandVariant of brandVariants) {
            // Pattern: Country + Brand + Category (optional) + 5 numbers (no spaces!)
            // Format: UAEUSPA-Footwear88,2743,693171,475180,510-9,035
            const pattern = new RegExp(
              `${country}${brandVariant}[\\w-]*(\\d[\\d,]+)(\\d[\\d,]*)(\\d[\\d,]+)(\\d[\\d,]+)([-]?\\d[\\d,]*)`,
              'i'
            );

            const match = pattern.exec(tableSection);
            if (match) {
              console.log(`    MATCH: ${country} ${brand} - ${match[0].substring(0, 50)}...`);
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

    // Look for "Channel-wise Revenue" section (not "Channel Mix" which is summary)
    const channelSection = this.extractLargeSection(text, 'Channel-wise Revenue', 2000);

    console.log(`  Channel section found: ${!!channelSection}`);
    if (channelSection) {
      console.log(`  Channel section preview: ${channelSection.substring(0, 400)}`);
    }

    if (channelSection) {
      console.log(`  Processing channels...`);
      for (const channel of this.channels) {
        // Pattern: ChannelWeek1Week2Week3Week4MTD_Revenue
        // Example: "Namshi28,917.0857,239.4644,282.640130,439237,860..."
        // After Week3: 0130,439237,860... (Week4=0, MTD=130,439, Expected=237,860...)
        // Week 4: 0 or 962 (1-3 digits, non-greedy)
        // MTD: properly formatted number like 5,502 or 130,439 or 99,221
        // MTD format: 1-3 digits, then groups of ,DDD
        const pattern = new RegExp(
          `${channel}(\\d[\\d,]*\\.\\d{2})(\\d[\\d,]*\\.\\d{2})(\\d[\\d,]*\\.\\d{2})(\\d{1,3}?)(\\d{1,3}(?:,\\d{3})+)`,
          'i'
        );

        const match = pattern.exec(channelSection);
        if (match) {
          console.log(`    MATCH: ${channel} - Week1: ${match[1]}, Week2: ${match[2]}, Week3: ${match[3]}, Week4: ${match[4]}, MTD: ${match[5]}`);
          metrics.push({
            category: 'channel-performance',
            channel,
            metric: 'MTD Revenue',
            value: this.parseNumber(match[5]),
          });
        } else {
          console.log(`    NO MATCH for ${channel}`);
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

    console.log(`  Checking for marketing metrics...`);
    // Look for "Ad Performance" or marketing sections
    for (const channel of ['Noon', 'Namshi']) {
      const adSection = this.extractLargeSection(text, `${channel}.*Ad.*Metrics|${channel}.*Performance`, 1000);

      console.log(`    ${channel} ad section found: ${!!adSection}`);
      if (adSection) {
        console.log(`    ${channel} section preview: ${adSection.substring(0, 200)}`);
      }

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

    console.log(`  Profitability section found: ${!!profitSection}`);
    if (profitSection) {
      console.log(`  Profitability section preview: ${profitSection.substring(0, 300)}`);
    }

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
