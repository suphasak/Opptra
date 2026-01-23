/**
 * Root Cause Analyzer
 * Provides granular, data-backed root cause analysis for brand-market performance
 */

import { ConsolidatedData, DataPoint } from '../types';

export interface RootCause {
  factor: string;                    // "Marketing Inefficiency", "Profitability Pressure"
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: number;                    // Dollar impact
  impactPercent: number;             // Percentage of total gap
  evidence: string[];                // Data points backing this up
  dataPoints: Record<string, number>; // Actual metrics
  recommendation: string;            // Specific action
}

export interface BrandMarketRootCauses {
  brand: string;
  market: string;
  gap: number;
  gapPercent: number;
  rootCauses: RootCause[];
  totalExplainedImpact: number;      // Sum of all root cause impacts
  unexplainedGap: number;            // Gap not explained by identified factors
}

export class RootCauseAnalyzer {
  /**
   * Analyze root causes for a specific brand-market combination
   */
  analyzeBrandMarket(
    brand: string,
    market: string,
    revenue: number,
    target: number,
    variance: number,
    variancePercent: number,
    data: ConsolidatedData
  ): BrandMarketRootCauses {
    const rootCauses: RootCause[] = [];

    // Get all relevant data points for this brand-market
    const brandData = data.dataPoints.filter(
      d => d.metadata?.brand === brand && d.metadata?.country === market
    );

    const portfolioAvg = this.calculatePortfolioAverages(data);

    // 1. Marketing Efficiency Analysis
    const marketingCause = this.analyzeMarketingEfficiency(
      brand, market, revenue, variance, brandData, portfolioAvg
    );
    if (marketingCause) rootCauses.push(marketingCause);

    // 2. Profitability/Margin Analysis
    const profitabilityCause = this.analyzeProfitability(
      brand, market, revenue, variance, brandData, portfolioAvg
    );
    if (profitabilityCause) rootCauses.push(profitabilityCause);

    // 3. Channel Concentration Risk
    const channelCause = this.analyzeChannelConcentration(
      brand, market, revenue, variance, data
    );
    if (channelCause) rootCauses.push(channelCause);

    // 4. Week-over-Week Trend (if data available)
    const trendCause = this.analyzeTrend(
      brand, market, revenue, variance, data
    );
    if (trendCause) rootCauses.push(trendCause);

    // Sort by impact (highest first)
    rootCauses.sort((a, b) => b.impact - a.impact);

    const totalExplainedImpact = rootCauses.reduce((sum, rc) => sum + rc.impact, 0);
    const unexplainedGap = Math.abs(variance) - totalExplainedImpact;

    return {
      brand,
      market,
      gap: variance,
      gapPercent: variancePercent,
      rootCauses,
      totalExplainedImpact,
      unexplainedGap: Math.max(0, unexplainedGap),
    };
  }

  /**
   * Analyze marketing efficiency issues
   */
  private analyzeMarketingEfficiency(
    brand: string,
    market: string,
    revenue: number,
    variance: number,
    brandData: DataPoint[],
    portfolioAvg: Record<string, number>
  ): RootCause | null {
    // Find MKT% for this brand
    const mktMetric = brandData.find(d => d.metric.includes('MKT %'));
    if (!mktMetric) return null;

    const mktPercent = mktMetric.value as number;

    // Industry benchmarks
    const benchmarks: Record<string, number> = {
      'USPA': 5.5,        // Footwear
      'CAMPUS': 5.5,      // Footwear
      'Puma': 5.5,        // Footwear
      'Penti': 7.0,       // Innerwear
      'French Connection': 6.5, // Apparel
    };

    const benchmark = benchmarks[brand] || 6.0;
    const mktDiff = mktPercent - benchmark;

    // Only flag if >1% above benchmark (significant overspend)
    if (mktDiff > 1.0) {
      const monthlyOverspend = revenue * (mktDiff / 100);
      const impact = monthlyOverspend;

      return {
        factor: 'Marketing Inefficiency',
        severity: mktDiff > 2 ? 'critical' : 'high',
        impact: Math.round(impact),
        impactPercent: (impact / Math.abs(variance)) * 100,
        evidence: [
          `MKT% at ${mktPercent.toFixed(1)}% vs ${benchmark}% benchmark (+${mktDiff.toFixed(1)} pts)`,
          `Monthly overspend: $${Math.round(monthlyOverspend).toLocaleString()}`,
          `Revenue: $${revenue.toLocaleString()}, MKT spend: $${Math.round(revenue * mktPercent / 100).toLocaleString()}`,
        ],
        dataPoints: {
          currentMKT: mktPercent,
          benchmarkMKT: benchmark,
          difference: mktDiff,
          monthlyOverspend: Math.round(monthlyOverspend),
        },
        recommendation: `Pause bottom 20% campaigns with ROAS <2.0. Target: ${(benchmark + 0.5).toFixed(1)}% MKT spend. Expected savings: $${Math.round(monthlyOverspend).toLocaleString()}/month.`,
      };
    }

    return null;
  }

