/**
 * Opptra BI Orchestrator
 * Main orchestration logic for the BI automation system
 */

import fs from 'fs/promises';
import path from 'path';
import {
  DataSourceType,
  RawData,
  ConsolidatedData,
  Insight,
  ActionPlan,
  Timeline,
  ReportFormat,
} from '../types';
import { pdfExtractor } from '../extractors/pdf-extractor';
import { webScraper } from '../extractors/web-scraper';
import { lookerStudioConnector } from '../extractors/looker-studio-connector';
import { dataConsolidator } from '../consolidators/data-consolidator';
import { insightGenerator } from '../analyzers/insight-generator';
import { actionPlanGenerator } from '../generators/action-plan-generator';
import { timelineGenerator } from '../generators/timeline-generator';
import { mbbReportGenerator } from '../generators/mbb-report-generator';
import { logger, startTimer } from '../utils/logger';
import { fashionInsightsGenerator } from '../analyzers/fashion-insights';
import { generateId } from '../utils/helpers';

/**
 * Data source input
 */
export interface DataSourceInput {
  type: DataSourceType;
  location: string;
  credentials?: Record<string, any>;
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  outputDir?: string;
  outputFormat?: ReportFormat;
  generateTimeline?: boolean;
  generateActionPlan?: boolean;
  confidenceThreshold?: number;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  sources: string[];
  dataPoints: number;
  insights: Insight[];
  actionPlan: ActionPlan;
  timeline?: Timeline;
  outputDir: string;
  files: {
    insights?: string;
    actionPlan?: string;
    timeline?: string;
    consolidated?: string;
  };
}

/**
 * Opptra BI Orchestrator class
 */
export class OpptraBI {
  /**
   * Run full analysis pipeline
   */
  async runFullAnalysis(
    sources: DataSourceInput[],
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const endTimer = startTimer('Full analysis pipeline');

    try {
      logger.info('Starting full analysis pipeline');
      logger.info(`Sources: ${sources.length}`);

      // Step 1: Extract data from all sources
      const rawDataList = await this.extractAllSources(sources);

      // Step 2: Consolidate data
      const consolidatedData = await dataConsolidator.consolidate(rawDataList, {
        deduplication: true,
        normalization: true,
      });

      // Step 3: Generate insights
      const insights = await insightGenerator.generateInsights(consolidatedData, {
        enableTrendDetection: true,
        enableAnomalyDetection: true,
        enableCorrelation: true,
        enablePrediction: false,
        confidenceThreshold: options.confidenceThreshold || 0.6,
      });

      // Step 3.5: Add fashion-specific insights for retail business data
      const fashionInsights = fashionInsightsGenerator.generateInsights(consolidatedData);
      insights.push(...fashionInsights);
      logger.info(`Total insights (including fashion-specific): ${insights.length}`);

      // Step 4: Generate action plan
      const actionPlan = await actionPlanGenerator.generateActionPlan(
        insights,
        'Business Intelligence Action Plan'
      );

      // Step 5: Generate timeline
      let timeline: Timeline | undefined;
      if (options.generateTimeline !== false) {
        timeline = await timelineGenerator.generateTimeline(
          consolidatedData,
          insights,
          actionPlan.actions
        );
      }

      // Step 6: Export results
      const outputDir = options.outputDir || './output';
      const files = await this.exportResults(
        {
          consolidatedData,
          insights,
          actionPlan,
          timeline,
        },
        outputDir,
        options.outputFormat || ReportFormat.HTML
      );

      endTimer();

      return {
        sources: consolidatedData.sources,
        dataPoints: consolidatedData.dataPoints.length,
        insights,
        actionPlan,
        timeline,
        outputDir,
        files,
      };
    } catch (error) {
      logger.error('Full analysis pipeline failed', error);
      throw error;
    }
  }

