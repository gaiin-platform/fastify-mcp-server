/**
 * Comprehensive Per-Bearer Token MCP Server Example
 * 
 * This example demonstrates all aspects of the per-bearer token functionality:
 * - Simple multi-tenant server setup
 * - Runtime token management
 * - Comprehensive event monitoring
 * - Production-ready patterns
 */

import { createPerBearerMcpServer } from '../src/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Different server factories for different user types
function createMathServer(userId: string) {
  const server = new McpServer({ 
    name: `math-tools-${userId}`, 
    version: '1.0.0' 
  });
  
  server.tool('add', 'Add two numbers', {
    a: { type: 'number', description: 'First number' },
    b: { type: 'number', description: 'Second number' }
  }, ({ a, b }) => ({
    content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }]
  }));
  
  server.tool('multiply', 'Multiply two numbers', {
    a: { type: 'number', description: 'First number' },
    b: { type: 'number', description: 'Second number' }
  }, ({ a, b }) => ({
    content: [{ type: 'text', text: `${a} × ${b} = ${a * b}` }]
  }));
  
  return server.server;
}

function createAnalyticsServer(companyName: string) {
  const server = new McpServer({ 
    name: `analytics-${companyName}`, 
    version: '2.0.0' 
  });
  
  server.tool('get-metrics', 'Get company metrics', {
    metric: { type: 'string', description: 'Metric name to retrieve' }
  }, ({ metric }) => ({
    content: [{ 
      type: 'text', 
      text: `${companyName} ${metric}: ${Math.floor(Math.random() * 1000)} (sample data)` 
    }]
  }));
  
  server.tool('generate-report', 'Generate analytics report', {
    timeframe: { type: 'string', description: 'Time period for report' }
  }, ({ timeframe }) => ({
    content: [{ 
      type: 'text', 
      text: `📊 Analytics Report for ${companyName}\nTimeframe: ${timeframe}\nGenerated at: ${new Date().toISOString()}` 
    }]
  }));
  
  return server.server;
}

function createAdminServer() {
  const server = new McpServer({ 
    name: 'admin-tools', 
    version: '3.0.0' 
  });
  
  server.tool('system-status', 'Get system status', {}, () => ({
    content: [{ 
      type: 'text', 
      text: `System Status: ✅ Online\nMemory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\nUptime: ${process.uptime()}s` 
    }]
  }));
  
  server.tool('manage-users', 'User management interface', {
    action: { type: 'string', description: 'Action to perform' }
  }, ({ action }) => ({
    content: [{ type: 'text', text: `Admin: Executed ${action} action` }]
  }));
  
  return server.server;
}

async function main() {
  console.log('🚀 Starting Comprehensive Per-Bearer Token MCP Server Demo');
  console.log('====================================================');
  
  // Create server with dynamic port assignment
  const server = createPerBearerMcpServer({
    port: 0, // Dynamic port
    logging: true
  });
  
  // Set up comprehensive event monitoring
  setupEventMonitoring(server);
  
  // Add initial tokens for different user types
  console.log('\n➕ Adding initial tokens...');
  
  server
    .addToken('math-user-alice', () => createMathServer('alice'))
    .addToken('math-user-bob', () => createMathServer('bob'))
    .addToken('analytics-acme', () => createAnalyticsServer('ACME Corp'))
    .addToken('analytics-startup', () => createAnalyticsServer('Startup Inc'))
    .addToken('admin-root', () => createAdminServer());
  
  // Start the server
  const { port, url } = await server.start();
  
  console.log(`\n✅ Server running at ${url}`);
  console.log(`📊 Initial stats:`, server.getStats());
  console.log(`🔑 Active tokens:`, server.getTokens().length);
  
  // Demonstrate runtime token management
  setTimeout(() => demonstrateRuntimeManagement(server), 3000);
  
  // Print client configuration examples
  setTimeout(() => printClientConfigurations(url), 5000);
  
  console.log('\n💡 This server will run indefinitely. Press Ctrl+C to stop.');
  console.log('🔍 Monitor the console for real-time events and statistics.');
}

