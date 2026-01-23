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

export interface DateInfo {
  reportDate?: Date;        // Date when report was generated (from filename)
  dataEndDate?: Date;        // Last day of data in report (D-2 from report date)
  mtdStartDate?: Date;       // Start of MTD period
  mtdEndDate?: Date;         // End of MTD period
  daysInPeriod?: number;     // Number of days in MTD period
  daysRemaining?: number;    // Days remaining in month
  month?: string;            // Month name (e.g., "January")
  year?: number;             // Year
}

export class FashionBusinessParser {
  private brands = ['USPA', 'Penti', 'French Connection', 'CAMPUS', 'Puma', 'Nautica'];
  private countries = ['KSA', 'UAE'];
  private channels = ['Namshi', 'Noon', 'CP', 'Amazon_1P', 'Trendyol'];

  /**
   * Parse comprehensive business metrics from Looker Studio PDF
   */
  parseBusinessMetrics(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];


    // Extract all key metrics
    const financials = this.extractOverallFinancials(text);
    metrics.push(...financials);

    const brandCountry = this.extractBrandCountryPerformance(text);
    metrics.push(...brandCountry);

    const channels = this.extractChannelPerformance(text);
    metrics.push(...channels);

    const marketing = this.extractMarketingMetrics(text);
    metrics.push(...marketing);

    const profitability = this.extractProfitabilityMetrics(text);
    metrics.push(...profitability);


