/**
 * Examples demonstrating the simple PerBearerMcpServer interface
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createPerBearerMcpServer } from '../src/per-bearer-mcp-server.ts';

// ============================================================================
// EXAMPLE 1: Basic Usage - Quick Start
// ============================================================================

async function basicExample () {
  // Create and configure server
  const server = createPerBearerMcpServer({
    port: 0, // Dynamic port
    logging: true
  });

  // Add tokens with their server factories
  server
    .addToken('math-token', () => {
      const mcpServer = new McpServer({ name: 'math-server', version: '1.0.0' });
      mcpServer.tool('add', 'Add numbers', {
        a: { type: 'number' }, b: { type: 'number' }
      }, ({ a, b }) => ({ content: [{ type: 'text', text: `${a + b}` }] }));
      return mcpServer.server;
    })
    .addToken('time-token', () => {
      const mcpServer = new McpServer({ name: 'time-server', version: '1.0.0' });
      mcpServer.tool('now', 'Get current time', {}, () => ({
        content: [{ type: 'text', text: new Date().toISOString() }]
      }));
      return mcpServer.server;
    });

  // Listen for events - both token and server events
  server.on('started', (info) => {
    console.log(`🚀 Server started at ${info.url}`);
    console.log(`📱 Use these bearer tokens: ${server.getTokens().join(', ')}`);
  });

  server.on('sessionCreated', (session) => {
    console.log(`👤 New session: ${session.sessionId} (token: ${session.token})`);
  });

  // Server lifecycle events (NEW!)
  server.on('serverRegistered', (info) => {
    console.log(`📦 Server registered: ${info.serverName} v${info.serverVersion} for token '${info.token}'`);
  });

  server.on('serverRemoved', (info) => {
    console.log(`🗑️ Server removed: ${info.serverName} for token '${info.token}' (had ${info.hadActiveSessions ? 'active' : 'no'} sessions)`);
  });

  server.on('serverUpdated', (info) => {
    console.log(`🔄 Server updated: ${info.oldServerName} → ${info.newServerName} for token '${info.token}'`);
  });

  // Start server
  const info = await server.start();
  console.log(`Dynamic port assigned: ${info.port}`);

  return server;
}

// ============================================================================
// EXAMPLE 2: SaaS Application Pattern
// ============================================================================

class CustomerMcpService {
  private server = createPerBearerMcpServer({ port: 9090 });
  private customers = new Map<string, { name: string; plan: string }>();

  constructor () {
    this.setupEventHandlers();
  }

  async start () {
    const info = await this.server.start();
    console.log(`Customer MCP service running on ${info.url}`);
    return info;
  }

  async stop () {
    await this.server.stop();
  }

  // Add a new customer with their API token
  async addCustomer (customerId: string, customerName: string, plan: 'basic' | 'premium') {
    this.customers.set(customerId, { name: customerName, plan });

    const apiToken = `customer-${customerId}-token`;
    const serverFactory = () => this.createCustomerServer(customerName, plan);

    this.server.addToken(apiToken, serverFactory);

    console.log(`✅ Added customer: ${customerName} (${plan} plan)`);
    return { apiToken, plan };
  }

  // Remove customer access
  removeCustomer (customerId: string) {
    const apiToken = `customer-${customerId}-token`;
    this.server.removeToken(apiToken);
    this.customers.delete(customerId);
    console.log(`❌ Removed customer: ${customerId}`);
  }

  // Upgrade customer plan
  upgradeCustomer (customerId: string, newPlan: 'basic' | 'premium') {
    const customer = this.customers.get(customerId);
    if (!customer) throw new Error('Customer not found');

    customer.plan = newPlan;
    const apiToken = `customer-${customerId}-token`;
    const serverFactory = () => this.createCustomerServer(customer.name, newPlan);

    this.server.updateToken(apiToken, serverFactory);
    console.log(`⬆️ Upgraded ${customer.name} to ${newPlan} plan`);
  }

  private createCustomerServer (customerName: string, plan: string) {
    const server = new McpServer({
      name: `${customerName}-server`,
      version: '1.0.0'
    });

    // Basic tools for all plans
    server.tool('hello', 'Greet customer', {}, () => ({
      content: [{ type: 'text', text: `Hello ${customerName}!` }]
    }));

    server.tool('plan_info', 'Get plan information', {}, () => ({
      content: [{ type: 'text', text: `You are on the ${plan} plan` }]
    }));

    // Premium features
    if (plan === 'premium') {
      server.tool('analytics', 'Get analytics data', {}, () => ({
        content: [{ type: 'text', text: 'Advanced analytics data...' }]
      }));

      server.tool('export_data', 'Export customer data', {}, () => ({
        content: [{ type: 'text', text: 'Exporting your data...' }]
      }));
    }

    return server;
  }

  private setupEventHandlers () {
    this.server.on('sessionCreated', (session) => {
      console.log(`📊 Session created for token: ${session.token}`);
    });

    this.server.on('toolCalled', (call) => {
      console.log(`🔧 Tool called: ${call.toolName} by ${call.token}`);
    });

    this.server.on('tokenAdded', (token) => {
      console.log(`🎫 Token added: ${token}`);
    });
  }

  getStats () {
    return {
      server: this.server.getStats(),
      customers: this.customers.size,
      isRunning: this.server.isRunning()
    };
  }
}

// ============================================================================
// EXAMPLE 3: Development/Testing Pattern
// ============================================================================

async function developmentExample () {
  const server = createPerBearerMcpServer();

  // Add some test tokens
  server
    .addToken('dev-token', () => createDevServer())
    .addToken('test-token', () => createTestServer())
    .addToken('debug-token', () => createDebugServer());

  // Comprehensive event logging for development
  server.on('started', (info) => console.log('🟢 Started:', info));
  server.on('stopped', () => console.log('🔴 Stopped'));
  server.on('sessionCreated', (s) => console.log('👋 Session:', s.sessionId));
  server.on('sessionDestroyed', (s) => console.log('👋 Session ended:', s.sessionId));
  server.on('tokenAdded', (token) => console.log('➕ Token added:', token));
  server.on('tokenRemoved', (token) => console.log('➖ Token removed:', token));
  server.on('transportError', (sessionId, error) => console.error('❌ Transport error:', sessionId, error.message));

  const info = await server.start();

  // Simulate dynamic token management during development
  setTimeout(() => {
    console.log('\n🔄 Adding experimental token...');
    server.addToken('experimental-token', () => createExperimentalServer());
  }, 2000);

  setTimeout(() => {
    console.log('🔄 Removing test token...');
    server.removeToken('test-token');
  }, 4000);

  return server;
}

// Helper server factories
function createDevServer () {
  const server = new McpServer({ name: 'dev-server', version: '1.0.0' });
  server.tool('dev_info', 'Development info', {}, () => ({
    content: [{ type: 'text', text: 'Development environment active' }]
  }));
  return server;
}

function createTestServer () {
  const server = new McpServer({ name: 'test-server', version: '1.0.0' });
  server.tool('run_test', 'Run tests', {}, () => ({
    content: [{ type: 'text', text: 'All tests passed ✅' }]
  }));
  return server;
}

function createDebugServer () {
  const server = new McpServer({ name: 'debug-server', version: '1.0.0' });
  server.tool('debug_info', 'Debug information', {}, () => ({
    content: [{ type: 'text', text: `Debug: ${JSON.stringify(process.memoryUsage())}` }]
  }));
  return server;
}

function createExperimentalServer () {
  const server = new McpServer({ name: 'experimental-server', version: '0.1.0' });
  server.tool('experiment', 'Experimental feature', {}, () => ({
    content: [{ type: 'text', text: '🧪 Experimental feature activated!' }]
  }));
  return server;
}

// ============================================================================
// EXAMPLE 4: Usage Patterns Summary
// ============================================================================

export const usageExamples = {
  // Quick start for simple use cases
  quickStart: basicExample,

  // SaaS application with customer management
  saasPattern: () => new CustomerMcpService(),

  // Development and testing
  devPattern: developmentExample,

  // One-liner for basic servers
  oneLiner: () => createPerBearerMcpServer({ port: 9000 })
    .addToken('simple', () => new McpServer({ name: 'simple', version: '1.0.0' })),

  // Production-ready with error handling
  production: async () => {
    const server = createPerBearerMcpServer({
      port: process.env.PORT ? parseInt(process.env.PORT) : 0,
      logging: process.env.NODE_ENV !== 'production'
    });

    // Add production tokens from environment or database
    const tokens = await loadTokensFromDatabase();
    tokens.forEach(({ token, serverFactory }) => {
      server.addToken(token, serverFactory);
    });

    // Production error handling
    server.on('transportError', (sessionId, error) => {
      logger.error('MCP transport error', { sessionId, error });
    });

    return server;
  }
};

// Mock function for production example
async function loadTokensFromDatabase () {
  return [
    { token: 'prod-token-1', serverFactory: () => createDevServer() },
    { token: 'prod-token-2', serverFactory: () => createTestServer() }
  ];
}

declare const logger: { error: (msg: string, meta: any) => void };

export default usageExamples;
