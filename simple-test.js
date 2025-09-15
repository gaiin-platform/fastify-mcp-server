#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import Fastify from 'fastify';

import FastifyMcpStreamableHttp, { TokenBasedServerProvider, getMcpDecorator } from './dist/index.js';

// Create a very simple server
async function createSimpleServer () {
  console.log('Creating simple server...');

  const server = new Server(
    { name: 'simple-test-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  // Add initialize handler
  server.setRequestHandler('initialize', async (request) => {
    console.log('Initialize request received:', request);
    return {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'simple-test-server', version: '1.0.0' }
    };
  });

  // Add tools/list handler
  server.setRequestHandler('tools/list', async () => {
    return { tools: [] };
  });

  console.log('Simple server created');
  return server;
}

async function main () {
  const app = Fastify({ logger: true });

  const bearerTokenProvider = new TokenBasedServerProvider({
    test: createSimpleServer
  });

  await app.register(FastifyMcpStreamableHttp, {
    endpoint: '/mcp',
    authorization: {
      bearerTokenProvider,
      bearerMiddlewareOptions: {
        verifier: bearerTokenProvider
      }
    }
  });

  const address = await app.listen({ host: '127.0.0.1', port: 9085 });
  console.log(`Simple test server at ${address}`);
  console.log('Test: curl -H "Authorization: Bearer test" -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\' http://127.0.0.1:9085/mcp');
}

main().catch(console.error);
