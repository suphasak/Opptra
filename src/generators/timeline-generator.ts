/**
 * Timeline Generator
 * Creates timeline visualizations of events, insights, and actions
 */

import {
  Timeline,
  TimelineEvent,
  Insight,
  ActionItem,
  ConsolidatedData,
} from '../types';
import { generateId, sortBy } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Timeline Generator class
 */
export class TimelineGenerator {
  /**
   * Generate timeline from consolidated data, insights, and actions
   */
  async generateTimeline(
    data: ConsolidatedData,
    insights: Insight[],
    actions: ActionItem[]
  ): Promise<Timeline> {
    logger.info('Generating timeline visualization');

    const events: TimelineEvent[] = [];

    // Add key data points as milestones
    events.push(...this.createDataMilestones(data));

    // Add insights as timeline events
    events.push(...this.createInsightEvents(insights));

    // Add action items as timeline events
    events.push(...this.createActionEvents(actions));

    // Sort events by date
    const sortedEvents = sortBy(events, e => e.date.getTime());

    // Determine time range
    const dates = sortedEvents.map(e => e.date);
    const timeRange = {
      start: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date(),
      end: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(),
    };

    // Get unique categories
    const categories = Array.from(new Set(sortedEvents.map(e => e.category)));

    const timeline: Timeline = {
      events: sortedEvents,
      timeRange,
      categories,
      generatedAt: new Date(),
    };

    logger.info(`Timeline generated with ${sortedEvents.length} events`);

    return timeline;
  }

  /**
   * Create milestone events from significant data points
   */
  private createDataMilestones(data: ConsolidatedData): TimelineEvent[] {
    const milestones: TimelineEvent[] = [];

    // Group data by month to find key milestones
    const monthlyData: Record<string, typeof data.dataPoints> = {};

    for (const point of data.dataPoints) {
      if (typeof point.value !== 'number') continue;

      const monthKey = `${point.timestamp.getFullYear()}-${String(point.timestamp.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = [];
      }
      monthlyData[monthKey].push(point);
    }

    // Create milestone for each month's peak metric
    for (const [monthKey, points] of Object.entries(monthlyData)) {
      if (points.length === 0) continue;

      // Find highest value data point
      const peak = points.reduce((max, p) => {
        const pVal = typeof p.value === 'number' ? p.value : 0;
        const maxVal = typeof max.value === 'number' ? max.value : 0;
        return pVal > maxVal ? p : max;
      });

      milestones.push({
        id: generateId(),
        date: peak.timestamp,
        type: 'milestone',
        title: `Peak in ${peak.metric}`,
        description: `${peak.metric} reached ${peak.value} in ${monthKey}`,
        category: peak.category,
        metadata: {
          value: peak.value,
          metric: peak.metric,
          source: peak.source,
        },
      });
    }

    // Limit to top 10 milestones to avoid clutter
    return milestones.slice(0, 10);
  }

  /**
   * Create events from insights
   */
  private createInsightEvents(insights: Insight[]): TimelineEvent[] {
    return insights.map(insight => ({
      id: generateId(),
      date: insight.generatedAt,
      type: 'insight' as const,
      title: insight.title,
      description: insight.description,
      category: insight.category,
      priority: insight.priority,
      relatedItems: [insight.id],
      metadata: {
        insightType: insight.type,
        confidence: insight.confidence,
        metrics: insight.metrics,
      },
    }));
  }

  /**
   * Create events from action items
   */
  private createActionEvents(actions: ActionItem[]): TimelineEvent[] {
    return actions
      .filter(action => action.dueDate) // Only actions with due dates
      .map(action => ({
        id: generateId(),
        date: action.dueDate!,
        type: 'action' as const,
        title: action.title,
        description: action.description,
        category: action.category,
        priority: action.priority,
        relatedItems: [action.id, ...action.relatedInsights],
        metadata: {
          status: action.status,
          estimatedEffort: action.estimatedEffort,
          assignedTo: action.assignedTo,
        },
      }));
  }

  /**
   * Export timeline to HTML
   */
  async exportToHTML(timeline: Timeline): Promise<string> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Intelligence Timeline</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f7fa;
            padding: 40px 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        h1 {
            color: #1a202c;
            margin-bottom: 10px;
        }

        .meta {
            color: #718096;
            margin-bottom: 40px;
        }

        .timeline {
            position: relative;
            padding-left: 40px;
        }

        .timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #e2e8f0;
        }

        .event {
            position: relative;
            margin-bottom: 30px;
        }

        .event::before {
            content: '';
            position: absolute;
            left: -33px;
            top: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: white;
            border: 3px solid #4299e1;
        }

        .event.milestone::before { border-color: #9f7aea; }
        .event.insight::before { border-color: #ed8936; }
        .event.action::before { border-color: #48bb78; }

        .event-date {
            color: #718096;
            font-size: 14px;
            margin-bottom: 5px;
        }

        .event-title {
            color: #1a202c;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .event-description {
            color: #4a5568;
            line-height: 1.6;
        }

        .event-meta {
            margin-top: 8px;
            display: flex;
            gap: 10px;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .badge.critical { background: #fed7d7; color: #c53030; }
        .badge.high { background: #feebc8; color: #c05621; }
        .badge.medium { background: #e6fffa; color: #285e61; }
        .badge.low { background: #e6fffa; color: #2c7a7b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Business Intelligence Timeline</h1>
        <p class="meta">
            Generated: ${timeline.generatedAt.toLocaleString()}<br>
            Period: ${timeline.timeRange.start.toLocaleDateString()} - ${timeline.timeRange.end.toLocaleDateString()}<br>
            Events: ${timeline.events.length}
        </p>

        <div class="timeline">
            ${timeline.events.map(event => `
                <div class="event ${event.type}">
                    <div class="event-date">${event.date.toLocaleDateString()}</div>
                    <div class="event-title">${event.title}</div>
                    <div class="event-description">${event.description}</div>
                    <div class="event-meta">
                        <span class="badge">${event.type}</span>
                        ${event.priority ? `<span class="badge ${event.priority}">${event.priority}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `;

    return html.trim();
  }
}

/**
 * Export singleton instance
 */
export const timelineGenerator = new TimelineGenerator();
