/**
 * Action Plan Generator
 * Creates actionable plans based on insights
 */

import {
  Insight,
  ActionPlan,
  ActionItem,
  ActionStatus,
  Priority,
} from '../types';
import { generateId } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Action Plan Generator class
 */
export class ActionPlanGenerator {
  /**
   * Generate action plan from insights
   */
  async generateActionPlan(
    insights: Insight[],
    title: string,
    timeframeWeeks: number = 4
  ): Promise<ActionPlan> {
    logger.info(`Generating action plan from ${insights.length} insights`);

    const actions: ActionItem[] = [];

    // Group insights by priority
    const criticalInsights = insights.filter(i => i.priority === Priority.CRITICAL);
    const highInsights = insights.filter(i => i.priority === Priority.HIGH);
    const mediumInsights = insights.filter(i => i.priority === Priority.MEDIUM);

    // Generate actions for critical insights (immediate action required)
    for (const insight of criticalInsights) {
      actions.push(...this.createActionsForInsight(insight, 1)); // 1 week
    }

    // Generate actions for high priority insights
    for (const insight of highInsights) {
      actions.push(...this.createActionsForInsight(insight, 2)); // 2 weeks
    }

    // Generate actions for medium priority insights
    for (const insight of mediumInsights) {
      actions.push(...this.createActionsForInsight(insight, 4)); // 4 weeks
    }

    // Extract objectives from insights
    const objectives = this.extractObjectives(insights);

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + timeframeWeeks * 7);

    const actionPlan: ActionPlan = {
      id: generateId(),
      title,
      description: `Action plan based on ${insights.length} key insights with ${actions.length} recommended actions.`,
      actions,
      createdAt: now,
      timeframe: {
        start: now,
        end: endDate,
      },
      objectives,
    };

    logger.info(`Action plan generated with ${actions.length} actions`);

    return actionPlan;
  }

  /**
   * Create actions for a specific insight
   */
  private createActionsForInsight(insight: Insight, weeksToComplete: number): ActionItem[] {
    const actions: ActionItem[] = [];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + weeksToComplete * 7);

    switch (insight.type) {
      case 'trend':
        if (insight.data.trend === 'down' && insight.priority !== Priority.LOW) {
          // Negative trend - create recovery actions
          actions.push({
            id: generateId(),
            title: `Investigate declining ${insight.metrics[0]}`,
            description: `Analyze root causes of the ${Math.abs(insight.data.changePercent || 0).toFixed(1)}% decrease in ${insight.metrics[0]}.`,
            priority: insight.priority,
            status: ActionStatus.PENDING,
            relatedInsights: [insight.id],
            category: 'investigation',
            estimatedEffort: '1-2 days',
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate,
          });

          actions.push({
            id: generateId(),
            title: `Develop recovery plan for ${insight.metrics[0]}`,
            description: `Create and implement strategies to reverse the declining trend in ${insight.metrics[0]}.`,
            priority: insight.priority,
            status: ActionStatus.PENDING,
            relatedInsights: [insight.id],
            category: 'strategy',
            estimatedEffort: '1 week',
            dependencies: [actions[0]?.id],
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate,
          });
        } else if (insight.data.trend === 'up') {
          // Positive trend - create optimization actions
          actions.push({
            id: generateId(),
            title: `Capitalize on growth in ${insight.metrics[0]}`,
            description: `Identify success factors driving ${insight.data.changePercent?.toFixed(1)}% growth and scale winning strategies.`,
            priority: Priority.MEDIUM,
            status: ActionStatus.PENDING,
            relatedInsights: [insight.id],
            category: 'optimization',
            estimatedEffort: '3-5 days',
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate,
          });
        }
        break;

      case 'anomaly':
        actions.push({
          id: generateId(),
          title: `Investigate anomaly in ${insight.metrics[0]}`,
          description: `Urgent investigation required for unusual ${insight.data.changePercent && insight.data.changePercent > 0 ? 'spike' : 'drop'} of ${Math.abs(insight.data.changePercent || 0).toFixed(1)}%.`,
          priority: insight.priority,
          status: ActionStatus.PENDING,
          relatedInsights: [insight.id],
          category: 'investigation',
          estimatedEffort: '1 day',
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate,
        });
        break;

      case 'correlation':
        actions.push({
          id: generateId(),
          title: `Leverage correlation between ${insight.metrics.join(' and ')}`,
          description: `Utilize the relationship between these metrics to optimize business operations and decision-making.`,
          priority: Priority.MEDIUM,
          status: ActionStatus.PENDING,
          relatedInsights: [insight.id],
          category: 'optimization',
          estimatedEffort: '1 week',
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate,
        });
        break;

      case 'comparison':
        if (insight.data.changePercent && Math.abs(insight.data.changePercent) > 15) {
          actions.push({
            id: generateId(),
            title: `Address significant change in ${insight.metrics[0]}`,
            description: `Respond to ${insight.data.changePercent > 0 ? 'increase' : 'decrease'} of ${Math.abs(insight.data.changePercent).toFixed(1)}% versus previous period.`,
            priority: insight.priority,
            status: ActionStatus.PENDING,
            relatedInsights: [insight.id],
            category: 'response',
            estimatedEffort: '3-5 days',
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate,
          });
        }
        break;
    }

    return actions;
  }

  /**
   * Extract business objectives from insights
   */
  private extractObjectives(insights: Insight[]): string[] {
    const objectives = new Set<string>();

    const hasNegativeTrends = insights.some(i => i.type === 'trend' && i.data.trend === 'down');
    const hasAnomalies = insights.some(i => i.type === 'anomaly');
    const hasPositiveTrends = insights.some(i => i.type === 'trend' && i.data.trend === 'up');

    if (hasNegativeTrends) {
      objectives.add('Reverse declining metrics and restore positive growth');
    }

    if (hasAnomalies) {
      objectives.add('Investigate and address unusual data patterns');
    }

    if (hasPositiveTrends) {
      objectives.add('Sustain and amplify positive growth trends');
    }

    objectives.add('Optimize data-driven decision making');
    objectives.add('Improve overall business performance');

    return Array.from(objectives);
  }
}

/**
 * Export singleton instance
 */
export const actionPlanGenerator = new ActionPlanGenerator();
