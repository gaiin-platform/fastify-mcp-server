/**
 * Comprehensive demo showing all server and token events
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createPerBearerMcpServer } from '../src/per-bearer-mcp-server.ts';

// ============================================================================
// COMPLETE EVENT MONITORING EXAMPLE
// ============================================================================

async function comprehensiveEventsDemo() {
  const server = createPerBearerMcpServer({
    port: 0, // Dynamic port
    logging: true
  });

  // ========================================================================
  // SERVER LIFECYCLE EVENTS
  // ========================================================================
  
  server.on('started', (info) => {
    console.log(`🟢 SERVER STARTED`);
    console.log(`   URL: ${info.url}`);
    console.log(`   Port: ${info.port} (${info.port === 0 ? 'dynamic' : 'fixed'})`);
    console.log(`   Host: ${info.host}`);
    console.log(`   Endpoint: ${info.endpoint}`);
  });

  server.on('stopped', () => {
    console.log(`🔴 SERVER STOPPED - All resources cleaned up`);
  });

  // ========================================================================
  // MCP SERVER REGISTRATION EVENTS (NEW!)
  // ========================================================================

  server.on('serverRegistered', (info) => {
    console.log(`📦 MCP SERVER REGISTERED`);
    console.log(`   Token: ${info.token}`);
    console.log(`   Server: ${info.serverName} v${info.serverVersion}`);
    console.log(`   Registered: ${info.registeredAt.toISOString()}`);
  });

  server.on('serverRemoved', (info) => {
    console.log(`🗑️  MCP SERVER REMOVED`);
    console.log(`   Token: ${info.token}`);
    console.log(`   Server: ${info.serverName}`);
    console.log(`   Had active sessions: ${info.hadActiveSessions ? 'YES' : 'NO'}`);
    console.log(`   Removed: ${info.removedAt.toISOString()}`);
  });

  server.on('serverUpdated', (info) => {
    console.log(`🔄 MCP SERVER UPDATED`);
    console.log(`   Token: ${info.token}`);
    console.log(`   Old server: ${info.oldServerName}`);
    console.log(`   New server: ${info.newServerName}`);
    console.log(`   Updated: ${info.updatedAt.toISOString()}`);
  });

  // ========================================================================
  // TOKEN MANAGEMENT EVENTS
  // ========================================================================

  server.on('tokenAdded', (token) => {
    console.log(`➕ TOKEN ADDED: ${token}`);
  });

  server.on('tokenRemoved', (token) => {
    console.log(`➖ TOKEN REMOVED: ${token}`);
  });

  server.on('tokenUpdated', (token) => {
    console.log(`🔄 TOKEN UPDATED: ${token}`);
  });

  // ========================================================================
  // SESSION AND ACTIVITY EVENTS
  // ========================================================================

  server.on('sessionCreated', (session) => {
    console.log(`👤 SESSION CREATED`);
    console.log(`   Session ID: ${session.sessionId}`);
    console.log(`   Token: ${session.token}`);
    console.log(`   Server: ${session.serverName}`);
    console.log(`   Created: ${session.createdAt.toISOString()}`);
  });

  server.on('sessionDestroyed', (session) => {
    console.log(`💀 SESSION DESTROYED`);
    console.log(`   Session ID: ${session.sessionId}`);
    console.log(`   Token: ${session.token}`);
    console.log(`   Duration: ${Date.now() - session.createdAt.getTime()}ms`);
  });

  server.on('toolCalled', (call) => {
    console.log(`🔧 TOOL CALLED`);
    console.log(`   Tool: ${call.toolName}`);
    console.log(`   Token: ${call.token}`);
    console.log(`   Session: ${call.sessionId}`);
    console.log(`   Args: ${JSON.stringify(call.arguments)}`);
    console.log(`   Called: ${call.calledAt.toISOString()}`);
  });

  server.on('transportError', (sessionId, error) => {
    console.error(`❌ TRANSPORT ERROR`);
    console.error(`   Session: ${sessionId}`);
    console.error(`   Error: ${error.message}`);
  });

  // ========================================================================
  // DEMO SEQUENCE
  // ========================================================================

  console.log(`\n🎬 STARTING EVENT DEMONSTRATION\n`);

  // Start server
  console.log(`Step 1: Starting server...`);
  const info = await server.start();

  await delay(500);

  // Add initial tokens
  console.log(`\nStep 2: Adding initial tokens...`);
  server
    .addToken('math-v1', () => createMathServer('v1'))
    .addToken('time-v1', () => createTimeServer('v1'));

  await delay(500);

  // Add more tokens
  console.log(`\nStep 3: Adding more tokens...`);
  server
    .addToken('greeting-v1', () => createGreetingServer('v1'))
    .addToken('analytics-v1', () => createAnalyticsServer('v1'));

  await delay(500);

  // Update a token (simulate server upgrade)
  console.log(`\nStep 4: Updating math server to v2...`);
  server.updateToken('math-v1', () => createMathServer('v2'));

  await delay(500);

  // Remove a token
  console.log(`\nStep 5: Removing analytics server...`);
  server.removeToken('analytics-v1');

  await delay(500);

  // Show final stats
  console.log(`\nStep 6: Final status:`);
  const stats = server.getStats();
  console.log(`   Registered tokens: ${stats.registeredTokens}`);
  console.log(`   Active servers: ${stats.activeServers}`);
  console.log(`   Active sessions: ${stats.activeSessions}`);
  console.log(`   Tokens: ${stats.tokens.join(', ')}`);

  await delay(1000);

  // Stop server
  console.log(`\nStep 7: Stopping server...`);
  await server.stop();

  console.log(`\n✨ Demo complete! All events were fired correctly.\n`);

  return server;
}

// ============================================================================
// PRODUCTION MONITORING EXAMPLE
// ============================================================================

function setupProductionMonitoring(mcpServer) {
  // Server lifecycle monitoring
  mcpServer.on('started', (info) => {
    metrics.gauge('mcp_server_started', 1, { port: info.port });
    logger.info('MCP server started', info);
  });

  mcpServer.on('stopped', () => {
    metrics.gauge('mcp_server_running', 0);
    logger.info('MCP server stopped');
  });

  // MCP server registration monitoring
  mcpServer.on('serverRegistered', (info) => {
    metrics.counter('mcp_servers_registered').inc();
    metrics.gauge('mcp_registered_servers', mcpServer.getStats().registeredTokens);
    
    logger.info('MCP server registered', {
      token: info.token,
      serverName: info.serverName,
      serverVersion: info.serverVersion
    });
    
    // Alert if server registration takes too long
    const registrationDelay = Date.now() - info.registeredAt.getTime();
    if (registrationDelay > 5000) {
      alerts.warn('Slow server registration', { token: info.token, delay: registrationDelay });
    }
  });

  mcpServer.on('serverRemoved', (info) => {
    metrics.counter('mcp_servers_removed').inc();
    metrics.gauge('mcp_registered_servers', mcpServer.getStats().registeredTokens);
    
    if (info.hadActiveSessions) {
      alerts.warn('Server removed with active sessions', {
        token: info.token,
        serverName: info.serverName
      });
    }
    
    logger.info('MCP server removed', info);
  });

  mcpServer.on('serverUpdated', (info) => {
    metrics.counter('mcp_servers_updated').inc();
    
    logger.info('MCP server updated', {
      token: info.token,
      oldServer: info.oldServerName,
      newServer: info.newServerName
    });
  });

  // Session monitoring
  mcpServer.on('sessionCreated', (session) => {
    metrics.counter('mcp_sessions_created').inc();
    metrics.gauge('mcp_active_sessions', mcpServer.getStats().activeSessions);
  });

  mcpServer.on('sessionDestroyed', (session) => {
    metrics.counter('mcp_sessions_destroyed').inc();
    metrics.gauge('mcp_active_sessions', mcpServer.getStats().activeSessions);
  });

  // Tool usage monitoring
  mcpServer.on('toolCalled', (call) => {
    metrics.counter('mcp_tools_called').inc({ 
      tool: call.toolName, 
      token: call.token 
    });
    
    // Log high-value tool usage
    if (['analytics', 'export_data', 'admin_action'].includes(call.toolName)) {
      audit.log('High-value tool used', call);
    }
  });

  // Error monitoring
  mcpServer.on('transportError', (sessionId, error) => {
    metrics.counter('mcp_transport_errors').inc();
    alerts.error('MCP transport error', { sessionId, error: error.message });
  });
}

// ============================================================================
// EVENT-DRIVEN CUSTOMER MANAGEMENT
// ============================================================================

class EventDrivenCustomerService {
  private mcp = createPerBearerMcpServer({ port: 9090 });
  private customerServers = new Map<string, { name: string, version: string }>();

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Track server registrations
    this.mcp.on('serverRegistered', (info) => {
      this.customerServers.set(info.token, {
        name: info.serverName,
        version: info.serverVersion
      });
      
      console.log(`🎯 Customer server deployed: ${info.serverName} for ${info.token}`);
      
      // Send notification to customer
      this.notifyCustomer(info.token, 'Your MCP server is now active!');
    });

    // Track server updates (customer plan upgrades)
    this.mcp.on('serverUpdated', (info) => {
      const oldServer = this.customerServers.get(info.token);
      this.customerServers.set(info.token, {
        name: info.newServerName,
        version: '1.0.0' // or extract from server
      });
      
      console.log(`⬆️ Customer upgraded: ${info.token}`);
      console.log(`   ${info.oldServerName} → ${info.newServerName}`);
      
      this.notifyCustomer(info.token, 'Your plan has been upgraded!');
    });

    // Track server removals (customer churn)
    this.mcp.on('serverRemoved', (info) => {
      this.customerServers.delete(info.token);
      
      console.log(`👋 Customer offboarded: ${info.token}`);
      
      if (info.hadActiveSessions) {
        console.log(`⚠️ Warning: Customer had active sessions during removal`);
      }
    });

    // Monitor customer activity
    this.mcp.on('sessionCreated', (session) => {
      console.log(`📊 Customer activity: ${session.token} started session`);
      this.updateCustomerActivity(session.token, 'session_start');
    });

    this.mcp.on('toolCalled', (call) => {
      console.log(`🔧 Customer tool usage: ${call.token} used ${call.toolName}`);
      this.updateCustomerActivity(call.token, 'tool_usage', call.toolName);
    });
  }

  private notifyCustomer(token: string, message: string) {
    // Implementation would send notification
    console.log(`📧 Notification to ${token}: ${message}`);
  }

  private updateCustomerActivity(token: string, activity: string, details?: string) {
    // Implementation would update analytics/billing
    console.log(`📈 Activity logged: ${token} - ${activity}${details ? ` (${details})` : ''}`);
  }
}

// Helper functions
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createMathServer(version: string) {
  const server = new McpServer({ name: `math-server-${version}`, version });
  server.tool('add', 'Add numbers', {
    a: { type: 'number' }, b: { type: 'number' }
  }, ({ a, b }) => ({ content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }] }));
  return server;
}

function createTimeServer(version: string) {
  const server = new McpServer({ name: `time-server-${version}`, version });
  server.tool('now', 'Current time', {}, () => ({
    content: [{ type: 'text', text: `Time: ${new Date().toISOString()}` }]
  }));
  return server;
}

function createGreetingServer(version: string) {
  const server = new McpServer({ name: `greeting-server-${version}`, version });
  server.tool('greet', 'Say hello', {
    name: { type: 'string' }
  }, ({ name }) => ({ content: [{ type: 'text', text: `Hello, ${name}!` }] }));
  return server;
}

function createAnalyticsServer(version: string) {
  const server = new McpServer({ name: `analytics-server-${version}`, version });
  server.tool('analytics', 'Get analytics', {}, () => ({
    content: [{ type: 'text', text: 'Analytics data...' }]
  }));
  return server;
}

// Mock objects for production example
const metrics = {
  gauge: (name: string, value: number, tags?: Record<string, any>) => {},
  counter: (name: string) => ({ inc: (tags?: Record<string, any>) => {} })
};

const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || '')
};

const alerts = {
  warn: (message: string, meta?: any) => console.warn(`🚨 [ALERT] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`🚨 [CRITICAL] ${message}`, meta || '')
};

const audit = {
  log: (message: string, meta?: any) => console.log(`📋 [AUDIT] ${message}`, meta || '')
};

export default comprehensiveEventsDemo;

// ============================================================================
// USAGE SUMMARY WITH ALL EVENTS
// ============================================================================

export const allEventsExample = `
// Complete event handling setup
const server = createPerBearerMcpServer({ port: 0 });

// SERVER LIFECYCLE
server.on('started', (info) => console.log(\`🟢 Started: \${info.url}\`));
server.on('stopped', () => console.log('🔴 Stopped'));

// MCP SERVER EVENTS (detailed tracking)
server.on('serverRegistered', (info) => {
  console.log(\`📦 \${info.serverName} v\${info.serverVersion} registered for \${info.token}\`);
});

server.on('serverRemoved', (info) => {
  console.log(\`🗑️ \${info.serverName} removed from \${info.token}\`);
  if (info.hadActiveSessions) console.log('⚠️ Had active sessions!');
});

server.on('serverUpdated', (info) => {
  console.log(\`🔄 \${info.token}: \${info.oldServerName} → \${info.newServerName}\`);
});

// TOKEN EVENTS (basic tracking)
server.on('tokenAdded', (token) => console.log(\`➕ Token: \${token}\`));
server.on('tokenRemoved', (token) => console.log(\`➖ Token: \${token}\`));
server.on('tokenUpdated', (token) => console.log(\`🔄 Token: \${token}\`));

// ACTIVITY EVENTS
server.on('sessionCreated', (s) => console.log(\`👤 Session: \${s.sessionId}\`));
server.on('sessionDestroyed', (s) => console.log(\`💀 Session ended: \${s.sessionId}\`));
server.on('toolCalled', (c) => console.log(\`🔧 \${c.toolName} by \${c.token}\`));

// ERROR EVENTS
server.on('transportError', (sessionId, error) => {
  console.error(\`❌ Transport error in \${sessionId}: \${error.message}\`);
});

// This gives you complete visibility into:
// ✅ Server lifecycle (start/stop)
// ✅ MCP server registration/removal/updates (with metadata)
// ✅ Token management operations
// ✅ Session activity and lifecycle
// ✅ Tool usage patterns
// ✅ Error tracking and debugging
`;