function setupEventMonitoring(server: any) {
  // Server lifecycle events
  server.on('started', (info: any) => {
    console.log(`🟢 Server started at ${info.url} (port ${info.port})`);
  });
  
  server.on('stopped', () => {
    console.log('🔴 Server stopped');
  });
  
  // Token management events
  server.on('tokenAdded', (token: string) => {
    console.log(`➕ Token added: ${token}`);
  });
  
  server.on('tokenRemoved', (token: string) => {
    console.log(`➖ Token removed: ${token}`);
  });
  
  server.on('tokenUpdated', (token: string) => {
    console.log(`🔄 Token updated: ${token}`);
  });
  
  // Server registration events
  server.on('serverRegistered', (info: any) => {
    console.log(`📦 Server registered: ${info.serverName} v${info.serverVersion} for ${info.token.substring(0, 12)}...`);
  });
  
  server.on('serverRemoved', (info: any) => {
    console.log(`🗑️  Server removed: ${info.serverName} (had active sessions: ${info.hadActiveSessions})`);
  });
  
  // Session events
  server.on('sessionCreated', (session: any) => {
    console.log(`👤 New session: ${session.sessionId.substring(0, 8)}... for token ${session.token.substring(0, 12)}...`);
  });
  
  server.on('toolCalled', (call: any) => {
    console.log(`🔧 Tool called: ${call.toolName} by ${call.token.substring(0, 12)}... (${call.duration}ms)`);
  });
  
  // Periodic statistics
  setInterval(() => {
    const stats = server.getStats();
    console.log(`📊 Stats: ${stats.registeredTokens} tokens, ${stats.activeServers} servers, ${stats.activeSessions} sessions (uptime: ${Math.round(stats.uptime)}s)`);
  }, 30000);
}

function demonstrateRuntimeManagement(server: any) {
  console.log('\n🔄 Demonstrating runtime token management...');
  
  // Add a new customer
  console.log('➕ Adding new enterprise customer...');
  server.addToken('enterprise-bigcorp', () => {
    const mcp = new McpServer({ name: 'enterprise-bigcorp-tools', version: '1.0.0' });
    mcp.tool('enterprise-dashboard', 'Access enterprise dashboard', {}, () => ({
      content: [{ type: 'text', text: '🏢 Enterprise Dashboard: BigCorp Analytics & Controls' }]
    }));
    return mcp.server;
  });
  
  // Update an existing token (plan upgrade simulation)
  setTimeout(() => {
    console.log('🔄 Upgrading startup to premium analytics...');
    server.updateToken('analytics-startup', () => {
      const mcp = new McpServer({ name: 'premium-analytics-startup', version: '2.1.0' });
      mcp.tool('advanced-analytics', 'Premium analytics tools', {}, () => ({
        content: [{ type: 'text', text: '💎 Premium Analytics: Advanced insights for Startup Inc' }]
      }));
      mcp.tool('predictive-modeling', 'AI-powered predictions', {}, () => ({
        content: [{ type: 'text', text: '🤖 Predictive Model Results: Growth forecast +127%' }]
      }));
      return mcp.server;
    });
  }, 2000);
  
  // Remove a token (customer churn simulation)  
  setTimeout(() => {
    console.log('➖ Removing churned customer...');
    server.removeToken('math-user-bob');
  }, 4000);
  
  // Add temporary trial tokens
  setTimeout(() => {
    console.log('🎯 Adding trial customers (auto-expire in 15s)...');
    const trialTokens = ['trial-customer-1', 'trial-customer-2'];
    
    trialTokens.forEach((token, index) => {
      server.addToken(token, () => {
        const mcp = new McpServer({ name: `trial-${index + 1}`, version: '0.9.0' });
        mcp.tool('trial-feature', 'Trial feature access', {}, () => ({
          content: [{ type: 'text', text: `🎁 Trial Feature: Welcome ${token}! Upgrade for full access.` }]
        }));
        return mcp.server;
      });
      
      // Auto-expire trial after 15 seconds
      setTimeout(() => {
        console.log(`⏰ Trial expired: ${token}`);
        server.removeToken(token);
      }, 15000 + (index * 1000));
    });
  }, 6000);
}

function printClientConfigurations(serverUrl: string) {
  console.log('\\n📋 MCP Client Configuration Examples');
  console.log('=====================================');
  
  console.log('\\n🔧 VS Code/Claude Desktop Configuration:');
  console.log(JSON.stringify({
    mcpServers: {
      "math-tools": {
        type: "http",
        url: serverUrl,
        headers: {
          Authorization: "Bearer math-user-alice"
        }
      },
      "acme-analytics": {
        type: "http", 
        url: serverUrl,
        headers: {
          Authorization: "Bearer analytics-acme"
        }
      },
      "admin-tools": {
        type: "http",
        url: serverUrl,
        headers: {
          Authorization: "Bearer admin-root"
        }
      }
    }
  }, null, 2));
  
  console.log('\\n🌐 cURL Examples:');
  console.log('\\nDiscovery (math tools):');
  console.log(`curl -X POST ${serverUrl} \\`);
  console.log(`  -H "Authorization: Bearer math-user-alice" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`);
  
  console.log('\\nDiscovery (analytics tools):');
  console.log(`curl -X POST ${serverUrl} \\`);
  console.log(`  -H "Authorization: Bearer analytics-acme" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Graceful shutdown initiated...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Graceful shutdown initiated...');
  process.exit(0);
});

// Start the demo
main().catch(console.error);