#!/usr/bin/env node

/**
 * Opptra Business Intelligence CLI
 * Main command-line interface for the BI automation system
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { OpptraBI } from '../core/orchestrator';
import { logger } from '../utils/logger';
import { DataSourceType } from '../types';

const program = new Command();

program
  .name('opptra')
  .description('End-to-end business intelligence automation system')
  .version('1.0.0');

/**
 * Analyze command - Main analysis workflow
 */
program
  .command('analyze')
  .description('Run full analysis pipeline: extract, consolidate, analyze, and generate reports')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-o, --output <dir>', 'Output directory for reports', './output')
  .option('--pdf <paths...>', 'PDF file paths to analyze')
  .option('--web <urls...>', 'Web URLs to scrape')
  .option('--looker <id>', 'Looker Studio report or dataset ID')
  .option('--format <type>', 'Output format (html, pdf, json, markdown)', 'html')
  .action(async (options) => {
    const spinner = ora('Initializing Opptra BI...').start();

    try {
      const bi = new OpptraBI();

      // Add data sources
      const sources = [];

      if (options.pdf) {
        for (const pdfPath of options.pdf) {
          sources.push({
            type: DataSourceType.PDF,
            location: pdfPath,
          });
        }
      }

      if (options.web) {
        for (const url of options.web) {
          sources.push({
            type: DataSourceType.WEB,
            location: url,
          });
        }
      }

      if (options.looker) {
        sources.push({
          type: DataSourceType.LOOKER_STUDIO,
          location: options.looker,
        });
      }

      if (sources.length === 0) {
        spinner.fail('No data sources specified');
        console.log(chalk.yellow('\nPlease specify at least one data source:'));
        console.log('  --pdf <file>     PDF business report');
        console.log('  --web <url>      Web page URL');
        console.log('  --looker <id>    Looker Studio ID');
        process.exit(1);
      }

      spinner.text = `Extracting data from ${sources.length} source(s)...`;

      // Run the full analysis pipeline
      const result = await bi.runFullAnalysis(sources, {
        outputDir: options.output,
        outputFormat: options.format,
      });

      spinner.succeed(chalk.green('Analysis complete!'));

      // Display summary
      console.log(chalk.bold('\n📊 Analysis Summary'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`Data Sources:     ${result.sources.length}`);
      console.log(`Data Points:      ${result.dataPoints}`);
      console.log(`Insights:         ${result.insights.length}`);
      console.log(`Action Items:     ${result.actionPlan.actions.length}`);
      console.log(`Output Directory: ${result.outputDir}`);

      // Display top insights
      console.log(chalk.bold('\n🔍 Top Insights'));
      console.log(chalk.gray('─'.repeat(50)));

      const topInsights = result.insights.slice(0, 5);
      for (const insight of topInsights) {
        const priorityColor =
          insight.priority === 'critical' ? chalk.red :
          insight.priority === 'high' ? chalk.yellow :
          insight.priority === 'medium' ? chalk.blue :
          chalk.gray;

        console.log(`${priorityColor('●')} ${insight.title}`);
        console.log(`  ${chalk.gray(insight.description.substring(0, 80))}...`);
      }

      // Display critical actions
      const criticalActions = result.actionPlan.actions.filter(a => a.priority === 'critical');
      if (criticalActions.length > 0) {
        console.log(chalk.bold('\n⚠️  Critical Actions Required'));
        console.log(chalk.gray('─'.repeat(50)));

        for (const action of criticalActions) {
          console.log(chalk.red(`● ${action.title}`));
          console.log(`  ${chalk.gray(action.description.substring(0, 80))}...`);
        }
      }

      console.log(chalk.bold(`\n✨ Reports saved to: ${chalk.cyan(result.outputDir)}`));
      console.log(chalk.gray('\nView the full report by opening the HTML file in your browser.'));

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      logger.error('Analysis failed', error);
      process.exit(1);
    }
  });

/**
 * Extract command - Extract data only
 */
program
  .command('extract')
  .description('Extract data from sources without analysis')
  .option('--pdf <path>', 'PDF file path')
  .option('--web <url>', 'Web URL')
  .option('-o, --output <file>', 'Output JSON file')
  .action(async (options) => {
    const spinner = ora('Extracting data...').start();

    try {
      const bi = new OpptraBI();
      let rawData;

      if (options.pdf) {
        rawData = await bi.extractFromPDF(options.pdf);
      } else if (options.web) {
        rawData = await bi.extractFromWeb(options.web);
      } else {
        spinner.fail('No source specified');
        process.exit(1);
      }

      spinner.succeed('Data extracted successfully');

      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(rawData, null, 2));
        console.log(chalk.green(`\n✓ Saved to ${options.output}`));
      } else {
        console.log(JSON.stringify(rawData, null, 2));
      }
    } catch (error) {
      spinner.fail('Extraction failed');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Init command - Initialize configuration
 */
program
  .command('init')
  .description('Initialize Opptra BI configuration')
  .action(async () => {
    const spinner = ora('Creating configuration...').start();

    try {
      const configPath = path.join(process.cwd(), 'opptra.config.json');

      const config = {
        dataSources: [],
        analysisConfig: {
          enableTrendDetection: true,
          enableAnomalyDetection: true,
          enablePredictions: false,
          confidenceThreshold: 0.6,
        },
        outputConfig: {
          outputDir: './output',
          defaultFormat: 'html',
          includeRawData: false,
        },
      };

      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      spinner.succeed('Configuration created');
      console.log(chalk.green(`\n✓ Configuration saved to ${configPath}`));
      console.log(chalk.gray('\nEdit this file to customize your analysis settings.'));
    } catch (error) {
      spinner.fail('Failed to create configuration');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Dashboard command - Start web dashboard
 */
program
  .command('dashboard')
  .description('Start interactive web dashboard')
  .option('-p, --port <number>', 'Port number', '3000')
  .action(async (options) => {
    console.log(chalk.cyan('🚀 Starting Opptra BI Dashboard...'));
    console.log(chalk.gray(`\n   Dashboard will be available at http://localhost:${options.port}`));
    console.log(chalk.yellow('\n   Note: Dashboard feature coming soon!'));
    console.log(chalk.gray('   Use the analyze command to generate static reports for now.\n'));
  });

// Parse command-line arguments
program.parse();
