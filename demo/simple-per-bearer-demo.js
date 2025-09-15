#!/usr/bin/env node

/**
 * Simple demo server that uses the built version
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import closeWithGrace from 'close-with-grace';
import Fastify from 'fastify';
import { z } from 'zod';

// Import the built version
import FastifyMcpStreamableHttp, { TokenBasedServerProvider, getMcpDecorator } from '../dist/index.js';

/**
 * Creates a basic MCP server with simple math tools
 */
async function createBasicMathServer () {
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

  // Add tool handlers
  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'add': {
        const { a, b } = args;
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
        const { a, b } = args;
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

/**
 * Creates an admin MCP server with system tools
 */
async function createAdminServer () {
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

  // Add tool handlers
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
              text: `Memory Usage:\n- RSS: ${Math.round(usage.rss / 1024 / 1024)}MB\n- Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`
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
        }
      ]
    };
  });

  return server;
}

/**
 * Creates a data analysis server
 */
async function createDataServer () {
  const server = new Server(
    {
      name: 'data-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Add tool handlers
  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'calculate_mean': {
        const { numbers } = args;
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
        }
      ]
    };
  });

  return server;
}

// Define tokens
const TOKENS = {
  'basic-user-token': 'Basic User (Math tools only)',
  'admin-token': 'Admin User (System tools)',
  'analyst-token': 'Data Analyst (Statistics tools)'
};

async function startServer () {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    }
  });

  // Create the token-based server provider
  const bearerTokenProvider = new TokenBasedServerProvider({
    'basic-user-token': createBasicMathServer,
    'admin-token': createAdminServer,
    'analyst-token': createDataServer
  });

  // Register the MCP plugin with per-bearer configuration
  await app.register(FastifyMcpStreamableHttp, {
    endpoint: '/mcp',
    authorization: {
      bearerTokenProvider,
      bearerMiddlewareOptions: {
        verifier: bearerTokenProvider  // Use the same provider for verification
      },
      oauth2: {
        authorizationServerOAuthMetadata: {
          issuer: 'http://127.0.0.1:9081',
          authorization_endpoint: 'http://127.0.0.1:9081/authorize',
          token_endpoint: 'http://127.0.0.1:9081/token',
          registration_endpoint: 'http://127.0.0.1:9081/register',
          response_types_supported: ['code']
        },
        protectedResourceOAuthMetadata: {
          resource: 'http://127.0.0.1:9081/.well-known/oauth-protected-resource'
        }
      }
    }
  });

  // Add info endpoint
  app.get('/', async (request, reply) => {
    return {
      message: 'Per-Bearer Token MCP Server Demo',
      tokens: TOKENS,
      endpoints: {
        mcp: '/mcp',
        tokens_info: '/',
        oauth_authorization_server: '/.well-known/oauth-authorization-server',
        oauth_protected_resource: '/.well-known/oauth-protected-resource'
      },
      usage: {
        note: 'Use one of the bearer tokens in the Authorization header',
        example: 'Authorization: Bearer basic-user-token'
      }
    };
  });

  // Setup session event handlers
  const sessionManager = getMcpDecorator(app).getSessionManager();

  sessionManager.on('sessionCreated', (sessionId) => {
    app.log.info({ sessionId }, 'MCP session created');
  });

  sessionManager.on('sessionDestroyed', (sessionId) => {
    app.log.info({ sessionId }, 'MCP session destroyed');
  });

  sessionManager.on('transportError', (sessionId, error) => {
    app.log.error({ sessionId, error }, 'MCP transport error');
  });

  // Graceful shutdown
  closeWithGrace(async ({ signal, err }) => {
    if (err) {
      app.log.error({ err }, 'Server closing with error');
    } else {
      app.log.info(`${signal} received, server closing`);
    }

    await getMcpDecorator(app).shutdown();
    await app.close();
  });

  await app.ready();

  // Start the server
  try {
    const address = await app.listen({
      host: '127.0.0.1',
      port: 9081
    });

    app.log.info(`\n🚀 Per-Bearer Token MCP Server started at ${address}\n`);
    app.log.info('Available bearer tokens:');
    Object.entries(TOKENS).forEach(([token, description]) => {
      app.log.info(`  • ${token} - ${description}`);
    });
    app.log.info('\nTest with: curl -H "Authorization: Bearer basic-user-token" http://127.0.0.1:9081/mcp\n');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer().catch(console.error);
