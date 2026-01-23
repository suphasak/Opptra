/**
 * Impact vs Effort Prioritization System
 * Helps prioritize recommendations based on expected impact and implementation effort
 */

export interface PrioritizedRecommendation {
  id: string;
  title: string;
  description: string;
  brand?: string;
  market?: string;
  category: 'revenue' | 'cost' | 'efficiency' | 'risk';

  // Impact scoring (0-10)
  impactScore: number;
  impactFactors: {
    revenueImpact: number;      // 0-10 based on dollar impact
    scope: number;              // 0-10 based on breadth (all brands vs one)
    urgency: number;            // 0-10 based on time sensitivity
  };
  expectedImpact: {
    revenue?: number;           // Dollar amount
    cost?: number;              // Dollar amount (savings)
    timeframe: 'immediate' | 'this-week' | 'this-month';
  };

  // Effort scoring (0-10)
  effortScore: number;
  effortFactors: {
    time: number;               // 0-10 based on hours/days/weeks needed
    resources: number;          // 0-10 based on people/teams needed
    complexity: number;         // 0-10 based on technical difficulty
  };
  estimatedEffort: {
    hours?: number;
    people?: number;
    teams?: string[];
  };

  // Prioritization
  priorityScore: number;        // impactScore / effortScore
  priorityCategory: '🔥 DO FIRST' | '📅 SCHEDULE' | '🤔 CONSIDER' | '❌ AVOID';

  // Ownership
  owner?: string;
  deadline?: Date;
  dependencies?: string[];
}

export class PrioritizationEngine {
  /**
   * Calculate impact score based on multiple factors
   */
  calculateImpactScore(
    revenueImpact: number = 0,
    scope: 'single-brand' | 'multiple-brands' | 'all-brands' = 'single-brand',
    urgency: 'immediate' | 'this-week' | 'this-month' = 'this-week'
  ): { score: number; factors: any } {
    // Revenue impact scoring (0-10)
    let revenueScore = 0;
    if (revenueImpact >= 20000) revenueScore = 10;
    else if (revenueImpact >= 10000) revenueScore = 8;
    else if (revenueImpact >= 5000) revenueScore = 6;
    else if (revenueImpact >= 2000) revenueScore = 4;
    else if (revenueImpact >= 500) revenueScore = 2;
    else revenueScore = 1;

    // Scope scoring (0-10)
    const scopeScores = {
      'single-brand': 4,
      'multiple-brands': 7,
      'all-brands': 10,
    };
    const scopeScore = scopeScores[scope];

    // Urgency scoring (0-10)
    const urgencyScores = {
      'immediate': 10,
      'this-week': 7,
      'this-month': 4,
    };
    const urgencyScore = urgencyScores[urgency];

    // Weighted average: revenue 50%, scope 30%, urgency 20%
    const totalScore = (revenueScore * 0.5) + (scopeScore * 0.3) + (urgencyScore * 0.2);

    return {
      score: Math.round(totalScore * 10) / 10,
      factors: {
        revenueImpact: revenueScore,
        scope: scopeScore,
        urgency: urgencyScore,
      },
    };
  }

  /**
   * Calculate effort score based on multiple factors
   */
  calculateEffortScore(
    hours: number = 1,
    people: number = 1,
    complexity: 'simple' | 'moderate' | 'complex' | 'very-complex' = 'simple'
  ): { score: number; factors: any } {
    // Time scoring (0-10)
    let timeScore = 0;
    if (hours <= 1) timeScore = 2;
    else if (hours <= 4) timeScore = 3;
    else if (hours <= 8) timeScore = 4;
    else if (hours <= 40) timeScore = 7;  // 1 week
    else if (hours <= 160) timeScore = 9; // 1 month
    else timeScore = 10;

    // Resources scoring (0-10)
    let resourceScore = 0;
    if (people === 1) resourceScore = 2;
    else if (people === 2) resourceScore = 4;
    else if (people <= 5) resourceScore = 7;
    else resourceScore = 10;

    // Complexity scoring (0-10)
    const complexityScores = {
      'simple': 2,
      'moderate': 5,
      'complex': 8,
      'very-complex': 10,
    };
    const complexityScore = complexityScores[complexity];

    // Weighted average: time 50%, resources 30%, complexity 20%
    const totalScore = (timeScore * 0.5) + (resourceScore * 0.3) + (complexityScore * 0.2);

    return {
      score: Math.round(totalScore * 10) / 10,
      factors: {
        time: timeScore,
        resources: resourceScore,
        complexity: complexityScore,
      },
    };
  }

