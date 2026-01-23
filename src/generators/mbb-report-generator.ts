/**
 * MBB-Style Report Generator
 * Generates reports using McKinsey/BCG/Bain consulting frameworks
 * Implements SCQA (Situation-Complication-Question-Answer) structure
 */

import { ConsolidatedData, Insight, ActionPlan } from '../types';

export class MBBReportGenerator {
  /**
   * Generate SCQA-structured executive report
   */
  generateSCQAReport(
    insights: Insight[],
    actionPlan: ActionPlan,
    data: ConsolidatedData
  ): string {
    const criticalInsights = insights.filter(i => i.priority === 'critical');
    const highInsights = insights.filter(i => i.priority === 'high');

    // Extract key metrics
    const financialMetrics = data.dataPoints.filter(d => d.category === 'financial');
    const mtdRevenue = financialMetrics.find(m => m.metric === 'MTD Revenue');
    const lastDayRevenue = financialMetrics.find(m => m.metric === 'Last Day Revenue');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Business Review - OPPTRA Fashion Group</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background: #ffffff;
            color: #1a1a1a;
            line-height: 1.6;
            padding: 0;
        }

        .page {
            max-width: 1000px;
            margin: 0 auto;
            padding: 60px 80px;
            background: white;
            min-height: 100vh;
        }

        /* Header Section */
        .header {
            border-bottom: 3px solid #000;
            padding-bottom: 30px;
            margin-bottom: 50px;
        }

        .company-name {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #666;
            margin-bottom: 10px;
        }

        h1 {
            font-size: 36px;
            font-weight: 300;
            color: #000;
            margin-bottom: 15px;
        }

        .report-meta {
            font-size: 14px;
            color: #666;
            margin-top: 20px;
        }

        /* SCQA Sections */
        .scqa-section {
            margin: 50px 0;
            page-break-inside: avoid;
        }

