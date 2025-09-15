import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';

/**
 * Creates an admin MCP server with system tools
 */
export async function createAdminServer (): Promise<Server> {
  const server = new Server(
    {
      name: 'admin-server',
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
      case 'system_info': {
        return {
          content: [
            {
              type: 'text',
              text: `System Info:\n- OS: ${process.platform}\n- Node: ${process.version}\n- Uptime: ${Math.floor(process.uptime())}s`
            }
          ]
        };
      }
      case 'memory_usage': {
        const usage = process.memoryUsage();
        return {
          content: [
            {
              type: 'text',
              text: `Memory Usage:\n- RSS: ${Math.round(usage.rss / 1024 / 1024)}MB\n- Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)}MB\n- Heap Total: ${Math.round(usage.heapTotal / 1024 / 1024)}MB`
            }
          ]
        };
      }
      case 'restart_service': {
        const { service } = args as { service: string };
        return {
          content: [
            {
              type: 'text',
              text: `[SIMULATION] Restarted service: ${service}`
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
          name: 'system_info',
          description: 'Get system information',
          inputSchema: z.object({}).passthrough()
        },
        {
          name: 'memory_usage',
          description: 'Get memory usage information',
          inputSchema: z.object({}).passthrough()
        },
        {
          name: 'restart_service',
          description: 'Restart a system service',
          inputSchema: z.object({
            service: z.string().describe('Service name to restart')
          }).passthrough()
        }
      ]
    };
  });

  return server;
}
