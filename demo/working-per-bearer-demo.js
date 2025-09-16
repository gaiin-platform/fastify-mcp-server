#!/usr/bin/env node

/**
 * Per-Bearer Token MCP Server Demo
 * 
 * This demo shows how different bearer tokens can access completely
 * different MCP servers with their own tools and capabilities.
 * 
 * Usage: npm run demo:per-bearer
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import closeWithGrace from 'close-with-grace';
import Fastify from 'fastify';
import FastifyMcpStreamableHttp, { TokenBasedServerProvider } from '../dist/index.js';

// Create different servers for different token types
function createMathServer() {
  const server = new McpServer({ name: 'math-server', version: '1.0.0' });
  
  server.tool('add', 'Add two numbers', {
    a: { type: 'number' }, b: { type: 'number' }
  }, ({ a, b }) => ({
    content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }]
  }));
  
  server.tool('multiply', 'Multiply two numbers', {
    a: { type: 'number' }, b: { type: 'number' }
  }, ({ a, b }) => ({
    content: [{ type: 'text', text: `${a} × ${b} = ${a * b}` }]
  }));
  
  return server.server;
}

function createAnalyticsServer() {
  const server = new McpServer({ name: 'analytics-server', version: '1.0.0' });
  
  server.tool('get-metrics', 'Get system metrics', {}, () => ({
    content: [{ type: 'text', text: `📊 CPU: ${Math.floor(Math.random() * 100)}% | Memory: ${Math.floor(Math.random() * 8)}GB | Uptime: ${Math.floor(process.uptime())}s` }]
  }));
  
  server.tool('generate-report', 'Generate analytics report', {
    period: { type: 'string', description: 'Time period' }
  }, ({ period }) => ({
    content: [{ type: 'text', text: `📈 Analytics Report (${period}):\\nRevenue: $${Math.floor(Math.random() * 100000)}\\nUsers: ${Math.floor(Math.random() * 10000)}\\nGrowth: +${Math.floor(Math.random() * 50)}%` }]
  }));
  
  return server.server;
}

function createAdminServer() {
  const server = new McpServer({ name: 'admin-server', version: '1.0.0' });
  
  server.tool('system-status', 'Get system status', {}, () => ({
    content: [{ type: 'text', text: `🖥️  System Status: Online\\nMemory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\\nUptime: ${Math.floor(process.uptime())}s` }]
  }));
  
  server.tool('manage-users', 'User management', {
    action: { type: 'string', description: 'Action to perform' }
  }, ({ action }) => ({
    content: [{ type: 'text', text: `👥 Admin Action: ${action} executed successfully` }]
  }));
  
  return server.server;
}

async function main() {
  console.log('🚀 Starting Per-Bearer Token MCP Demo');
  console.log('=====================================');
  
  // Create the token provider with different servers for different tokens
  const tokenProvider = new TokenBasedServerProvider({
    'math-token': createMathServer,
    'analytics-token': createAnalyticsServer,
    'admin-token': createAdminServer
  });
  
  // Create Fastify app
  const app = Fastify({ logger: false });
  
  // Register the MCP plugin with per-bearer token support
  await app.register(FastifyMcpStreamableHttp, {
    endpoint: '/mcp',
    authorization: {
      bearerTokenProvider: tokenProvider,
      bearerMiddlewareOptions: {
        verifier: tokenProvider
      }
    }
  });
  
  // Start server
  const address = await app.listen({ host: '127.0.0.1', port: 9081 });
  console.log(`✅ Server running at ${address}/mcp`);
  
  console.log('\\n🔑 Available Tokens:');
  console.log('• math-token        → Math operations (add, multiply)');
  console.log('• analytics-token   → Analytics & reporting tools');
  console.log('• admin-token       → Administrative tools');
  
  console.log('\\n📋 MCP Client Configuration:');
  console.log(JSON.stringify({
    mcpServers: {
      "math-tools": {
        type: "http",
        url: `${address}/mcp`,
        headers: { Authorization: "Bearer math-token" }
      },
      "analytics-tools": {
        type: "http", 
        url: `${address}/mcp`,
        headers: { Authorization: "Bearer analytics-token" }
      },
      "admin-tools": {
        type: "http",
        url: `${address}/mcp`, 
        headers: { Authorization: "Bearer admin-token" }
      }
    }
  }, null, 2));
  
  console.log('\\n💡 Each token accesses completely different tools!');
  console.log('🔍 Test with: npx @modelcontextprotocol/inspector');
  console.log('⏹️  Press Ctrl+C to stop');
  
  // Graceful shutdown
  closeWithGrace(async () => {
    console.log('\\n🛑 Shutting down...');
    await app.close();
  });
}

main().catch(console.error);