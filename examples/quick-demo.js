#!/usr/bin/env node

/**
 * Quick demo of the simple PerBearerMcpServer interface
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import the current working system
import { TokenBasedServerProvider } from '../dist/index.js';

// This would be the interface (for demo purposes, using the working version)
// import { createPerBearerMcpServer } from '../src/per-bearer-mcp-server.js';

// For now, let's show what the interface would look like
console.log(`
🎯 PerBearerMcpServer - Simple Interface Design

Here's what the developer experience would look like:

// ============================================================================
// BASIC USAGE - Super Simple
// ============================================================================

import { createPerBearerMcpServer } from 'per-bearer-mcp-server';

const server = createPerBearerMcpServer({
  port: 0, // Dynamic port
  logging: true
});

// Add tokens - fluent interface
server
  .addToken('math-token', () => {
    const mcpServer = new McpServer({ name: 'math', version: '1.0.0' });
    mcpServer.tool('add', 'Add numbers', 
      { a: { type: 'number' }, b: { type: 'number' } }, 
      ({ a, b }) => ({ content: [{ type: 'text', text: \`\${a + b}\` }] })
    );
    return mcpServer;
  })
  .addToken('time-token', () => {
    const mcpServer = new McpServer({ name: 'time', version: '1.0.0' });
    mcpServer.tool('now', 'Current time', {}, 
      () => ({ content: [{ type: 'text', text: new Date().toISOString() }] })
    );
    return mcpServer;
  });

// Event handling
server.on('started', (info) => {
  console.log(\`🚀 Server at \${info.url} (port: \${info.port})\`);
});

server.on('sessionCreated', (session) => {
  console.log(\`👤 Session: \${session.sessionId} using \${session.token}\`);
});

// Start server - returns actual port
const info = await server.start();
console.log(\`Started on dynamic port: \${info.port}\`);

// Runtime token management
server.addToken('new-token', () => createNewServer());
server.removeToken('old-token');
server.updateToken('existing-token', () => createUpdatedServer());

// Check status
console.log('Tokens:', server.getTokens());
console.log('Stats:', server.getStats());
console.log('Running:', server.isRunning());

// Stop when done
await server.stop();

// ============================================================================
// SAAS PATTERN - Customer Management
// ============================================================================

class CustomerMcpService {
  private server = createPerBearerMcpServer({ port: 9090 });

  async addCustomer(customerId, name, plan) {
    const token = \`customer-\${customerId}-token\`;
    this.server.addToken(token, () => this.createCustomerServer(name, plan));
    return { token, plan };
  }

  removeCustomer(customerId) {
    this.server.removeToken(\`customer-\${customerId}-token\`);
  }

  upgradeCustomer(customerId, newPlan) {
    const token = \`customer-\${customerId}-token\`;
    this.server.updateToken(token, () => this.createCustomerServer(name, newPlan));
  }

  private createCustomerServer(name, plan) {
    const server = new McpServer({ name: \`\${name}-server\`, version: '1.0.0' });
    
    // Basic tools for everyone
    server.tool('hello', 'Greet', {}, () => ({ 
      content: [{ type: 'text', text: \`Hello \${name}!\` }] 
    }));
    
    // Premium features
    if (plan === 'premium') {
      server.tool('analytics', 'Analytics', {}, () => ({ 
        content: [{ type: 'text', text: 'Premium analytics...' }] 
      }));
    }
    
    return server;
  }
}

// ============================================================================
// ONE-LINER USAGE
// ============================================================================

// Quick server for testing
const quickServer = createPerBearerMcpServer()
  .addToken('test', () => new McpServer({ name: 'test', version: '1.0.0' }));

const { port } = await quickServer.start();
console.log(\`Test server on port \${port}\`);

// ============================================================================
// CONFIGURATION OPTIONS
// ============================================================================

const configuredServer = createPerBearerMcpServer({
  port: 8080,        // Specific port (0 = dynamic)
  host: '0.0.0.0',   // Bind to all interfaces
  endpoint: '/api',  // Custom MCP endpoint
  logging: true,     // Enable request logging
  oauth2: {          // Optional OAuth2 config
    issuer: 'https://auth.example.com',
    authorizationEndpoint: 'https://auth.example.com/authorize',
    tokenEndpoint: 'https://auth.example.com/token',
    registrationEndpoint: 'https://auth.example.com/register'
  }
});

// ============================================================================
// EVENT HANDLING
// ============================================================================

server.on('started', (info) => console.log('🟢 Started:', info.url));
server.on('stopped', () => console.log('🔴 Stopped'));
server.on('sessionCreated', (session) => console.log('👋 Session:', session));
server.on('sessionDestroyed', (session) => console.log('💀 Session ended:', session));
server.on('toolCalled', (call) => console.log('🔧 Tool:', call.toolName));
server.on('tokenAdded', (token) => console.log('➕ Token added:', token));
server.on('tokenRemoved', (token) => console.log('➖ Token removed:', token));
server.on('tokenUpdated', (token) => console.log('🔄 Token updated:', token));
server.on('transportError', (sessionId, error) => console.error('❌ Error:', error));

// ============================================================================
// UTILITY METHODS
// ============================================================================

// Check what's happening
server.getTokens()           // ['token1', 'token2', ...]
server.hasToken('my-token')  // true/false
server.getStats()           // { registeredTokens: 3, activeServers: 2, ... }
server.getServerInfo()      // { url: 'http://127.0.0.1:9090', port: 9090, ... }
server.isRunning()          // true/false
server.getActiveSessions()  // [{ sessionId: '...', token: '...', ... }]

`);

console.log(`
🎯 KEY BENEFITS:

✅ SIMPLE: One class, fluent interface, minimal setup
✅ DYNAMIC PORTS: Use 0 for automatic port assignment  
✅ RUNTIME MANAGEMENT: Add/remove/update tokens while running
✅ EVENT DRIVEN: Rich events for monitoring and logging
✅ FLEXIBLE: Works for development, testing, and production
✅ ZERO DOWNTIME: Token changes don't require restarts
✅ SAAS READY: Perfect for multi-tenant applications

🚀 DEVELOPER ERGONOMICS:

• Fluent interface with method chaining
• Rich TypeScript types for great IDE support
• Comprehensive event system for monitoring
• Simple configuration with sensible defaults
• Works with both specific and dynamic ports
• Easy error handling and graceful shutdown
• Production-ready with OAuth2 support

📦 USAGE PATTERNS:

• Quick prototyping: One-liner server creation
• Development: Rich logging and event monitoring
• Testing: Dynamic ports and easy cleanup
• SaaS applications: Customer management patterns
• Production: Environment-based configuration
`);

// For now, let's create a simple working demo using the existing system
console.log('\n🔧 Creating a working demo using current implementation...\n');

// Simple wrapper demo to show the concept
class SimpleDemo {
  constructor () {
    this.provider = new TokenBasedServerProvider();
    this.tokens = [];
  }

  addToken (token, factory) {
    this.provider.addToken(token, factory);
    this.tokens.push(token);
    console.log(`✅ Added token: ${token}`);
    return this;
  }

  removeToken (token) {
    const removed = this.provider.removeToken(token);
    if (removed) {
      this.tokens = this.tokens.filter((t) => t !== token);
      console.log(`❌ Removed token: ${token}`);
    }
    return this;
  }

  getTokens () {
    return [...this.tokens];
  }

  getStats () {
    return this.provider.getStats();
  }

  hasToken (token) {
    return this.provider.hasToken(token);
  }
}

// Demo the interface concept
const demo = new SimpleDemo();

demo
  .addToken('demo-token-1', async () => {
    const server = new McpServer({ name: 'demo1', version: '1.0.0' });
    return server;
  })
  .addToken('demo-token-2', async () => {
    const server = new McpServer({ name: 'demo2', version: '1.0.0' });
    return server;
  });

console.log('Current tokens:', demo.getTokens());
console.log('Has demo-token-1:', demo.hasToken('demo-token-1'));
console.log('Stats:', demo.getStats());

demo.removeToken('demo-token-1');
console.log('After removal:', demo.getTokens());

console.log(`
💡 This demonstrates the interface concept. The full implementation
   would wrap Fastify and provide the complete server lifecycle
   management with events, port handling, and MCP integration.
`);
