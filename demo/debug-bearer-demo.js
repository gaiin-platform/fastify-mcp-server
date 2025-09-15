#!/usr/bin/env node

/**
 * Debug version with extensive logging
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import closeWithGrace from 'close-with-grace';
import Fastify from 'fastify';
import { z } from 'zod';

// Import the built version
import FastifyMcpStreamableHttp, { TokenBasedServerProvider, getMcpDecorator } from '../dist/index.js';

// Debug TokenBasedServerProvider with logging
class DebugTokenBasedServerProvider {
  constructor (tokenMappings) {
    console.log('🔧 Creating TokenBasedServerProvider with tokens:', Object.keys(tokenMappings));
    this.tokenToServerFactory = new Map(Object.entries(tokenMappings));
    console.log('🔧 Token map created with keys:', Array.from(this.tokenToServerFactory.keys()));
  }

  async verifyAccessToken (token) {
    console.log('🔍 verifyAccessToken called with token:', token);
    console.log('🔍 Available tokens in map:', Array.from(this.tokenToServerFactory.keys()));

    if (!this.tokenToServerFactory.has(token)) {
      console.error('❌ Token not found in map:', token);
      throw new Error('Invalid token');
    }

    console.log('✅ Token verified:', token);
    return {
      token,
      clientId: `client-${token}`,
      scopes: []
    };
  }

  async createServerForToken (token, authInfo) {
    console.log('🏗️ createServerForToken called with token:', token);
    const factory = this.tokenToServerFactory.get(token);
    if (!factory) {
      console.error('❌ No server factory found for token:', token);
      throw new Error('No server factory found for token');
    }

    console.log('✅ Creating server for token:', token);
    const server = await factory();
    console.log('✅ Server created successfully for token:', token);
    return server;
  }
}

async function createBasicMathServer () {
  console.log('📊 Creating BasicMathServer');
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

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
      case 'add': {
        const { a, b } = args;
        return { content: [{ type: 'text', text: `Result: ${a + b}` }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

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
        }
      ]
    };
  });

  console.log('✅ BasicMathServer created');
  return server;
}

async function startServer () {
  console.log('🚀 Starting debug server...');

  const app = Fastify({
    logger: {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    }
  });

  // Add middleware to log all requests
  app.addHook('onRequest', async (request, reply) => {
    console.log('📥 Incoming request:', {
      method: request.method,
      url: request.url,
      headers: {
        authorization: request.headers.authorization,
        'content-type': request.headers['content-type']
      }
    });
  });

  // Create the debug token provider
  const bearerTokenProvider = new DebugTokenBasedServerProvider({
    'basic-user-token': createBasicMathServer,
    'test-token': createBasicMathServer  // Add a simple test token
  });

  console.log('🔧 Registering MCP plugin...');

  try {
    await app.register(FastifyMcpStreamableHttp, {
      endpoint: '/mcp',
      authorization: {
        bearerTokenProvider,
        bearerMiddlewareOptions: {
          verifier: bearerTokenProvider  // Use the same provider for verification
        }
      }
    });
    console.log('✅ MCP plugin registered successfully');
  } catch (error) {
    console.error('❌ Error registering MCP plugin:', error);
    process.exit(1);
  }

  // Add info endpoint
  app.get('/', async (request, reply) => {
    return {
      message: 'Debug Per-Bearer Token MCP Server',
      tokens: {
        'basic-user-token': 'Math tools',
        'test-token': 'Math tools (simple test)'
      },
      endpoints: {
        mcp: '/mcp',
        info: '/'
      }
    };
  });

  // Setup session event handlers
  const sessionManager = getMcpDecorator(app).getSessionManager();

  sessionManager.on('sessionCreated', (sessionId) => {
    console.log('✅ Session created:', sessionId);
  });

  sessionManager.on('sessionDestroyed', (sessionId) => {
    console.log('🗑️ Session destroyed:', sessionId);
  });

  sessionManager.on('transportError', (sessionId, error) => {
    console.error('❌ Transport error for session', sessionId, ':', error);
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
    const address = await app.listen({
      host: '127.0.0.1',
      port: 9084
    });

    console.log(`\n🚀 Debug server running at ${address}\n`);
    console.log('Available test commands:');
    console.log('curl -H "Authorization: Bearer basic-user-token" -H "Content-Type: application/json" \\');
    console.log('  -d \'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\' \\');
    console.log('  http://127.0.0.1:9084/mcp');
    console.log('');
    console.log('curl -H "Authorization: Bearer test-token" -H "Content-Type: application/json" \\');
    console.log('  -d \'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\' \\');
    console.log('  http://127.0.0.1:9084/mcp');
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer().catch(console.error);
