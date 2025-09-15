#!/usr/bin/env node

/**
 * Working per-bearer token demo with proper error handling
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import closeWithGrace from 'close-with-grace';
import Fastify from 'fastify';
import { z } from 'zod';

// Import the built version
import FastifyMcpStreamableHttp, { TokenBasedServerProvider, getMcpDecorator } from '../dist/index.js';

/**
 * Creates a basic MCP server with simple math tools
 */
async function createBasicMathServer () {
  console.log('Creating BasicMathServer...');

  const server = new McpServer({
    name: 'basic-math-server',
    version: '1.0.0'
  });

  // Add math tools using the McpServer API
  server.tool('add', 'Add two numbers', {
    a: { type: 'number', description: 'First number' },
    b: { type: 'number', description: 'Second number' }
  }, ({ a, b }) => ({
    content: [
      {
        type: 'text',
        text: `Math Result: ${a} + ${b} = ${a + b}`
      }
    ]
  }));

  server.tool('multiply', 'Multiply two numbers', {
    a: { type: 'number', description: 'First number' },
    b: { type: 'number', description: 'Second number' }
  }, ({ a, b }) => ({
    content: [
      {
        type: 'text',
        text: `Math Result: ${a} × ${b} = ${a * b}`
      }
    ]
  }));

  console.log('✅ BasicMathServer created successfully');
  return server;
}

/**
 * Creates an admin MCP server with system tools
 */
async function createAdminServer () {
  console.log('Creating AdminServer...');

  const server = new McpServer({
    name: 'admin-server',
    version: '1.0.0'
  });

  // Add admin tools using the McpServer API
  server.tool('system_info', 'Get system information', {}, () => ({
    content: [
      {
        type: 'text',
        text: `System Info:\n- OS: ${process.platform}\n- Node: ${process.version}\n- Uptime: ${Math.floor(process.uptime())}s\n- Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
      }
    ]
  }));

  server.tool('memory_usage', 'Get memory usage information', {}, () => {
    const usage = process.memoryUsage();
    return {
      content: [
        {
          type: 'text',
          text: `Memory Usage:\n- RSS: ${Math.round(usage.rss / 1024 / 1024)}MB\n- Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)}MB\n- Heap Total: ${Math.round(usage.heapTotal / 1024 / 1024)}MB\n- External: ${Math.round(usage.external / 1024 / 1024)}MB`
        }
      ]
    };
  });

  server.tool('restart_service', 'Restart a system service (simulation)', {
    service: { type: 'string', description: 'Service name to restart' }
  }, ({ service }) => ({
    content: [
      {
        type: 'text',
        text: `[SIMULATION] Restarted service: ${service}\nStatus: Service restarted successfully`
      }
    ]
  }));

  console.log('✅ AdminServer created successfully');
  return server;
}

/**
 * Creates a data analysis server
 */
async function createDataAnalysisServer () {
  console.log('Creating DataAnalysisServer...');

  const server = new McpServer({
    name: 'data-analysis-server',
    version: '1.0.0'
  });

  // Add data analysis tools using the McpServer API
  server.tool('calculate_mean', 'Calculate the arithmetic mean of a list of numbers', {
    numbers: { type: 'array', items: { type: 'number' }, description: 'Array of numbers' }
  }, ({ numbers }) => {
    if (!Array.isArray(numbers)) {
      throw new Error('numbers must be an array');
    }
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    return {
      content: [
        {
          type: 'text',
          text: `Statistical Analysis:\nMean of [${numbers.join(', ')}] = ${mean.toFixed(2)}\nCount: ${numbers.length} values`
        }
      ]
    };
  });

  server.tool('calculate_median', 'Calculate the median of a list of numbers', {
    numbers: { type: 'array', items: { type: 'number' }, description: 'Array of numbers' }
  }, ({ numbers }) => {
    if (!Array.isArray(numbers)) {
      throw new Error('numbers must be an array');
    }
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    return {
      content: [
        {
          type: 'text',
          text: `Statistical Analysis:\nMedian of [${numbers.join(', ')}] = ${median}\nSorted: [${sorted.join(', ')}]`
        }
      ]
    };
  });

  server.tool('find_outliers', 'Find outliers in a dataset using standard deviation', {
    numbers: { type: 'array', items: { type: 'number' }, description: 'Array of numbers' },
    threshold: { type: 'number', description: 'Standard deviation threshold (default: 2)', default: 2 }
  }, ({ numbers, threshold = 2 }) => {
    if (!Array.isArray(numbers)) {
      throw new Error('numbers must be an array');
    }
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    const outliers = numbers.filter((num) => Math.abs(num - mean) > threshold * stdDev);

    return {
      content: [
        {
          type: 'text',
          text: `Outlier Analysis:\nData: [${numbers.join(', ')}]\nMean: ${mean.toFixed(2)}, Std Dev: ${stdDev.toFixed(2)}\nThreshold: ${threshold} standard deviations\nOutliers: [${outliers.join(', ')}]`
        }
      ]
    };
  });

  console.log('✅ DataAnalysisServer created successfully');
  return server;
}

// Define tokens
const TOKENS = {
  'basic-user-token': 'Basic User (Math tools only)',
  'admin-token': 'Admin User (System tools)',
  'analyst-token': 'Data Analyst (Statistics tools)'
};

async function startServer () {
  console.log('🚀 Starting working per-bearer token MCP server...');

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
    'analyst-token': createDataAnalysisServer
  });

  console.log('🔧 Registering MCP plugin...');

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

  console.log('✅ MCP plugin registered successfully');

  // Add info endpoint
  app.get('/', async (request, reply) => {
    return {
      message: 'Working Per-Bearer Token MCP Server',
      status: 'running',
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
    app.log.info({ sessionId }, '✅ MCP session created');
  });

  sessionManager.on('sessionDestroyed', (sessionId) => {
    app.log.info({ sessionId }, '🗑️ MCP session destroyed');
  });

  sessionManager.on('transportError', (sessionId, error) => {
    app.log.error({ sessionId, error }, '❌ MCP transport error');
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

    console.log(`\n🚀 Working Per-Bearer Token MCP Server started at ${address}\n`);
    console.log('Available bearer tokens:');
    Object.entries(TOKENS).forEach(([token, description]) => {
      console.log(`  • ${token} - ${description}`);
    });
    console.log('\nServer is ready for MCP connections!');
    console.log('Use the MCP configuration provided to connect.\n');
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer().catch(console.error);
