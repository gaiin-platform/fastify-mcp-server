#!/usr/bin/env node

/**
 * Simple Per-Bearer Token Server Demo
 * 
 * Shows the easiest way to create a multi-tenant MCP server
 * using the createPerBearerMcpServer interface.
 * 
 * Usage: node demo/simple-server-demo.js
 */

import { createPerBearerMcpServer } from '../dist/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Create simple server factories
const createMathTools = () => {
  const server = new McpServer({ name: 'math-tools', version: '1.0.0' });
  
  server.tool('add', 'Add numbers', {
    a: { type: 'number' }, 
    b: { type: 'number' }
  }, ({ a, b }) => ({
    content: [{ type: 'text', text: `${a + b}` }]
  }));
  
  return server.server;
};

const createTimeTools = () => {
  const server = new McpServer({ name: 'time-tools', version: '1.0.0' });
  
  server.tool('now', 'Get current time', {}, () => ({
    content: [{ type: 'text', text: new Date().toISOString() }]
  }));
  
  server.tool('timestamp', 'Get Unix timestamp', {}, () => ({
    content: [{ type: 'text', text: Date.now().toString() }]
  }));
  
  return server.server;
};

async function main() {
  console.log('🚀 Simple Per-Bearer Token MCP Server');
  
  // Create server with automatic port assignment
  const server = createPerBearerMcpServer({ port: 0 })
    .addToken('math-user', createMathTools)
    .addToken('time-user', createTimeTools);
  
  // Start server
  const { url, port } = await server.start();
  
  console.log(`✅ Server running on port ${port}`);
  console.log(`🌐 URL: ${url}`);
  console.log('\\n🔑 Test tokens:');
  console.log('• math-user → Math operations');  
  console.log('• time-user → Time functions');
  
  console.log('\\n📋 Client config:');
  console.log(`{
  "mcpServers": {
    "math": {
      "type": "http",
      "url": "${url}",
      "headers": { "Authorization": "Bearer math-user" }
    },
    "time": {
      "type": "http",
      "url": "${url}", 
      "headers": { "Authorization": "Bearer time-user" }
    }
  }
}`);
  
  console.log('\\n⏹️  Press Ctrl+C to stop');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\n🛑 Stopping...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);