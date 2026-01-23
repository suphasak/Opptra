/**
 * Fashion Business Insights Generator
 * Specialized for fashion retail performance analysis
 * Enhanced with root cause analysis and prioritization
 */

import { ConsolidatedData, Insight, Priority, InsightType } from '../types';
import { generateId } from '../utils/helpers';
import { rootCauseAnalyzer } from './root-cause-analyzer';
import { prioritizationEngine, PrioritizedRecommendation } from './prioritization';
import { DateInfo } from '../extractors/fashion-business-parser';

export class FashionInsightsGenerator {
  /**
   * Generate actionable insights from fashion retail data
   * Enhanced with dynamic dates, root cause analysis, and prioritization
   */
  generateInsights(data: ConsolidatedData, dateInfo?: DateInfo): Insight[] {
    const insights: Insight[] = [];

    // Extract data points by category
    const brandPerf = data.dataPoints.filter(d => d.category === 'brand-performance');
    const channelPerf = data.dataPoints.filter(d => d.category === 'channel-performance');
    const profitability = data.dataPoints.filter(d => d.category === 'profitability');
    const financial = data.dataPoints.filter(d => d.category === 'financial');

    // 1. Overall MTD Performance (Dynamic dates)
    const mtdRevenue = financial.find(d => d.metric === 'MTD Revenue');
    if (mtdRevenue && mtdRevenue.metadata?.target) {
      const target = mtdRevenue.metadata.target as number;
      const variance = mtdRevenue.metadata.variance as number;
      const variancePercent = mtdRevenue.metadata.variancePercent as number;

      // Use dynamic dates from dateInfo if available, otherwise fall back to defaults
      const daysInPeriod = dateInfo?.daysInPeriod || 17;
      const daysRemaining = dateInfo?.daysRemaining || 14;
      const month = dateInfo?.month || 'January';
      const mtdStartDate = dateInfo?.mtdStartDate || new Date(2026, 0, 1);
      const mtdEndDate = dateInfo?.mtdEndDate || new Date(2026, 0, 17);

      const dailyGapToClose = Math.abs(variance) / daysRemaining;

      const startDay = mtdStartDate.getDate();
      const endDay = mtdEndDate.getDate();

      insights.push({
        id: generateId(),
        type: 'performance' as InsightType,
        category: 'financial',
        title: `${month} MTD Revenue: $${Math.abs(variance).toLocaleString()} Gap to Close`,
        description: `Current ${month} ${startDay}-${endDay} MTD: $${mtdRevenue.value.toLocaleString()} vs Month Target: $${target.toLocaleString()}. Gap: $${Math.abs(variance).toLocaleString()} (${Math.abs(variancePercent).toFixed(1)}%). Need to generate $${Math.round(dailyGapToClose).toLocaleString()}/day for remaining ${daysRemaining} days to meet target.`,
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
          dailyRequirement: dailyGapToClose,
          daysRemaining,
        },
      });
    }

    // 2. Enhanced brand performance with root cause analysis
    if (brandPerf.length > 0) {
      // Use root cause analyzer for all underperforming brand-markets
      const brandMarketAnalyses = rootCauseAnalyzer.analyzeAllBrandMarkets(data);

      // Calculate total revenue for contribution %
      const totalRevenue = brandPerf.reduce((sum, b) => sum + (b.value as number), 0);

      // Top 3 brands by gap size (already sorted in analyzer)
      const topImpactBrands = brandMarketAnalyses.slice(0, 3);

      topImpactBrands.forEach((analysis, index) => {
        const priority = index === 0 ? 'critical' as Priority : 'high' as Priority;

        const revenue = brandPerf.find(
          bp => bp.metadata?.brand === analysis.brand && bp.metadata?.country === analysis.market
        )?.value as number || 0;

        const revenueContribution = (revenue / totalRevenue) * 100;

        // Build description with root causes
        let description = `${analysis.brand} in ${analysis.market}: $${revenue.toLocaleString()} MTD (${revenueContribution.toFixed(1)}% of total). Gap: $${Math.abs(analysis.gap).toLocaleString()} (${Math.abs(analysis.gapPercent).toFixed(1)}%).\n\n`;

        // Add root causes with evidence
        if (analysis.rootCauses.length > 0) {
          description += `**Root Causes (Data-Backed):**\n`;
          analysis.rootCauses.forEach((rc, rcIndex) => {
            description += `${rcIndex + 1}. **${rc.factor}** [Impact: $${rc.impact.toLocaleString()}]\n`;
            rc.evidence.forEach(ev => {
              description += `   • ${ev}\n`;
            });
            description += `   → ${rc.recommendation}\n\n`;
          });
        } else {
          // Fall back to generic recommendations if no root causes identified
          description += `**Recommended Actions:**\n`;
          description += `1. **Inventory**: Check stock availability for top 20 SKUs\n`;
          description += `2. **Marketing**: Review campaign performance, ensure ROAS >3\n`;
          description += `3. **Pricing**: Compare vs competitors, adjust if needed\n`;
        }

        insights.push({
          id: generateId(),
          type: 'recommendation' as InsightType,
          category: 'brand-performance',
          title: `Priority ${index + 1}: ${analysis.brand} ${analysis.market} - $${Math.abs(analysis.gap).toLocaleString()} Gap`,
          description,
          metrics: [`${analysis.brand} - ${analysis.market} - MTD Revenue`],
          priority,
          confidence: 0.95,
          data: {
            current: revenue,
            previous: revenue + Math.abs(analysis.gap),
            change: analysis.gap,
            changePercent: analysis.gapPercent,
          },
          generatedAt: new Date(),
          metadata: {
            brand: analysis.brand,
            country: analysis.market,
            revenueContribution,
            gapToClose: Math.abs(analysis.gap),
            rootCauses: analysis.rootCauses,
            totalExplainedImpact: analysis.totalExplainedImpact,
          },
        });
      });
    }