    return metrics;
  }

  /**
   * Extract overall financial performance
   */
  private extractOverallFinancials(text: string): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    // Pattern: Multi-line format for Last Day, MTD, Expected, Target, Variance
    // CRITICAL: Extract from "Profitability" section (JANUARY data), NOT "Country-wise Revenue" or "Channel Mix"
    // Profitability section has the correct current month MTD with Target and Variance
    const overallSection = this.extractLargeSection(text, 'Profitability.*%', 1000);

    if (overallSection) {

      // Extract Last Day
      const lastDayMatch = overallSection.match(/Last\s+Day[\s\n]+([\d,]+)/i);
      if (lastDayMatch) {
        metrics.push({
          category: 'financial',
          metric: 'Last Day Revenue',
          value: this.parseNumber(lastDayMatch[1]),
        });
      }

      // Extract MTD, Target, Variance from Country-wise Revenue section ONLY (not Channel Mix)
      // IMPORTANT: Match against overallSection, NOT full text to avoid December data from Channel Mix
      const mtdPattern = /MTD[\s\n]+([\d,]+)[\s\S]{0,200}?Target[\s\n]+([\d,]+)[\s\S]{0,200}?Variance[\s\n]+([-]?[\d,]+)[\s\S]{0,200}?Variance\s*%[\s\n]+([-]?[\d.]+)/i;
      const mtdMatch = overallSection.match(mtdPattern);

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

    if (tableSection) {
    } else {
      // Try alternative header patterns
      const altSection = this.extractLargeSection(text, 'Country.*Brand|Brand.*Country', 3000);
      if (altSection) {
      }
    }

    if (tableSection) {
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
            // Pattern: Country + Brand + Category (optional) + 5 concatenated numbers
            // Format: KSAUSPA-Footwear145,5147,332265,964270,764-4,800
            // Parse from both ends: MTD (start) and Variance (end) have fixed formats
            // MTD: d{1,3},d{3} | Yesterday: variable | Extrapolated: d{2,3},d{3} | Target: d{2,3},d{3} | Variance: -d{1,3},d{3}
            // [A-Za-z-]* matches category like "-Footwear" but NOT digits
            const pattern = new RegExp(
              `${country}${brandVariant}[A-Za-z-]*(\\d{1,3},\\d{3})(.*?)(\\d{2,3},\\d{3})(\\d{2,3},\\d{3})([-]\\d{1,3},\\d{3})`,
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

    // Look for "Channel-wise Revenue" section (not "Channel Mix" which is summary)
    const channelSection = this.extractLargeSection(text, 'Channel-wise Revenue', 2000);

    if (channelSection) {
    }

    if (channelSection) {
      for (const channel of this.channels) {
        // Pattern: ChannelWeek1Week2Week3Week4MTD_Revenue
        // Example: "Namshi28,917.0857,239.4644,282.640130,439237,860..."
        // Week 4 can be: 0, 962, or 96.3 (integer or decimal, non-greedy!)
        // MTD: properly formatted number like 5,502 or 130,439
        const pattern = new RegExp(
          `${channel}(\\d[\\d,]*\\.\\d{2})(\\d[\\d,]*\\.\\d{2})(\\d[\\d,]*\\.\\d{2})(\\d{1,3}?(?:\\.\\d{1,2})?)(\\d{1,3}(?:,\\d{3})+)`,
          'i'
        );

        const match = pattern.exec(channelSection);
        if (match) {
          metrics.push({
            category: 'channel-performance',
            channel,
            metric: 'MTD Revenue',
            value: this.parseNumber(match[5]),
          });
        } else {
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

    if (profitSection) {
    }

    if (profitSection) {
      for (const brand of this.brands) {
        // Pattern: BrandGM%MKT%DC%IOWC%CM2%
        // Example: "Penti56.418.7000" - all CONCATENATED with NO spaces!
        // Numbers are decimals like 56.4, 18.7, 0, 0, 0
        const pattern = new RegExp(
          `${brand}(\\d+\\.?\\d*)(\\d+\\.?\\d*)(\\d+\\.?\\d*)(\\d+\\.?\\d*)(\\d+\\.?\\d*)`,
          'i'
        );

        const match = pattern.exec(profitSection);
        if (match) {
        } else {
        }

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
   * Extract date information from PDF filename and content
   * Implements D-2 logic: file dated 23rd contains data through 21st
   */
  extractDateInfo(filename: string, text: string): DateInfo {
    const dateInfo: DateInfo = {};

    // Extract from filename: "23rd-jan.pdf" or "jan-23.pdf" or "2026-01-23.pdf"
    const filenamePatterns = [
      /(\d{1,2})(?:st|nd|rd|th)?[-_\s]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_\s]?(\d{1,2})/i,
      /(\d{4})[-_](\d{1,2})[-_](\d{1,2})/,
    ];

    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    for (const pattern of filenamePatterns) {
      const match = filename.match(pattern);
      if (match) {
        let day: number, month: number, year: number = new Date().getFullYear();

        if (match[0].includes('-') && match[0].match(/\d{4}/)) {
          // Format: 2026-01-23
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else if (match[2] && !isNaN(parseInt(match[2]))) {
          // Format: 23rd-jan
          day = parseInt(match[1]);
          month = monthMap[match[2].toLowerCase()];
        } else {
          // Format: jan-23
          month = monthMap[match[1].toLowerCase()];
          day = parseInt(match[2]);
        }

        dateInfo.reportDate = new Date(year, month, day);

        // Apply D-2 logic: data is through 2 days before report date
        dateInfo.dataEndDate = new Date(year, month, day - 2);

        break;
      }
    }

    // Try to extract MTD period from PDF content
    // Look for patterns like "Jan 1 - Jan 21" or "MTD (as of Jan 21)" or "January 1-21"
    const mtdPatterns = [
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i,
      /MTD.*?(?:as of|through).*?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*-\s*(\d{1,2})/i,
    ];

    const currentYear = new Date().getFullYear();

    for (const pattern of mtdPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[4]) {
          // Format: "Jan 1 - Jan 21"
          const startMonth = monthMap[match[1].substring(0, 3).toLowerCase()];
          const startDay = parseInt(match[2]);
          const endMonth = monthMap[match[3].substring(0, 3).toLowerCase()];
          const endDay = parseInt(match[4]);

          dateInfo.mtdStartDate = new Date(currentYear, startMonth, startDay);
          dateInfo.mtdEndDate = new Date(currentYear, endMonth, endDay);
        } else if (match[2]) {
          // Format: "MTD as of Jan 21"
          const endMonth = monthMap[match[1].substring(0, 3).toLowerCase()];
          const endDay = parseInt(match[2]);

          dateInfo.mtdEndDate = new Date(currentYear, endMonth, endDay);
          dateInfo.mtdStartDate = new Date(currentYear, endMonth, 1); // Assume month start
        } else if (match[3]) {
          // Format: "January 1-21"
          const monthName = match[1].substring(0, 3).toLowerCase();
          const month = monthMap[monthName];
          const startDay = parseInt(match[2]);
          const endDay = parseInt(match[3]);

          dateInfo.mtdStartDate = new Date(currentYear, month, startDay);
          dateInfo.mtdEndDate = new Date(currentYear, month, endDay);
        }
        break;
      }
    }

    // If we have dataEndDate from filename, use it as mtdEndDate if not found in content
    if (dateInfo.dataEndDate && !dateInfo.mtdEndDate) {
      dateInfo.mtdEndDate = dateInfo.dataEndDate;
      dateInfo.mtdStartDate = new Date(dateInfo.dataEndDate.getFullYear(), dateInfo.dataEndDate.getMonth(), 1);
    }

    // Calculate derived fields
    if (dateInfo.mtdStartDate && dateInfo.mtdEndDate) {
      const daysDiff = Math.floor((dateInfo.mtdEndDate.getTime() - dateInfo.mtdStartDate.getTime()) / (1000 * 60 * 60 * 24));
      dateInfo.daysInPeriod = daysDiff + 1; // Include both start and end day

      // Calculate days remaining in month
      const lastDayOfMonth = new Date(dateInfo.mtdEndDate.getFullYear(), dateInfo.mtdEndDate.getMonth() + 1, 0).getDate();
      dateInfo.daysRemaining = lastDayOfMonth - dateInfo.mtdEndDate.getDate();

      // Extract month and year
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      dateInfo.month = monthNames[dateInfo.mtdEndDate.getMonth()];
      dateInfo.year = dateInfo.mtdEndDate.getFullYear();
    }

    return dateInfo;
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
