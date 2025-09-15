import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';

/**
 * Creates a basic MCP server with simple math tools
 */
export async function createBasicMathServer (): Promise<Server> {
  const server = new Server(
    {
      name: 'basic-math-server',
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
      case 'add': {
        const { a, b } = args as { a: number; b: number };
        return {
          content: [
            {
              type: 'text',
              text: `Result: ${a + b}`
            }
          ]
        };
      }
      case 'multiply': {
        const { a, b } = args as { a: number; b: number };
        return {
          content: [
            {
              type: 'text',
              text: `Result: ${a * b}`
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
          name: 'add',
          description: 'Add two numbers',
          inputSchema: z.object({
            a: z.number().describe('First number'),
            b: z.number().describe('Second number')
          }).passthrough()
        },
        {
          name: 'multiply',
          description: 'Multiply two numbers',
          inputSchema: z.object({
            a: z.number().describe('First number'),
            b: z.number().describe('Second number')
          }).passthrough()
        }
      ]
    };
  });

  return server;
}
