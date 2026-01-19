/**
 * Looker Studio Data Connector
 * Connects to Looker Studio (formerly Google Data Studio) to extract report data
 */

import { google } from 'googleapis';
import { DataSourceType, RawData, DataPoint } from '../types';
import { generateId } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Looker Studio connection options
 */
export interface LookerStudioOptions {
  credentials: {
    type: 'service_account' | 'oauth2';
    clientEmail?: string;
    privateKey?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
  };
  reportId?: string;
  datasetId?: string;
  query?: string;
}

/**
 * Looker Studio data
 */
export interface LookerStudioData {
  reportId?: string;
  datasetId?: string;
  rows: any[];
  schema?: any;
  extractedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Looker Studio Connector class
 */
export class LookerStudioConnector {
  /**
   * Extract data from Looker Studio
   *
   * Note: Looker Studio doesn't have a direct API for report data extraction.
   * This implementation uses Google Sheets API as Looker Studio reports
   * can be connected to Google Sheets for data extraction.
   *
   * Alternative approaches:
   * 1. Export Looker Studio data to Google Sheets, then read from Sheets
   * 2. Use BigQuery if Looker Studio is connected to BigQuery datasets
   * 3. Use the underlying data sources that Looker Studio connects to
   */
  async extract(
    sourceId: string,
    options: LookerStudioOptions
  ): Promise<RawData> {
    try {
      logger.info('Extracting data from Looker Studio source');

      // Authenticate
      const auth = await this.authenticate(options.credentials);

      let data: LookerStudioData;

      // If dataset is in BigQuery, query directly
      if (options.datasetId) {
        data = await this.extractFromBigQuery(auth, options.datasetId, options.query);
      } else if (options.reportId) {
        // Extract from Google Sheets if report exports to Sheets
        data = await this.extractFromSheets(auth, options.reportId);
      } else {
        throw new Error('Either reportId or datasetId must be provided');
      }

      logger.info('Successfully extracted data from Looker Studio source');

      return {
        sourceId,
        sourceType: DataSourceType.LOOKER_STUDIO,
        extractedAt: new Date(),
        data,
        metadata: {
          reportId: options.reportId,
          datasetId: options.datasetId,
        },
      };
    } catch (error) {
      logger.error('Error extracting from Looker Studio', error);
      throw new Error(`Failed to extract from Looker Studio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate with Google APIs
   */
  private async authenticate(credentials: LookerStudioOptions['credentials']): Promise<any> {
    if (credentials.type === 'service_account') {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.clientEmail,
          private_key: credentials.privateKey?.replace(/\\n/g, '\n'),
        },
        scopes: [
          'https://www.googleapis.com/auth/bigquery.readonly',
          'https://www.googleapis.com/auth/spreadsheets.readonly',
        ],
      });

      return auth;
    } else if (credentials.type === 'oauth2') {
      const oauth2Client = new google.auth.OAuth2(
        credentials.clientId,
        credentials.clientSecret
      );

      oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
      });

      return oauth2Client;
    }

    throw new Error('Invalid credential type');
  }

  /**
   * Extract data from BigQuery
   */
  private async extractFromBigQuery(
    auth: any,
    datasetId: string,
    query?: string
  ): Promise<LookerStudioData> {
    const bigquery = google.bigquery({ version: 'v2', auth });

    // Parse dataset ID (format: project.dataset.table)
    const parts = datasetId.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid dataset ID format. Expected: project.dataset.table');
    }

    const [projectId, dataset, table] = parts;

    // Build query
    const sqlQuery = query || `SELECT * FROM \`${datasetId}\` LIMIT 10000`;

    logger.info(`Executing BigQuery: ${sqlQuery}`);

    const job = await bigquery.jobs.query({
      projectId,
      requestBody: {
        query: sqlQuery,
        useLegacySql: false,
      },
    });

    const rows = job.data?.rows || [];
    const schema = job.data?.schema;

    return {
      datasetId,
      rows: rows.map((row: any) => this.bigQueryRowToObject(row, schema)),
      schema,
      extractedAt: new Date(),
      metadata: {
        totalRows: rows.length,
        projectId,
        dataset,
        table,
      },
    };
  }

  /**
   * Convert BigQuery row to object
   */
  private bigQueryRowToObject(row: any, schema: any): Record<string, any> {
    const obj: Record<string, any> = {};

    if (!schema?.fields || !row.f) {
      return obj;
    }

    schema.fields.forEach((field: any, index: number) => {
      const value = row.f[index]?.v;
      obj[field.name] = this.convertBigQueryValue(value, field.type);
    });

    return obj;
  }

  /**
   * Convert BigQuery value to appropriate type
   */
  private convertBigQueryValue(value: any, type: string): any {
    if (value === null || value === undefined) return null;

    switch (type) {
      case 'INTEGER':
      case 'INT64':
        return parseInt(value);
      case 'FLOAT':
      case 'FLOAT64':
        return parseFloat(value);
      case 'BOOLEAN':
      case 'BOOL':
        return value === 'true' || value === true;
      case 'TIMESTAMP':
      case 'DATE':
      case 'DATETIME':
        return new Date(value);
      default:
        return value;
    }
  }

  /**
   * Extract data from Google Sheets
   */
  private async extractFromSheets(auth: any, spreadsheetId: string): Promise<LookerStudioData> {
    const sheets = google.sheets({ version: 'v4', auth });

    logger.info(`Extracting data from Google Sheets: ${spreadsheetId}`);

    // Get spreadsheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';

    // Get data from first sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const values = response.data.values || [];

    if (values.length === 0) {
      return {
        reportId: spreadsheetId,
        rows: [],
        extractedAt: new Date(),
      };
    }

    // First row is headers
    const headers = values[0];
    const rows = values.slice(1).map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || null;
      });
      return obj;
    });

    return {
      reportId: spreadsheetId,
      rows,
      schema: headers,
      extractedAt: new Date(),
      metadata: {
        sheetName,
        totalRows: rows.length,
      },
    };
  }

  /**
   * Convert raw Looker Studio data to normalized data points
   */
  async normalize(rawData: RawData): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];
    const content = rawData.data as LookerStudioData;

    for (const row of content.rows) {
      for (const [key, value] of Object.entries(row)) {
        // Skip null values
        if (value === null || value === undefined) continue;

        // Try to determine if this is a metric (numeric) or dimension (categorical)
        const numericValue = typeof value === 'number' ? value : this.tryParseNumber(value);

        dataPoints.push({
          id: generateId(),
          timestamp: content.extractedAt,
          category: 'looker-studio',
          metric: key,
          value: numericValue !== null ? numericValue : String(value),
          source: rawData.sourceId,
          metadata: {
            sourceType: DataSourceType.LOOKER_STUDIO,
            reportId: content.reportId,
            datasetId: content.datasetId,
            isNumeric: numericValue !== null,
          },
        });
      }
    }

    logger.info(`Normalized ${dataPoints.length} data points from Looker Studio`);
    return dataPoints;
  }

  /**
   * Try to parse a value as a number
   */
  private tryParseNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;

    const cleaned = value.replace(/[$,\s%]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
}

/**
 * Export singleton instance
 */
export const lookerStudioConnector = new LookerStudioConnector();