  /**
   * Extract data from all sources
   */
  private async extractAllSources(sources: DataSourceInput[]): Promise<RawData[]> {
    const rawDataList: RawData[] = [];

    for (const source of sources) {
      try {
        const sourceId = generateId();

        switch (source.type) {
          case DataSourceType.PDF:
            const pdfData = await pdfExtractor.extract(source.location, sourceId);
            rawDataList.push(pdfData);
            break;

          case DataSourceType.WEB:
            const webData = await webScraper.scrape(source.location, sourceId);
            rawDataList.push(webData);
            break;

          case DataSourceType.LOOKER_STUDIO:
            const lookerData = await lookerStudioConnector.extract(sourceId, {
              credentials: (source.credentials as any) || { type: 'service_account' as const },
              reportId: source.location,
            });
            rawDataList.push(lookerData);
            break;

          default:
            logger.warn(`Unsupported source type: ${source.type}`);
        }
      } catch (error) {
        logger.error(`Failed to extract from source: ${source.location}`, error);
        // Continue with other sources
      }
    }

    return rawDataList;
  }

  /**
   * Export PDF data
   */
  async extractFromPDF(filePath: string): Promise<RawData> {
    return await pdfExtractor.extract(filePath, generateId());
  }

  /**
   * Extract web data
   */
  async extractFromWeb(url: string): Promise<RawData> {
    return await webScraper.scrape(url, generateId());
  }

  /**
   * Export results to files
   */
  private async exportResults(
    data: {
      consolidatedData: ConsolidatedData;
      insights: Insight[];
      actionPlan: ActionPlan;
      timeline?: Timeline;
    },
    outputDir: string,
    format: ReportFormat
  ): Promise<{
    insights?: string;
    actionPlan?: string;
    timeline?: string;
    consolidated?: string;
  }> {
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    const files: Record<string, string> = {};

    // Export consolidated data
    const consolidatedPath = path.join(outputDir, 'consolidated-data.json');
    await fs.writeFile(
      consolidatedPath,
      JSON.stringify(data.consolidatedData, null, 2)
    );
    files.consolidated = consolidatedPath;

    // Export insights
    if (format === ReportFormat.HTML) {
      const insightsHtml = this.generateInsightsHTML(data.insights);
      const insightsPath = path.join(outputDir, 'insights.html');
      await fs.writeFile(insightsPath, insightsHtml);
      files.insights = insightsPath;

      // Export action plan
      const actionPlanHtml = this.generateActionPlanHTML(data.actionPlan);
      const actionPlanPath = path.join(outputDir, 'action-plan.html');
      await fs.writeFile(actionPlanPath, actionPlanHtml);
      files.actionPlan = actionPlanPath;

      // Export timeline
      if (data.timeline) {
        const timelineHtml = await timelineGenerator.exportToHTML(data.timeline);
        const timelinePath = path.join(outputDir, 'timeline.html');
        await fs.writeFile(timelinePath, timelineHtml);
        files.timeline = timelinePath;
      }

      // Generate MBB-style comprehensive report with SCQA framework
      const reportHtml = mbbReportGenerator.generateSCQAReport(
        data.insights,
        data.actionPlan,
        data.consolidatedData
      );
      const reportPath = path.join(outputDir, 'report.html');
      await fs.writeFile(reportPath, reportHtml);
    } else {
      // JSON format
      const insightsPath = path.join(outputDir, 'insights.json');
      await fs.writeFile(insightsPath, JSON.stringify(data.insights, null, 2));
      files.insights = insightsPath;

      const actionPlanPath = path.join(outputDir, 'action-plan.json');
      await fs.writeFile(actionPlanPath, JSON.stringify(data.actionPlan, null, 2));
      files.actionPlan = actionPlanPath;

      if (data.timeline) {
        const timelinePath = path.join(outputDir, 'timeline.json');
        await fs.writeFile(timelinePath, JSON.stringify(data.timeline, null, 2));
        files.timeline = timelinePath;
      }
    }

    logger.info(`Results exported to ${outputDir}`);
    return files;
  }

