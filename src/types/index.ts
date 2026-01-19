/**
 * Core type definitions for the Business Intelligence Automation System
 */

/**
 * Supported data source types
 */
export enum DataSourceType {
  PDF = 'pdf',
  LOOKER_STUDIO = 'looker_studio',
  WEB = 'web',
  CSV = 'csv',
  JSON = 'json',
  API = 'api',
}

/**
 * Data source configuration
 */
export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  location: string; // File path, URL, or API endpoint
  credentials?: Record<string, string>;
  metadata?: Record<string, any>;
  lastExtracted?: Date;
}

/**
 * Extracted raw data
 */
export interface RawData {
  sourceId: string;
  sourceType: DataSourceType;
  extractedAt: Date;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Normalized data point
 */
export interface DataPoint {
  id: string;
  timestamp: Date;
  category: string;
  metric: string;
  value: number | string;
  unit?: string;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * Consolidated dataset
 */
export interface ConsolidatedData {
  dataPoints: DataPoint[];
  sources: string[];
  consolidatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  categories: string[];
  metrics: string[];
}

/**
 * Insight types
 */
export enum InsightType {
  TREND = 'trend',
  ANOMALY = 'anomaly',
  CORRELATION = 'correlation',
  PREDICTION = 'prediction',
  COMPARISON = 'comparison',
  ACHIEVEMENT = 'achievement',
}

/**
 * Priority levels for insights and actions
 */
export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Generated insight
 */
export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  category: string;
  metrics: string[];
  priority: Priority;
  confidence: number; // 0-1
  data: {
    current?: number;
    previous?: number;
    change?: number;
    changePercent?: number;
    trend?: 'up' | 'down' | 'stable';
    values?: Array<{ date: Date; value: number }>;
  };
  generatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Action item status
 */
export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

/**
 * Action plan item
 */
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: ActionStatus;
  assignedTo?: string;
  dueDate?: Date;
  relatedInsights: string[]; // Insight IDs
  category: string;
  estimatedEffort?: string;
  dependencies?: string[]; // Other action IDs
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Action plan
 */
export interface ActionPlan {
  id: string;
  title: string;
  description: string;
  actions: ActionItem[];
  createdAt: Date;
  timeframe: {
    start: Date;
    end: Date;
  };
  owner?: string;
  objectives: string[];
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  id: string;
  date: Date;
  type: 'milestone' | 'data_point' | 'insight' | 'action';
  title: string;
  description: string;
  category: string;
  priority?: Priority;
  relatedItems?: string[]; // IDs of related insights or actions
  metadata?: Record<string, any>;
}

/**
 * Timeline view
 */
export interface Timeline {
  events: TimelineEvent[];
  timeRange: {
    start: Date;
    end: Date;
  };
  categories: string[];
  generatedAt: Date;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  title: string;
  description?: string;
  layout: 'grid' | 'rows' | 'columns';
  widgets: DashboardWidget[];
  refreshInterval?: number; // In seconds
  theme?: 'light' | 'dark';
}

/**
 * Dashboard widget types
 */
export enum WidgetType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  TABLE = 'table',
  METRIC_CARD = 'metric_card',
  TIMELINE = 'timeline',
  ACTION_LIST = 'action_list',
  INSIGHT_FEED = 'insight_feed',
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: {
    row: number;
    col: number;
    width: number;
    height: number;
  };
  dataSource: string; // Query or data reference
  config?: Record<string, any>;
}

/**
 * Report output format
 */
export enum ReportFormat {
  HTML = 'html',
  PDF = 'pdf',
  JSON = 'json',
  MARKDOWN = 'markdown',
  CSV = 'csv',
}

/**
 * Generated report
 */
export interface Report {
  id: string;
  title: string;
  description: string;
  format: ReportFormat;
  content: string | Buffer;
  generatedAt: Date;
  metadata?: {
    author?: string;
    version?: string;
    tags?: string[];
  };
}

/**
 * Configuration for the entire system
 */
export interface SystemConfig {
  dataSources: DataSource[];
  extractionSchedule?: string; // Cron expression
  analysisConfig: {
    enableTrendDetection: boolean;
    enableAnomalyDetection: boolean;
    enablePredictions: boolean;
    confidenceThreshold: number; // 0-1
  };
  dashboardConfig?: DashboardConfig;
  outputConfig: {
    outputDir: string;
    defaultFormat: ReportFormat;
    includeRawData: boolean;
  };
  notificationConfig?: {
    enabled: boolean;
    channels: Array<'email' | 'slack' | 'webhook'>;
    thresholds: {
      critical: boolean;
      high: boolean;
      medium: boolean;
      low: boolean;
    };
  };
}