    // 3. Channel performance analysis
    if (channelPerf.length >= 2) {
      const channelRevenues = channelPerf.map(cp => ({
        channel: cp.metadata?.channel as string,
        revenue: cp.value as number,
      })).sort((a, b) => b.revenue - a.revenue);

      const totalChannelRevenue = channelRevenues.reduce((sum, c) => sum + c.revenue, 0);
      const topChannel = channelRevenues[0];
      const topChannelShare = (topChannel.revenue / totalChannelRevenue) * 100;

      // Find underperforming channels (below 10% contribution)
      const weakChannels = channelRevenues.filter(c =>
        (c.revenue / totalChannelRevenue) * 100 < 10 && c.revenue > 0
      );

      insights.push({
        id: generateId(),
        type: 'comparison' as InsightType,
        category: 'channel-performance',
        title: `Channel Mix: ${topChannel.channel} ${topChannelShare.toFixed(1)}% | Weak Channels: ${weakChannels.map(c => c.channel).join(', ')}`,
        description: `**Channel Breakdown:**
- ${channelRevenues.map(c => `${c.channel}: $${c.revenue.toLocaleString()} (${((c.revenue / totalChannelRevenue) * 100).toFixed(1)}%)`).join('\n- ')}

**Actions:**
1. **${topChannel.channel}**: Maintain momentum - ensure featured placements, sponsored ads
2. **Weak Channels (${weakChannels.map(c => c.channel).join(', ')})**:
   - Check catalog completeness - are all SKUs listed?
   - Review pricing competitiveness vs other channels
   - Increase promotional activity
   - Analyze if channel demographics match product assortment`,
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
          weakChannels: weakChannels.map(c => c.channel),
          channelBreakdown: channelRevenues,
        },
      });
    }

    // 4. Profitability analysis with context
    const gmMetrics = profitability.filter(p => p.metric.includes('GM %'));
    const mktMetrics = profitability.filter(p => p.metric.includes('MKT %'));

    if (gmMetrics.length > 0) {
      const brandGMs = gmMetrics.map(gm => ({
        brand: gm.metadata?.brand as string,
        gm: gm.value as number,
      }));
      const avgGM = brandGMs.reduce((sum, b) => sum + b.gm, 0) / brandGMs.length;

      // Find brands with GM significantly below average (>15 points)
      const lowGMBrands = brandGMs.filter(b => b.gm < avgGM - 15);

      if (lowGMBrands.length > 0) {
        lowGMBrands.forEach(brand => {
          const gap = avgGM - brand.gm;
          insights.push({
            id: generateId(),
            type: 'anomaly' as InsightType,
            category: 'profitability',
            title: `${brand.brand}: Low GM ${brand.gm.toFixed(1)}% vs Avg ${avgGM.toFixed(1)}%`,
            description: `${brand.brand} Gross Margin is ${brand.gm.toFixed(1)}%, which is ${gap.toFixed(1)} points below portfolio average of ${avgGM.toFixed(1)}%.

**Root Cause Analysis Needed:**
1. **Pricing**: Compare vs competitors - are we priced too low?
2. **Cost of Goods**: Review supplier costs - negotiate better terms
3. **Discounting**: Check discount frequency - reduce promotional depth
4. **Product Mix**: Analyze if low-margin products dominate sales
5. **Returns**: High returns eat into GM - check return rates

**Target**: Improve GM to at least ${(avgGM - 5).toFixed(1)}% within 2 months.`,
            metrics: [`${brand.brand} - GM %`],
            priority: 'high' as Priority,
            confidence: 0.9,
            data: {
              current: brand.gm,
              previous: avgGM as number,
              change: -gap,
              changePercent: -(gap / avgGM) * 100,
            },
            generatedAt: new Date(),
            metadata: {
              brand: brand.brand,
              gmPercent: brand.gm,
              averageGM: avgGM,
              gap,
            },
          });
        });
      }
    }

    // 5. Marketing spend analysis with industry context
    if (mktMetrics.length > 0) {
      const brandMKTs = mktMetrics.map(mkt => ({
        brand: mkt.metadata?.brand as string,
        mktPercent: mkt.value as number,
      }));

      // Industry benchmarks for fashion retail
      const benchmarks: Record<string, number> = {
        'USPA': 5.5,        // Footwear benchmark
        'CAMPUS': 5.5,      // Footwear benchmark
        'Penti': 7.0,       // Innerwear benchmark (higher due to brand building needs)
        'French Connection': 6.5, // Apparel benchmark
      };

      brandMKTs.forEach(brand => {
        const benchmark = benchmarks[brand.brand] || 6.0;
        const diff = brand.mktPercent - benchmark;

        if (diff > 1.5) { // >1.5% above benchmark
          insights.push({
            id: generateId(),
            type: 'pattern' as InsightType,
            category: 'profitability',
            title: `${brand.brand}: Marketing ${brand.mktPercent}% vs ${benchmark}% Benchmark`,
            description: `${brand.brand} marketing spend is ${brand.mktPercent}% of revenue, which is ${diff.toFixed(1)} points above the ${brand.brand === 'Penti' ? 'innerwear' : brand.brand === 'French Connection' ? 'apparel' : 'footwear'} industry benchmark of ${benchmark}%.

**Efficiency Actions:**
1. **ROAS Analysis**: Check ROAS by channel - target minimum 3.0
2. **Campaign Optimization**: Pause low-performing campaigns (<2.0 ROAS)
3. **Creative Testing**: A/B test ad creatives to improve CTR
4. **Organic Growth**: Invest in SEO, content marketing to reduce paid dependency
5. **Retargeting**: Focus on retargeting (usually higher ROAS) vs cold acquisition

**Target**: Reduce marketing spend to ${benchmark + 0.5}% while maintaining revenue.`,
            metrics: [`${brand.brand} - MKT %`],
            priority: 'medium' as Priority,
            confidence: 0.85,
            data: {
              current: brand.mktPercent as number,
              previous: benchmark,
              change: diff,
              changePercent: (diff / benchmark) * 100,
            },
            generatedAt: new Date(),
            metadata: {
              brand: brand.brand,
              mktPercent: brand.mktPercent,
              benchmark,
              difference: diff,
            },
          });
        }
      });
    }

    // 6. Summary insight with correct numbers
    if (brandPerf.length > 0) {
      const totalBrandRevenue = brandPerf.reduce((sum, bp) => sum + (bp.value as number), 0);
      const totalBrandTarget = brandPerf.reduce((sum, bp) => sum + ((bp.metadata?.target as number) || 0), 0);
      const brandGap = totalBrandTarget - totalBrandRevenue;
      const brandGapPercent = (brandGap / totalBrandTarget) * 100;

      const underperformers = brandPerf
        .filter(bp => (bp.metadata?.variance as number) < 0)
        .sort((a, b) => (a.metadata?.variance as number) - (b.metadata?.variance as number))
        .slice(0, 3);

      if (brandGapPercent > 0) {
        insights.push({
          id: generateId(),
          type: 'summary' as InsightType,
          category: 'brand-performance',
          title: `Overall: ${brandPerf.length / 2} Brands Across 2 Countries - $${brandGap.toLocaleString()} Total Gap`,
          description: `**Jan 1-17 Performance Summary:**
- Total MTD Revenue: $${totalBrandRevenue.toLocaleString()}
- Total Month Target: $${totalBrandTarget.toLocaleString()}
- Gap to Close: $${brandGap.toLocaleString()} (${brandGapPercent.toFixed(1)}%)

**Top 3 Underperformers:**
${underperformers.map((bp, i) => `${i + 1}. ${bp.metadata?.brand}-${bp.metadata?.country}: $${Math.abs(bp.metadata?.variance as number).toLocaleString()} gap`).join('\n')}

**Action Plan:**
Focus resources on closing top 3 gaps above - these represent ${((underperformers.reduce((sum, bp) => sum + Math.abs(bp.metadata?.variance as number), 0) / brandGap) * 100).toFixed(1)}% of total shortfall.`,
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
            topUnderperformers: underperformers.map(bp => ({
              brand: bp.metadata?.brand,
              country: bp.metadata?.country,
              gap: Math.abs(bp.metadata?.variance as number),
            })),
          },
        });
      }
    }

    return insights.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}

export const fashionInsightsGenerator = new FashionInsightsGenerator();
