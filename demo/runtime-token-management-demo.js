#!/usr/bin/env node

/**
 * Demo showing runtime token management capabilities
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import closeWithGrace from 'close-with-grace';
import Fastify from 'fastify';

// Import the built version
import FastifyMcpStreamableHttp, { TokenBasedServerProvider, getMcpDecorator } from '../dist/index.js';

// Server factory functions
async function createMathServer () {
  const server = new McpServer({ name: 'math-server', version: '1.0.0' });
  server.tool('add', 'Add two numbers', {
    a: { type: 'number' }, b: { type: 'number' }
  }, ({ a, b }) => ({ content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }] }));
  return server;
}

async function createTimeServer () {
  const server = new McpServer({ name: 'time-server', version: '1.0.0' });
  server.tool('current_time', 'Get current time', {}, () => ({
    content: [{ type: 'text', text: `Current time: ${new Date().toISOString()}` }]
  }));
  return server;
}

async function createGreetingServer () {
  const server = new McpServer({ name: 'greeting-server', version: '1.0.0' });
  server.tool('greet', 'Say hello', {
    name: { type: 'string' }
  }, ({ name }) => ({ content: [{ type: 'text', text: `Hello, ${name}!` }] }));
  return server;
}

async function createRandomServer () {
  const server = new McpServer({ name: 'random-server', version: '1.0.0' });
  server.tool('random_number', 'Generate random number', {
    min: { type: 'number', default: 0 }, max: { type: 'number', default: 100 }
  }, ({ min = 0, max = 100 }) => ({
    content: [{ type: 'text', text: `Random: ${Math.floor(Math.random() * (max - min + 1)) + min}` }]
  }));
  return server;
}

async function startServer () {
  console.log('🚀 Starting Runtime Token Management Demo...');

  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
      }
    }
  });

  // Create provider with initial tokens
  const bearerTokenProvider = new TokenBasedServerProvider({
    'math-token': createMathServer,
    'time-token': createTimeServer
  });

  console.log('📊 Initial tokens:', bearerTokenProvider.getRegisteredTokens());

  // Register MCP plugin
  await app.register(FastifyMcpStreamableHttp, {
    endpoint: '/mcp',
    authorization: {
      bearerTokenProvider,
      bearerMiddlewareOptions: { verifier: bearerTokenProvider }
    }
  });

  // API endpoints for runtime token management
  app.get('/tokens', async () => {
    return {
      message: 'Current token status',
      stats: bearerTokenProvider.getStats(),
      available_factories: [
        'math',
        'time',
        'greeting',
        'random'
      ]
    };
  });

  app.post('/tokens/:token', async (request, reply) => {
    const { token } = request.params;
    const { factory } = request.body || {};

    const factories = {
      math: createMathServer,
      time: createTimeServer,
      greeting: createGreetingServer,
      random: createRandomServer
    };

    if (!factories[factory]) {
      return reply.code(400).send({
        error: 'Invalid factory',
        available: Object.keys(factories)
      });
    }

    bearerTokenProvider.addToken(token, factories[factory]);

    return {
      message: `Token '${token}' added with '${factory}' server factory`,
      stats: bearerTokenProvider.getStats()
    };
  });

  app.put('/tokens/:token', async (request, reply) => {
    const { token } = request.params;
    const { factory } = request.body || {};

    const factories = {
      math: createMathServer,
      time: createTimeServer,
      greeting: createGreetingServer,
      random: createRandomServer
    };

    if (!factories[factory]) {
      return reply.code(400).send({
        error: 'Invalid factory',
        available: Object.keys(factories)
      });
    }

    const updated = bearerTokenProvider.updateToken(token, factories[factory]);

    if (!updated) {
      return reply.code(404).send({ error: `Token '${token}' not found` });
    }

    return {
      message: `Token '${token}' updated with '${factory}' server factory`,
      stats: bearerTokenProvider.getStats()
    };
  });

  app.delete('/tokens/:token', async (request, reply) => {
    const { token } = request.params;

    const removed = bearerTokenProvider.removeToken(token);

    if (!removed) {
      return reply.code(404).send({ error: `Token '${token}' not found` });
    }

    return {
      message: `Token '${token}' removed`,
      stats: bearerTokenProvider.getStats()
    };
  });

  app.delete('/tokens', async () => {
    bearerTokenProvider.clearAllTokens();
    return {
      message: 'All tokens cleared',
      stats: bearerTokenProvider.getStats()
    };
  });

  // Info endpoint
  app.get('/', async () => ({
    message: 'Runtime Token Management Demo',
    endpoints: {
      mcp: '/mcp',
      tokens: '/tokens (GET, DELETE)',
      add_token: '/tokens/:token (POST with {factory: "math|time|greeting|random"})',
      update_token: '/tokens/:token (PUT with {factory: "math|time|greeting|random"})',
      remove_token: '/tokens/:token (DELETE)'
    },
    usage: {
      note: 'Add/remove/update tokens at runtime, then test with MCP requests',
      example_add: 'POST /tokens/my-new-token {"factory": "greeting"}',
      example_test: 'Use "Authorization: Bearer my-new-token" in MCP requests'
    }
  }));

  // Setup session event handlers
  const sessionManager = getMcpDecorator(app).getSessionManager();
  sessionManager.on('sessionCreated', (sessionId) => {
    console.log(`✅ Session created: ${sessionId}`);
  });

  // Graceful shutdown
  closeWithGrace(async ({ signal, err }) => {
    if (err) {
      console.error('❌ Server closing with error:', err);
    } else {
      console.log(`📡 ${signal} received, server closing`);
    }
    await getMcpDecorator(app).shutdown();
    await app.close();
  });

  await app.ready();

  try {
    const address = await app.listen({ host: '127.0.0.1', port: 9082 });

    console.log(`\n🌟 Runtime Token Management Demo at ${address}\n`);
    console.log('📋 Management endpoints:');
    console.log('  GET /tokens - View current tokens');
    console.log('  POST /tokens/:token - Add new token');
    console.log('  PUT /tokens/:token - Update existing token');
    console.log('  DELETE /tokens/:token - Remove token');
    console.log('  DELETE /tokens - Clear all tokens');

    console.log('\n🔧 Examples:');
    console.log('  curl -X POST http://127.0.0.1:9082/tokens/greeting-token -H "Content-Type: application/json" -d \'{"factory": "greeting"}\'');
    console.log('  curl -H "Authorization: Bearer greeting-token" ... http://127.0.0.1:9082/mcp');
    console.log('  curl -X DELETE http://127.0.0.1:9082/tokens/greeting-token');

    console.log('\n🎯 Try these operations:');
    console.log('  1. View tokens: curl http://127.0.0.1:9082/tokens');
    console.log('  2. Add a token: curl -X POST http://127.0.0.1:9082/tokens/new-token -H "Content-Type: application/json" -d \'{"factory": "random"}\'');
    console.log('  3. Test the token with MCP');
    console.log('  4. Remove the token: curl -X DELETE http://127.0.0.1:9082/tokens/new-token');
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer().catch(console.error);