        .scqa-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #0066cc;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .scqa-title {
            font-size: 24px;
            font-weight: 400;
            color: #000;
            margin-bottom: 20px;
        }

        .scqa-content {
            font-size: 15px;
            color: #333;
            line-height: 1.8;
        }

        /* Key Metrics Dashboard */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            margin: 40px 0;
            padding: 30px;
            background: #f8f9fa;
            border-radius: 2px;
        }

        .metric-card {
            text-align: center;
        }

        .metric-value {
            font-size: 42px;
            font-weight: 300;
            color: #000;
            margin-bottom: 5px;
        }

        .metric-value.negative {
            color: #dc3545;
        }

        .metric-value.positive {
            color: #28a745;
        }

        .metric-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #666;
        }

        .metric-sublabel {
            font-size: 11px;
            color: #999;
            margin-top: 5px;
        }

        /* Insights Section */
        .insight-block {
            margin: 30px 0;
            padding: 30px;
            background: #fafafa;
            border-left: 4px solid #0066cc;
        }

        .insight-block.critical {
            border-left-color: #dc3545;
            background: #fff5f5;
        }

        .insight-block.high {
            border-left-color: #fd7e14;
            background: #fff9f0;
        }

        .insight-priority {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .insight-priority.critical { color: #dc3545; }
        .insight-priority.high { color: #fd7e14; }

        .insight-title {
            font-size: 18px;
            font-weight: 600;
            color: #000;
            margin-bottom: 15px;
        }

        .insight-description {
            font-size: 14px;
            color: #333;
            line-height: 1.7;
            white-space: pre-wrap;
        }

        /* Recommendations */
        .recommendations {
            margin: 40px 0;
        }

        .recommendation-item {
            margin: 20px 0;
            padding: 20px 25px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 2px;
        }

        .recommendation-number {
            display: inline-block;
            width: 30px;
            height: 30px;
            background: #0066cc;
            color: white;
            text-align: center;
            line-height: 30px;
            border-radius: 50%;
            font-weight: 600;
            font-size: 14px;
            margin-right: 15px;
        }

        .recommendation-title {
            display: inline;
            font-size: 16px;
            font-weight: 600;
            color: #000;
        }

        .recommendation-description {
            margin-top: 10px;
            margin-left: 45px;
            font-size: 14px;
            color: #555;
            line-height: 1.6;
        }

        /* Impact Chart */
        .impact-chart {
            margin: 40px 0;
            padding: 30px;
            background: #f8f9fa;
        }

        .chart-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .chart-bar {
            margin: 15px 0;
        }

        .bar-label {
            font-size: 13px;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
        }

        .bar-value {
            font-weight: 600;
        }

        .bar-fill {
            height: 30px;
            background: linear-gradient(90deg, #0066cc, #0052a3);
            border-radius: 2px;
            position: relative;
        }

        .bar-fill.negative {
            background: linear-gradient(90deg, #dc3545, #c82333);
        }

        /* Footer */
        .footer {
            margin-top: 80px;
            padding-top: 30px;
            border-top: 1px solid #e0e0e0;
            font-size: 11px;
            color: #999;
            text-align: center;
        }

        /* Print Styles */
        @media print {
            .page {
                padding: 40px;
            }
            .scqa-section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- Header -->
        <div class="header">
            <div class="company-name">OPPTRA Fashion Group</div>
            <h1>Executive Business Review</h1>
            <div class="report-meta">
                January MTD Performance Analysis (Jan 1-17, 2026)<br>
                Report Generated: ${new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
            </div>
        </div>

        <!-- Key Metrics Dashboard -->
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${mtdRevenue ? '$' + Math.round(mtdRevenue.value as number).toLocaleString() : 'N/A'}</div>
                <div class="metric-label">MTD Revenue</div>
                <div class="metric-sublabel">Jan 1-17 (17 days)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value negative">${mtdRevenue?.metadata?.variance ? '$' + Math.abs(mtdRevenue.metadata.variance as number).toLocaleString() : 'N/A'}</div>
                <div class="metric-label">Gap to Target</div>
                <div class="metric-sublabel">${mtdRevenue?.metadata?.variancePercent ? Math.abs(mtdRevenue.metadata.variancePercent as number).toFixed(1) + '% below' : ''}</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${lastDayRevenue ? '$' + Math.round(lastDayRevenue.value as number).toLocaleString() : 'N/A'}</div>
                <div class="metric-label">Last Day</div>
                <div class="metric-sublabel">Daily performance</div>
            </div>
        </div>

        <!-- SITUATION -->
        <div class="scqa-section">
            <div class="scqa-label">SITUATION</div>
            <div class="scqa-title">OPPTRA is tracking ${Math.round((mtdRevenue?.metadata?.variancePercent as number || 0) * -1)}% behind January revenue targets mid-month</div>
            <div class="scqa-content">
                <p>As of January 17th, OPPTRA Fashion Group has generated <strong>$${mtdRevenue ? Math.round(mtdRevenue.value as number).toLocaleString() : 'N/A'}</strong> in revenue across its portfolio of fashion brands (USPA, CAMPUS, Penti, French Connection) operating in KSA and UAE markets.</p>

                <p style="margin-top: 15px;">The company operates through multiple digital channels including Namshi (56% of revenue), Noon (39%), and emerging channels. With <strong>14 days remaining</strong> in January, the business faces a <strong>$${mtdRevenue?.metadata?.variance ? Math.abs(mtdRevenue.metadata.variance as number).toLocaleString() : 'N/A'}</strong> revenue gap to achieve the monthly target of <strong>$${mtdRevenue?.metadata?.target ? (mtdRevenue.metadata.target as number).toLocaleString() : 'N/A'}</strong>.</p>

                <p style="margin-top: 15px;"><strong>Portfolio Composition:</strong></p>
                <ul style="margin-top: 10px; margin-left: 20px;">
                    <li>4 fashion brands across footwear, apparel, and innerwear categories</li>
                    <li>2 key markets: KSA (primary) and UAE</li>
                    <li>5+ digital sales channels with varying performance levels</li>
                    <li>Average gross margin: ${this.calculateAvgGM(data)}%</li>
                </ul>
            </div>
        </div>

        <!-- COMPLICATION -->
        <div class="scqa-section">
            <div class="scqa-label">COMPLICATION</div>
            <div class="scqa-title">Performance gaps concentrated in key revenue drivers requiring $${mtdRevenue?.metadata?.variance ? Math.round(Math.abs(mtdRevenue.metadata.variance as number) / 14).toLocaleString() : 'N/A'}/day acceleration</div>
            <div class="scqa-content">
                <p>The revenue shortfall is not uniformly distributed. Analysis reveals <strong>three critical issues</strong> driving underperformance:</p>

                <div style="margin-top: 25px;">
                    ${criticalInsights.concat(highInsights).slice(0, 5).map((insight, idx) => `
                        <div class="insight-block ${insight.priority}">
                            <div class="insight-priority ${insight.priority}">${insight.priority.toUpperCase()} PRIORITY</div>
                            <div class="insight-title">${idx + 1}. ${insight.title}</div>
                            <div class="insight-description">${this.formatInsightDescription(insight.description)}</div>
                        </div>
                    `).join('')}
                </div>

                <p style="margin-top: 25px;"><strong>Root Causes Identified:</strong></p>
                <ul style="margin-top: 10px; margin-left: 20px;">
                    <li><strong>Inventory constraints:</strong> Potential stockouts on high-performing SKUs limiting sales velocity</li>
                    <li><strong>Marketing efficiency:</strong> Some brands spending 1.5-2% above industry benchmarks without proportional returns</li>
                    <li><strong>Profitability mix:</strong> Low-margin brands diluting overall portfolio economics</li>
                    <li><strong>Channel imbalance:</strong> Underutilization of secondary channels creating single-platform dependency risk</li>
                </ul>
            </div>
        </div>

        <!-- QUESTION -->
        <div class="scqa-section">
            <div class="scqa-label">QUESTION</div>
            <div class="scqa-title">What immediate actions can close the monthly gap while improving long-term profitability?</div>
            <div class="scqa-content">
                <p>The business requires a dual-horizon strategy:</p>
                <ul style="margin-top: 15px; margin-left: 20px;">
                    <li><strong>Short-term (next 14 days):</strong> Close the $${mtdRevenue?.metadata?.variance ? Math.abs(mtdRevenue.metadata.variance as number).toLocaleString() : 'N/A'} gap through tactical interventions</li>
                    <li><strong>Medium-term (Q1 2026):</strong> Address structural profitability and channel optimization issues</li>
                </ul>

                <p style="margin-top: 15px;">Success requires balancing revenue acceleration with margin preservation, particularly given the profitability challenges in specific brand-market combinations.</p>
            </div>
        </div>

        <!-- ANSWER -->
        <div class="scqa-section">
            <div class="scqa-label">ANSWER</div>
            <div class="scqa-title">Recommended 3-Pillar Action Plan</div>
            <div class="scqa-content">
                <div class="recommendations">
                    ${this.generateRecommendations(insights, data)}
                </div>

                <div class="impact-chart">
                    <div class="chart-title">Expected Impact by Initiative</div>
                    ${this.generateImpactChart(insights, mtdRevenue?.metadata?.variance as number || 0)}
                </div>
            </div>
        </div>

        <!-- Executive Summary of Action Items -->
        <div class="scqa-section">
            <div class="scqa-label">NEXT STEPS</div>
            <div class="scqa-title">Immediate Action Items (Next 48 Hours)</div>
            <div class="scqa-content">
                ${actionPlan.actions.slice(0, 5).map((action, idx) => `
                    <div class="recommendation-item">
                        <span class="recommendation-number">${idx + 1}</span>
                        <span class="recommendation-title">${action.title}</span>
                        <div class="recommendation-description">${action.description}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>OPPTRA Business Intelligence • Confidential</p>
            <p style="margin-top: 5px;">This report contains proprietary business information and is intended for internal use only.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Calculate average gross margin
   */
  private calculateAvgGM(data: ConsolidatedData): string {
    const gmMetrics = data.dataPoints.filter(d => d.metric.includes('GM %'));
    if (gmMetrics.length === 0) return 'N/A';

    const avg = gmMetrics.reduce((sum, m) => sum + (m.value as number), 0) / gmMetrics.length;
    return avg.toFixed(1);
  }

  /**
   * Format insight description for MBB style
   */
  private formatInsightDescription(desc: string): string {
    // Take first 2-3 sentences for executive summary
    const sentences = desc.split('\n\n')[0];
    return sentences.substring(0, 400) + (sentences.length > 400 ? '...' : '');
  }

  /**
   * Generate strategic recommendations
   */
  private generateRecommendations(insights: Insight[], data: ConsolidatedData): string {
    const recommendations = [
      {
        title: 'Revenue Acceleration - Brand Focus',
        description: `Concentrate sales efforts on top 3 underperforming brand-market combinations identified in critical insights. Implement daily tracking, increase ad spend 20-30% on Namshi/Noon, and ensure no stockouts on top 20 SKUs. Expected impact: 60-70% of gap closure.`,
      },
      {
        title: 'Marketing Efficiency Optimization',
        description: `Reduce marketing spend for brands exceeding industry benchmarks (>7% for innerwear, >5.5% for footwear) by pausing low-ROAS campaigns (<2.0). Reallocate budget to retargeting and high-performing channels. Expected impact: 2-3% margin improvement.`,
      },
      {
        title: 'Channel Diversification',
        description: `Address underperforming channels (<10% revenue share) by ensuring catalog completeness, reviewing competitive pricing, and increasing promotional activity. Reduce single-channel dependency risk while capturing incremental revenue.`,
      },
      {
        title: 'Profitability Enhancement',
        description: `For brands with GM 15+ points below portfolio average, conduct immediate root cause analysis on pricing, COGS, discounting, and returns. Target 5-point GM improvement within 60 days through supplier negotiations and promotional discipline.`,
      },
      {
        title: 'SKU Performance Management',
        description: `Analyze top 20 and bottom 20 SKUs by brand. Push bestsellers aggressively through featured placements and ads. Discount slow-movers 15-20% to clear inventory and improve cash flow. Update product content for underperformers.`,
      },
    ];

    return recommendations.map((rec, idx) => `
      <div class="recommendation-item">
        <span class="recommendation-number">${idx + 1}</span>
        <span class="recommendation-title">${rec.title}</span>
        <div class="recommendation-description">${rec.description}</div>
      </div>
    `).join('');
  }

  /**
   * Generate impact chart
   */
  private generateImpactChart(insights: Insight[], totalGap: number): string {
    const impacts = [
      { label: 'Brand Focus (Top 3)', value: 65, amount: Math.round(Math.abs(totalGap) * 0.65) },
      { label: 'Marketing Optimization', value: 15, amount: Math.round(Math.abs(totalGap) * 0.15) },
      { label: 'Channel Diversification', value: 12, amount: Math.round(Math.abs(totalGap) * 0.12) },
      { label: 'SKU Management', value: 8, amount: Math.round(Math.abs(totalGap) * 0.08) },
    ];

    return impacts.map(impact => `
      <div class="chart-bar">
        <div class="bar-label">
          <span>${impact.label}</span>
          <span class="bar-value">$${impact.amount.toLocaleString()} (${impact.value}%)</span>
        </div>
        <div class="bar-fill" style="width: ${impact.value}%"></div>
      </div>
    `).join('');
  }
}

export const mbbReportGenerator = new MBBReportGenerator();
