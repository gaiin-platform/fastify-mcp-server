import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';

/**
 * Creates a data analysis MCP server with data tools
 */
export async function createDataAnalysisServer(): Promise<Server> {
  const server = new Server(
    {
      name: 'data-analysis-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Add tool
  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'calculate_mean': {
        const { numbers } = args as { numbers: number[] };
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        return {
          content: [
            {
              type: 'text',
              text: `Mean of [${numbers.join(', ')}] = ${mean.toFixed(2)}`
            }
          ]
        };
      }
      case 'calculate_median': {
        const { numbers } = args as { numbers: number[] };
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
        return {
          content: [
            {
              type: 'text',
              text: `Median of [${numbers.join(', ')}] = ${median}`
            }
          ]
        };
      }
      case 'find_outliers': {
        const { numbers, threshold } = args as { numbers: number[]; threshold?: number };
        const thresh = threshold || 2;
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
        const stdDev = Math.sqrt(variance);
        
        const outliers = numbers.filter(num => Math.abs(num - mean) > thresh * stdDev);
        
        return {
          content: [
            {
              type: 'text',
              text: `Outliers (>${thresh} std dev): [${outliers.join(', ')}]`
            }
          ]
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // List tools
  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'calculate_mean',
          description: 'Calculate the arithmetic mean of a list of numbers',
          inputSchema: z.object({
            numbers: z.array(z.number()).describe('Array of numbers')
          }).passthrough()
        },
        {
          name: 'calculate_median',
          description: 'Calculate the median of a list of numbers',
          inputSchema: z.object({
            numbers: z.array(z.number()).describe('Array of numbers')
          }).passthrough()
        },
        {
          name: 'find_outliers',
          description: 'Find outliers in a dataset using standard deviation',
          inputSchema: z.object({
            numbers: z.array(z.number()).describe('Array of numbers'),
            threshold: z.number().optional().describe('Standard deviation threshold (default: 2)')
          }).passthrough()
        }
      ]
    };
  });

  return server;
}