  /**
   * Analyze profitability/margin issues
   */
  private analyzeProfitability(
    brand: string,
    market: string,
    revenue: number,
    variance: number,
    brandData: DataPoint[],
    portfolioAvg: Record<string, number>
  ): RootCause | null {
    // Find GM% for this brand
    const gmMetric = brandData.find(d => d.metric.includes('GM %'));
    if (!gmMetric) return null;

    const gmPercent = gmMetric.value as number;
    const avgGM = portfolioAvg.gmPercent || 50;
    const gmDiff = avgGM - gmPercent;

    // Only flag if >10 points below average (significant margin issue)
    if (gmDiff > 10) {
      const lostMargin = revenue * (gmDiff / 100);
      const impact = lostMargin;

      return {
        factor: 'Profitability Pressure',
        severity: gmDiff > 20 ? 'critical' : 'high',
        impact: Math.round(impact),
        impactPercent: (impact / Math.abs(variance)) * 100,
        evidence: [
          `GM at ${gmPercent.toFixed(1)}% vs portfolio avg ${avgGM.toFixed(1)}% (-${gmDiff.toFixed(1)} pts)`,
          `Lost margin: $${Math.round(lostMargin).toLocaleString()}`,
          `Suggests aggressive discounting or high COGS`,
        ],
        dataPoints: {
          currentGM: gmPercent,
          portfolioAvgGM: avgGM,
          difference: gmDiff,
          lostMargin: Math.round(lostMargin),
        },
        recommendation: `Root cause analysis needed: 1) Compare pricing vs competitors 2) Review supplier costs 3) Check discount frequency 4) Analyze return rates. Target: ${(avgGM - 5).toFixed(1)}% GM within 60 days.`,
      };
    }

    return null;
  }

  /**
   * Analyze channel concentration risk
   */
  private analyzeChannelConcentration(
    brand: string,
    market: string,
    revenue: number,
    variance: number,
    data: ConsolidatedData
  ): RootCause | null {
    // Get channel distribution for this brand-market
    // Note: Channel data is usually aggregated, not per brand-market
    // But we can infer from overall channel distribution
    const channelData = data.dataPoints.filter(d => d.category === 'channel-performance');

    if (channelData.length < 2) return null;

    const totalChannelRevenue = channelData.reduce((sum, c) => sum + (c.value as number), 0);
    const channelShares = channelData.map(c => ({
      channel: c.metadata?.channel as string,
      revenue: c.value as number,
      share: ((c.value as number) / totalChannelRevenue) * 100,
    })).sort((a, b) => b.share - a.share);

    const topChannel = channelShares[0];

    // Flag if top channel >70% (high concentration risk)
    if (topChannel.share > 70) {
      // For brand-specific analysis, estimate their revenue on top channel
      const estimatedBrandChannelRevenue = revenue * (topChannel.share / 100);

      return {
        factor: 'Channel Concentration Risk',
        severity: topChannel.share > 80 ? 'high' : 'medium',
        impact: 0, // Risk factor, not direct revenue impact
        impactPercent: 0,
        evidence: [
          `${topChannel.share.toFixed(0)}% revenue on ${topChannel.channel} (high dependency)`,
          `Estimated ${brand} ${market} revenue on ${topChannel.channel}: $${Math.round(estimatedBrandChannelRevenue).toLocaleString()}`,
          `Limited channel diversification increases platform risk`,
        ],
        dataPoints: {
          topChannelShare: topChannel.share,
          estimatedBrandRevenue: Math.round(estimatedBrandChannelRevenue),
        },
        recommendation: `Diversify channel mix. Target: Reduce ${topChannel.channel} to 60-65%, grow secondary channels (Noon, etc.) to 25-30%. Action: Catalog completeness check on underutilized channels.`,
      };
    }

    return null;
  }

  /**
   * Analyze week-over-week trends (placeholder - needs historical data)
   */
  private analyzeTrend(
    brand: string,
    market: string,
    revenue: number,
    variance: number,
    data: ConsolidatedData
  ): RootCause | null {
    // This will be enhanced when we have multi-PDF trend analysis
    // For now, return null
    return null;
  }

  /**
   * Calculate portfolio averages for comparison
   */
  private calculatePortfolioAverages(data: ConsolidatedData): Record<string, number> {
    const gmMetrics = data.dataPoints.filter(d => d.metric.includes('GM %'));
    const mktMetrics = data.dataPoints.filter(d => d.metric.includes('MKT %'));
    const cm2Metrics = data.dataPoints.filter(d => d.metric.includes('CM2 %'));

    const avgGM = gmMetrics.length > 0
      ? gmMetrics.reduce((sum, m) => sum + (m.value as number), 0) / gmMetrics.length
      : 50;

    const avgMKT = mktMetrics.length > 0
      ? mktMetrics.reduce((sum, m) => sum + (m.value as number), 0) / mktMetrics.length
      : 6;

    const avgCM2 = cm2Metrics.length > 0
      ? cm2Metrics.reduce((sum, m) => sum + (m.value as number), 0) / cm2Metrics.length
      : 35;

    return {
      gmPercent: avgGM,
      mktPercent: avgMKT,
      cm2Percent: avgCM2,
    };
  }

  /**
   * Analyze all brand-markets and return ranked list
   */
  analyzeAllBrandMarkets(data: ConsolidatedData): BrandMarketRootCauses[] {
    const results: BrandMarketRootCauses[] = [];

    const brandPerformance = data.dataPoints.filter(d => d.category === 'brand-performance');

    for (const bp of brandPerformance) {
      const brand = bp.metadata?.brand as string;
      const market = bp.metadata?.country as string;
      const revenue = bp.value as number;
      const target = bp.metadata?.target as number;
      const variance = bp.metadata?.variance as number;
      const variancePercent = bp.metadata?.variancePercent as number;

      if (variance < 0) { // Only analyze underperformers
        const analysis = this.analyzeBrandMarket(
          brand, market, revenue, target, variance, variancePercent, data
        );
        results.push(analysis);
      }
    }

    // Sort by gap size (largest first)
    results.sort((a, b) => a.gap - b.gap);

    return results;
  }
}

export const rootCauseAnalyzer = new RootCauseAnalyzer();