  /**
   * Generate comprehensive HTML report
   */
  private generateComprehensiveReport(
    insights: Insight[],
    actionPlan: ActionPlan,
    data: ConsolidatedData
  ): string {
    const priorityCounts = {
      critical: insights.filter(i => i.priority === 'critical').length,
      high: insights.filter(i => i.priority === 'high').length,
      medium: insights.filter(i => i.priority === 'medium').length,
      low: insights.filter(i => i.priority === 'low').length,
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Intelligence Report - Opptra</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            padding: 40px 20px;
            color: #1a202c;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        h1 { font-size: 32px; margin-bottom: 10px; }
        h2 { font-size: 24px; margin: 30px 0 15px; color: #2d3748; }
        h3 { font-size: 18px; margin: 20px 0 10px; color: #4a5568; }
        .meta { color: #718096; margin-bottom: 30px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #4299e1;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #2d3748;
        }
        .stat-label {
            color: #718096;
            margin-top: 5px;
        }
        .insight {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #4299e1;
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
        }
        .insight.critical { border-left-color: #f56565; }
        .insight.high { border-left-color: #ed8936; }
        .insight.medium { border-left-color: #4299e1; }
        .insight.low { border-left-color: #48bb78; }
        .insight-title { font-weight: 600; margin-bottom: 10px; }
        .insight-desc { color: #4a5568; line-height: 1.6; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-top: 10px;
        }
        .badge.critical { background: #fed7d7; color: #c53030; }
        .badge.high { background: #feebc8; color: #c05621; }
        .badge.medium { background: #bee3f8; color: #2c5282; }
        .badge.low { background: #c6f6d5; color: #22543d; }
        .action {
            background: #f7fafc;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 3px solid #48bb78;
        }
        .action-title { font-weight: 600; margin-bottom: 5px; }
        .action-desc { color: #4a5568; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Business Intelligence Report</h1>
        <p class="meta">
            Generated: ${new Date().toLocaleString()}<br>
            Data Sources: ${data.sources.length} | Data Points: ${data.dataPoints.length}<br>
            Period: ${data.timeRange.start.toLocaleDateString()} - ${data.timeRange.end.toLocaleDateString()}
        </p>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${insights.length}</div>
                <div class="stat-label">Total Insights</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${priorityCounts.critical}</div>
                <div class="stat-label">Critical Priority</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${actionPlan.actions.length}</div>
                <div class="stat-label">Action Items</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.metrics.length}</div>
                <div class="stat-label">Metrics Analyzed</div>
            </div>
        </div>

        <h2>🔍 Key Insights</h2>
        ${insights.slice(0, 10).map(insight => `
            <div class="insight ${insight.priority}">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-desc">${insight.description}</div>
                <span class="badge ${insight.priority}">${insight.priority.toUpperCase()}</span>
                <span class="badge">${(insight.confidence * 100).toFixed(0)}% confidence</span>
            </div>
        `).join('')}

        <h2>✅ Recommended Actions</h2>
        ${actionPlan.actions.slice(0, 10).map(action => `
            <div class="action">
                <div class="action-title">${action.title}</div>
                <div class="action-desc">${action.description}</div>
                <span class="badge ${action.priority}">${action.priority.toUpperCase()}</span>
                ${action.estimatedEffort ? `<span class="badge medium">${action.estimatedEffort}</span>` : ''}
            </div>
        `).join('')}

        <h2>📈 Data Summary</h2>
        <p><strong>Categories:</strong> ${data.categories.join(', ')}</p>
        <p><strong>Metrics:</strong> ${data.metrics.join(', ')}</p>
        <p><strong>Consolidated At:</strong> ${data.consolidatedAt.toLocaleString()}</p>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; text-align: center;">
            <p>Generated by Opptra Business Intelligence System</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate insights HTML
   */
  private generateInsightsHTML(insights: Insight[]): string {
    return `<html><body><h1>Insights</h1><pre>${JSON.stringify(insights, null, 2)}</pre></body></html>`;
  }

  /**
   * Generate action plan HTML
   */
  private generateActionPlanHTML(actionPlan: ActionPlan): string {
    return `<html><body><h1>Action Plan</h1><pre>${JSON.stringify(actionPlan, null, 2)}</pre></body></html>`;
  }
}
