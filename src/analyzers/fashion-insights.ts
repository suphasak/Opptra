/**
 * Fashion Business Insights Generator
 * Specialized for fashion retail performance analysis
 */

import { ConsolidatedData, Insight, Priority, InsightType } from '../types';
import { generateId } from '../utils/helpers';

export class FashionInsightsGenerator {
  /**
   * Generate actionable insights from fashion retail data
   */
  generateInsights(data: ConsolidatedData): Insight[] {
    const insights: Insight[] = [];

    // Extract data points by category
    const brandPerf = data.dataPoints.filter(d => d.category === 'brand-performance');
    const channelPerf = data.dataPoints.filter(d => d.category === 'channel-performance');
    const profitability = data.dataPoints.filter(d => d.category === 'profitability');
    const financial = data.dataPoints.filter(d => d.category === 'financial');

    // 1. Overall performance gap insight
    const mtdRevenue = financial.find(d => d.metric === 'MTD Revenue');
    if (mtdRevenue && mtdRevenue.metadata?.target) {
      const target = mtdRevenue.metadata.target as number;
      const variance = mtdRevenue.metadata.variance as number;
      const variancePercent = mtdRevenue.metadata.variancePercent as number;

      insights.push({
        id: generateId(),
        type: 'performance' as InsightType,
        category: 'financial',
        title: `MTD Revenue ${variance < 0 ? 'Below' : 'Above'} Target`,
        description: `Current MTD revenue is $${mtdRevenue.value.toLocaleString()} vs target of $${target.toLocaleString()}, showing a variance of $${Math.abs(variance).toLocaleString()} (${variancePercent.toFixed(1)}%). ${variance < 0 ? 'Immediate action required to close the gap by month end.' : 'Great performance!'}`,
        metrics: ['MTD Revenue'],
        priority: Math.abs(variancePercent) > 5 ? 'critical' as Priority : 'high' as Priority,
        confidence: 1.0,
        data: {
          current: mtdRevenue.value as number,
          previous: target as number,
          change: variance,
          changePercent: variancePercent,
        },
        generatedAt: new Date(),
        metadata: {
          variance,
          variancePercent,
          gapToClose: Math.abs(variance),
        },
      });
    }

    // 2. Underperforming brands
    const underperformingBrands = brandPerf.filter(bp => {
      const variance = bp.metadata?.variancePercent as number;
      return variance && variance < -10; // More than 10% below target
    });

    if (underperformingBrands.length > 0) {
      const worstBrand = underperformingBrands.reduce((worst, current) => {
        const currentVar = current.metadata?.variancePercent as number;
        const worstVar = worst.metadata?.variancePercent as number;
        return currentVar < worstVar ? current : worst;
      });

      const brand = worstBrand.metadata?.brand as string;
      const country = worstBrand.metadata?.country as string;
      const target = worstBrand.metadata?.target as number;
      const variance = worstBrand.metadata?.variance as number;
      const variancePercent = worstBrand.metadata?.variancePercent as number;

      insights.push({
        id: generateId(),
        type: 'anomaly' as InsightType,
        category: 'brand-performance',
        title: `${brand} in ${country} Significantly Underperforming`,
        description: `${brand} - ${country} is ${Math.abs(variancePercent).toFixed(1)}% below target with MTD revenue of $${worstBrand.value.toLocaleString()} vs target $${target.toLocaleString()}. This represents a gap of $${Math.abs(variance).toLocaleString()} that needs immediate attention.`,
        metrics: [`${brand} - ${country} - MTD Revenue`],
        priority: 'critical' as Priority,
        confidence: 0.95,
        data: {
          current: worstBrand.value as number,
          previous: target as number,
          change: variance,
          changePercent: variancePercent,
        },
        generatedAt: new Date(),
        metadata: {
          brand,
          country,
          variancePercent,
          gap: Math.abs(variance),
        },
      });
    }

    // 3. Channel performance comparison
    if (channelPerf.length >= 2) {
      const channelRevenues = channelPerf.map(cp => ({
        channel: cp.metadata?.channel as string,
        revenue: cp.value as number,
      })).sort((a, b) => b.revenue - a.revenue);

      const topChannel = channelRevenues[0];
      const totalChannelRevenue = channelRevenues.reduce((sum, c) => sum + c.revenue, 0);
      const topChannelShare = (topChannel.revenue / totalChannelRevenue) * 100;

      insights.push({
        id: generateId(),
        type: 'comparison' as InsightType,
        category: 'channel-performance',
        title: `${topChannel.channel} Dominates Channel Mix (${topChannelShare.toFixed(1)}%)`,
        description: `${topChannel.channel} leads with $${topChannel.revenue.toLocaleString()} MTD revenue, representing ${topChannelShare.toFixed(1)}% of total channel revenue. Channel breakdown: ${channelRevenues.map(c => `${c.channel} $${c.revenue.toLocaleString()}`).join(', ')}.`,
        metrics: channelRevenues.map(c => `${c.channel} - MTD Revenue`),
        priority: 'medium' as Priority,
        confidence: 0.9,
        data: {
          current: topChannel.revenue as number,
        },
        generatedAt: new Date(),
        metadata: {
          topChannel: topChannel.channel,
          topChannelRevenue: topChannel.revenue,
          topChannelShare,
          channelBreakdown: channelRevenues,
        },
      });
    }

    // 4. Profitability concerns
    const gmMetrics = profitability.filter(p => p.metric.includes('GM %'));
    const mktMetrics = profitability.filter(p => p.metric.includes('MKT %'));

    if (gmMetrics.length > 0) {
      const avgGM = gmMetrics.reduce((sum, m) => sum + (m.value as number), 0) / gmMetrics.length;
      const lowGMBrands = gmMetrics.filter(m => (m.value as number) < avgGM - 10);

      if (lowGMBrands.length > 0) {
        const lowestGM = lowGMBrands.reduce((lowest, current) =>
          (current.value as number) < (lowest.value as number) ? current : lowest
        );
        const brand = lowestGM.metadata?.brand as string;
        const gap = avgGM - (lowestGM.value as number);

        insights.push({
          id: generateId(),
          type: 'anomaly' as InsightType,
          category: 'profitability',
          title: `${brand} Has Below-Average Gross Margin`,
          description: `${brand} has a GM% of ${(lowestGM.value as number).toFixed(1)}%, which is ${gap.toFixed(1)} percentage points below the average GM% of ${avgGM.toFixed(1)}%. This may indicate pricing issues or high cost of goods. Consider reviewing supplier costs and pricing strategy.`,
          metrics: [`${brand} - GM %`],
          priority: 'high' as Priority,
          confidence: 0.85,
          data: {
            current: lowestGM.value as number,
            previous: avgGM as number,
            change: -gap,
            changePercent: -(gap / avgGM) * 100,
          },
          generatedAt: new Date(),
          metadata: {
            brand,
            gmPercent: lowestGM.value,
            averageGM: avgGM,
            gap,
          },
        });
      }
    }

    // 5. High marketing spend insight
    if (mktMetrics.length > 0) {
      const highMKT = mktMetrics.filter(m => (m.value as number) > 7); // More than 7% marketing spend

      if (highMKT.length > 0) {
        highMKT.forEach(m => {
          const brand = m.metadata?.brand as string;
          insights.push({
            id: generateId(),
            type: 'pattern' as InsightType,
            category: 'profitability',
            title: `${brand} Has High Marketing Spend (${m.value}%)`,
            description: `${brand} marketing costs are ${m.value}% of revenue, above industry benchmarks. Consider optimizing ad spend efficiency, improving ROAS, and exploring organic growth channels to improve profitability.`,
            metrics: [`${brand} - MKT %`],
            priority: 'medium' as Priority,
            confidence: 0.8,
            data: {
              current: m.value as number,
            },
            generatedAt: new Date(),
            metadata: {
              brand,
              mktPercent: m.value,
            },
          });
        });
      }
    }

    // 6. Brand-Country specific recommendations
    underperformingBrands.forEach(bp => {
      const brand = bp.metadata?.brand as string;
      const country = bp.metadata?.country as string;
      const gap = Math.abs(bp.metadata?.variance as number);

      if (gap > 5000) { // Significant gap
        insights.push({
          id: generateId(),
          type: 'recommendation' as InsightType,
          category: 'brand-performance',
          title: `Close $${gap.toLocaleString()} Gap: ${brand} - ${country}`,
          description: `Priority actions for ${brand} in ${country}: (1) Increase marketing spend on top-performing channels, (2) Launch targeted promotions and discounts, (3) Optimize product availability across all channels, (4) Review pricing vs competitors, (5) Focus on best-selling SKUs.`,
          metrics: [`${brand} - ${country} - MTD Revenue`],
          priority: gap > 20000 ? 'critical' as Priority : 'high' as Priority,
          confidence: 0.9,
          data: {
            change: -gap,
          },
          generatedAt: new Date(),
          metadata: {
            brand,
            country,
            gapToClose: gap,
          },
        });
      }
    });

    // 7. All brands performance summary
    if (brandPerf.length > 0) {
      const totalBrandRevenue = brandPerf.reduce((sum, bp) => sum + (bp.value as number), 0);
      const totalBrandTarget = brandPerf.reduce((sum, bp) => sum + ((bp.metadata?.target as number) || 0), 0);
      const brandGap = totalBrandTarget - totalBrandRevenue;
      const brandGapPercent = (brandGap / totalBrandTarget) * 100;

      if (brandGapPercent > 0) {
        insights.push({
          id: generateId(),
          type: 'summary' as InsightType,
          category: 'brand-performance',
          title: `Overall Brand Performance: $${brandGap.toLocaleString()} Below Target`,
          description: `Across all brands and countries, MTD performance is $${totalBrandRevenue.toLocaleString()} vs target of $${totalBrandTarget.toLocaleString()}, representing a ${brandGapPercent.toFixed(1)}% gap. Focus on top underperformers: ${underperformingBrands.slice(0, 3).map(bp => `${bp.metadata?.brand}-${bp.metadata?.country}`).join(', ')}.`,
          metrics: ['Brand Performance Summary'],
          priority: 'high' as Priority,
          confidence: 1.0,
          data: {
            current: totalBrandRevenue,
            previous: totalBrandTarget,
            change: -brandGap,
            changePercent: -brandGapPercent,
          },
          generatedAt: new Date(),
          metadata: {
            totalRevenue: totalBrandRevenue,
            totalTarget: totalBrandTarget,
            gap: brandGap,
            gapPercent: brandGapPercent,
          },
        });
      }
    }

    return insights;
  }
}

export const fashionInsightsGenerator = new FashionInsightsGenerator();