  /**
   * Calculate priority score and category
   */
  calculatePriority(impactScore: number, effortScore: number): {
    score: number;
    category: '🔥 DO FIRST' | '📅 SCHEDULE' | '🤔 CONSIDER' | '❌ AVOID';
  } {
    // Avoid division by zero
    const score = effortScore > 0 ? impactScore / effortScore : 0;

    let category: '🔥 DO FIRST' | '📅 SCHEDULE' | '🤔 CONSIDER' | '❌ AVOID';

    if (score >= 2.0) {
      category = '🔥 DO FIRST';
    } else if (score >= 1.0) {
      category = '📅 SCHEDULE';
    } else if (score >= 0.5) {
      category = '🤔 CONSIDER';
    } else {
      category = '❌ AVOID';
    }

    return {
      score: Math.round(score * 10) / 10,
      category,
    };
  }

  /**
   * Create a prioritized recommendation
   */
  createRecommendation(params: {
    title: string;
    description: string;
    brand?: string;
    market?: string;
    category: 'revenue' | 'cost' | 'efficiency' | 'risk';
    revenueImpact?: number;
    costSavings?: number;
    scope?: 'single-brand' | 'multiple-brands' | 'all-brands';
    urgency?: 'immediate' | 'this-week' | 'this-month';
    timeframe?: 'immediate' | 'this-week' | 'this-month';
    hours?: number;
    people?: number;
    complexity?: 'simple' | 'moderate' | 'complex' | 'very-complex';
    owner?: string;
    deadline?: Date;
    dependencies?: string[];
  }): PrioritizedRecommendation {
    const revenueImpact = params.revenueImpact || params.costSavings || 0;

    // Calculate impact
    const impact = this.calculateImpactScore(
      revenueImpact,
      params.scope || 'single-brand',
      params.urgency || 'this-week'
    );

    // Calculate effort
    const effort = this.calculateEffortScore(
      params.hours || 1,
      params.people || 1,
      params.complexity || 'simple'
    );

    // Calculate priority
    const priority = this.calculatePriority(impact.score, effort.score);

    return {
      id: this.generateId(),
      title: params.title,
      description: params.description,
      brand: params.brand,
      market: params.market,
      category: params.category,

      impactScore: impact.score,
      impactFactors: impact.factors,
      expectedImpact: {
        revenue: params.revenueImpact,
        cost: params.costSavings,
        timeframe: params.timeframe || 'this-week',
      },

      effortScore: effort.score,
      effortFactors: effort.factors,
      estimatedEffort: {
        hours: params.hours,
        people: params.people,
      },

      priorityScore: priority.score,
      priorityCategory: priority.category,

      owner: params.owner,
      deadline: params.deadline,
      dependencies: params.dependencies,
    };
  }

  /**
   * Sort recommendations by priority score (highest first)
   */
  sortByPriority(recommendations: PrioritizedRecommendation[]): PrioritizedRecommendation[] {
    return [...recommendations].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Group recommendations by category
   */
  groupByCategory(recommendations: PrioritizedRecommendation[]): {
    doFirst: PrioritizedRecommendation[];
    schedule: PrioritizedRecommendation[];
    consider: PrioritizedRecommendation[];
    avoid: PrioritizedRecommendation[];
  } {
    return {
      doFirst: recommendations.filter(r => r.priorityCategory === '🔥 DO FIRST'),
      schedule: recommendations.filter(r => r.priorityCategory === '📅 SCHEDULE'),
      consider: recommendations.filter(r => r.priorityCategory === '🤔 CONSIDER'),
      avoid: recommendations.filter(r => r.priorityCategory === '❌ AVOID'),
    };
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const prioritizationEngine = new PrioritizationEngine();
