# Fastify MCP Server Plugin

A robust Fastify plugin that provides seamless integration with the Model Context Protocol (MCP) through streamable HTTP transport. This plugin enables your Fastify applications to act as MCP servers, allowing AI assistants and other clients to interact with your services using the standardized MCP protocol.

[![NPM version](https://img.shields.io/npm/v/@majkapp/fastify-mcp-server.svg?style=flat)](https://www.npmjs.com/package/@majkapp/fastify-mcp-server)
[![NPM downloads](https://img.shields.io/npm/dm/@majkapp/fastify-mcp-server.svg?style=flat)](https://www.npmjs.com/package/@majkapp/fastify-mcp-server)
[![CI](https://github.com/gaiin-platform/fastify-mcp-server/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/gaiin-platform/fastify-mcp-server/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/gaiin-platform/@majkapp/fastify-mcp-server/graph/badge.svg?token=4ZGUR6VXTJ)](https://codecov.io/gh/gaiin-platform/@majkapp/fastify-mcp-server)

## Table of Contents

- [🚀 Quick Start](#quick-start) - Get running in 30 seconds
- [🆕 Per-Bearer Token Servers](#-per-bearer-token-mcp-servers) - Multi-tenant functionality  
- [📊 Examples & Demos](#-examples--demos) - Production-ready patterns
- [🔌 Client Configuration](#-client-configuration) - MCP client setup
- [📚 API Reference](#api-reference) - Complete interface documentation
- [🔐 Authentication](#authentication-bearer-token-support) - Security and OAuth
- [🛠️ Development](#development) - Contributing and testing

## 📊 Examples & Demos

| Demo | Description | Command | Use Case |
|------|-------------|---------|----------|
| **Simple Server** | Basic multi-tenant setup | `npm run demo:simple` | Learning the basics |
| **Per-Bearer Demo** | 3 token types with different tools | `npm run demo:per-bearer` | Production preview |
| **Runtime Management** | Live token add/remove/update | `npm run demo:runtime-tokens` | SaaS operations |
| **Complete Example** | Enterprise patterns | See `examples/per-bearer-token-complete.ts` | Advanced use cases |

## Overview

The Model Context Protocol (MCP) is an open standard that enables AI assistants to securely connect to external data sources and tools. This plugin provides a streamable HTTP transport implementation for MCP servers built with Fastify, offering:

- **High Performance**: Built on top of Fastify's high-performance HTTP server
- **Session Management**: Automatic handling of MCP sessions with proper lifecycle management
- **Event-Driven Architecture**: Real-time session monitoring and error handling
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Production Ready**: Robust error handling, graceful shutdown, and monitoring capabilities

## Features

### Core Functionality

- ✅ **MCP Server Integration**: Seamless integration with `@modelcontextprotocol/sdk`
- ✅ **Streamable HTTP Transport**: Full support for MCP's streamable HTTP protocol
- ✅ **Session Management**: Automatic session creation, tracking, and cleanup
- ✅ **Request Routing**: Intelligent routing for different MCP request types
- ✅ **Authentication**: Optional Bearer token support for secure access
- ✅ **Error Handling**: Comprehensive error handling with proper MCP error responses

### Advanced Features

- ✅ **Event System**: Listen to session lifecycle events (creation, destruction, errors)
- ✅ **Session Statistics**: Real-time monitoring of active sessions
- ✅ **Graceful Shutdown**: Proper cleanup of all sessions during server shutdown
- ✅ **Configurable Endpoints**: Customizable MCP endpoint paths
- ✅ **TypeScript Support**: Full type safety and IntelliSense support

### 🆕 **Per-Bearer Token Features**

- ✅ **Multi-Tenant Support**: Different bearer tokens access different MCP servers
- ✅ **Runtime Token Management**: Add/remove/update tokens without server restart
- ✅ **Server Isolation**: Each token gets its own dedicated MCP server instance
- ✅ **Simple Interface**: Easy-to-use API for per-bearer server management
- ✅ **Rich Events**: Comprehensive monitoring of tokens, servers, and sessions
- ✅ **Zero Downtime**: Dynamic token operations with automatic cleanup

## Installation

```bash
npm install @majkapp/fastify-mcp-server @modelcontextprotocol/sdk
```

## Quick Demo

To quickly see the plugin in action, you can run the following examples:

### Standard MCP Server
```bash
npm run dev
npm run inspector
```

### 🆕 Per-Bearer Token Demos
```bash
# Simple multi-tenant server (recommended first demo)
npm run demo:simple

# Full per-bearer token demo (3 different servers with comprehensive tools)
npm run demo:per-bearer

# Runtime token management demo (add/remove/update tokens live)
npm run demo:runtime-tokens
```

This will start servers that demonstrate the full power of per-bearer token multi-tenancy!

## Quick Start

### 🚀 Simple Multi-Tenant Server (Recommended)

```typescript
import { createPerBearerMcpServer } from '@majkapp/fastify-mcp-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Create multi-tenant server with zero configuration
const server = createPerBearerMcpServer({ port: 8080 })
  .addToken('user-123', () => {
    const mcp = new McpServer({ name: 'user-tools', version: '1.0.0' });
    mcp.tool('hello', 'Say hello', {}, () => ({
      content: [{ type: 'text', text: 'Hello from your personal MCP server!' }]
    }));
    return mcp.server;
  })
  .addToken('admin-456', () => {
    const mcp = new McpServer({ name: 'admin-tools', version: '1.0.0' });
    mcp.tool('system-info', 'Get system info', {}, () => ({
      content: [{ type: 'text', text: \`Memory: \${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\` }]
    }));
    return mcp.server;
  });

// Start and monitor
const { url } = await server.start();
console.log(\`🚀 Multi-tenant MCP server running at \${url}\`);

// Each token gets completely different tools!
// user-123 token → hello tool only
// admin-456 token → system-info tool only
```

### 📡 Traditional Single Server

```typescript
import Fastify from 'fastify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import FastifyMcpServer, { getMcpDecorator } from '@majkapp/fastify-mcp-server';

const app = Fastify({ logger: true });

// Create MCP server instance
const mcp = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// Define MCP tools
mcp.tool('hello-world', 'Say hello', {}, () => ({
  content: [{ type: 'text', text: 'Hello from MCP!' }]
}));

// Register the plugin
await app.register(FastifyMcpServer, {
  server: mcp.server,
  endpoint: '/mcp', // optional, defaults to '/mcp'
});

// Get MCP decorator for advanced features
const mcpServer = getMcpDecorator(app);

// Start the server
await app.listen({ host: '127.0.0.1', port: 3000 });
```

## 🆕 Per-Bearer Token MCP Servers

This plugin supports **per-bearer token MCP servers**, enabling complete multi-tenancy where different bearer tokens access isolated MCP server instances with their own tools, resources, and capabilities. Perfect for SaaS applications, customer-specific tooling, and role-based access control!

### 🎯 Key Benefits

- **🏢 Multi-Tenant Architecture**: Each token gets its own isolated MCP server
- **🔄 Zero-Downtime Management**: Add/remove/update tokens without restart  
- **📊 Rich Monitoring**: Comprehensive events and statistics
- **⚡ High Performance**: Server caching and efficient resource management
- **🛡️ Complete Isolation**: No cross-contamination between tokens
- **🎛️ Simple API**: Intuitive interface for complex functionality

---

### 🚀 Quick Start Examples

#### Simple Multi-Tenant Server

```typescript
import { createPerBearerMcpServer } from '@majkapp/fastify-mcp-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Create per-bearer token server with dynamic port
const server = createPerBearerMcpServer({
  port: 0,     // Auto-assign port
  logging: true
});

// Add different servers for different user types
server
  .addToken('math-user-123', () => {
    const mcp = new McpServer({ name: 'math-tools', version: '1.0.0' });
    mcp.tool('add', 'Add numbers', { 
      a: { type: 'number' }, 
      b: { type: 'number' } 
    }, ({ a, b }) => ({ 
      content: [{ type: 'text', text: `${a + b}` }] 
    }));
    return mcp.server;
  })
  .addToken('admin-user-456', () => {
    const mcp = new McpServer({ name: 'admin-tools', version: '2.0.0' });
    mcp.tool('system-info', 'Get system information', {}, () => ({
      content: [{ type: 'text', text: JSON.stringify(process.memoryUsage(), null, 2) }]
    }));
    return mcp.server;
  });

// Start server and get assigned port
const { port, url } = await server.start();
console.log(`🚀 Multi-tenant MCP server running at ${url}`);
```

#### Enterprise SaaS Pattern

```typescript
class EnterpriseServicesAPI {
  private mcpServer = createPerBearerMcpServer({ port: 9000 });
  private customers = new Map();

  constructor() {
    // Set up comprehensive monitoring
    this.setupMonitoring();
  }

  // Customer onboarding with custom tools
  async onboardCustomer(customerId: string, companyName: string, plan: string) {
    const token = `enterprise-${customerId}-${Date.now()}`;
    
    // Create customer-specific MCP server
    this.mcpServer.addToken(token, () => this.createCustomerServer(companyName, plan));
    
    // Store customer info
    this.customers.set(customerId, { token, companyName, plan, createdAt: new Date() });
    
    return {
      token,
      mcpEndpoint: `http://127.0.0.1:9000/mcp`,
      capabilities: this.getPlanCapabilities(plan),
      setupInstructions: this.generateSetupInstructions(token)
    };
  }

  // Dynamic plan upgrades
  async upgradeCustomer(customerId: string, newPlan: string) {
    const customer = this.customers.get(customerId);
    if (!customer) throw new Error('Customer not found');

    // Update to new plan server (zero downtime)
    this.mcpServer.updateToken(
      customer.token, 
      () => this.createCustomerServer(customer.companyName, newPlan)
    );
    
    customer.plan = newPlan;
    return { success: true, newCapabilities: this.getPlanCapabilities(newPlan) };
  }

  // Customer offboarding
  async offboardCustomer(customerId: string) {
    const customer = this.customers.get(customerId);
    if (!customer) return false;

    this.mcpServer.removeToken(customer.token);
    this.customers.delete(customerId);
    return true;
  }

  private createCustomerServer(companyName: string, plan: string) {
    const mcp = new McpServer({ 
      name: `${companyName}-tools`, 
      version: '1.0.0' 
    });

    // Base tools for all plans
    mcp.tool('company-info', 'Get company information', {}, () => ({
      content: [{ type: 'text', text: `Company: ${companyName}\\nPlan: ${plan}` }]
    }));

    // Plan-specific tools
    if (plan === 'premium' || plan === 'enterprise') {
      mcp.tool('analytics', 'Advanced analytics', {
        metric: { type: 'string' }
      }, ({ metric }) => ({
        content: [{ type: 'text', text: `Analytics for ${metric}: [Premium Data]` }]
      }));
    }

    if (plan === 'enterprise') {
      mcp.tool('admin-controls', 'Enterprise admin tools', {}, () => ({
        content: [{ type: 'text', text: 'Enterprise admin dashboard accessible' }]
      }));
    }

    return mcp.server;
  }

  private setupMonitoring() {
    this.mcpServer.on('serverRegistered', ({ token, serverName, serverVersion }) => {
      console.log(`📦 Registered: ${serverName} v${serverVersion} for token ${token}`);
    });

    this.mcpServer.on('sessionCreated', ({ sessionId, token }) => {
      const customer = Array.from(this.customers.entries())
        .find(([_, c]) => c.token === token)?.[1];
      console.log(`👤 Session ${sessionId} started for ${customer?.companyName || 'unknown'}`);
    });

    this.mcpServer.on('toolCalled', ({ toolName, token, duration }) => {
      console.log(`🔧 Tool "${toolName}" executed in ${duration}ms`);
    });
  }

  // Get current system statistics
  getSystemStats() {
    return {
      server: this.mcpServer.getStats(),
      customers: {
        total: this.customers.size,
        byPlan: this.getCustomersByPlan()
      }
    };
  }
}

// Usage
const api = new EnterpriseServicesAPI();
await api.mcpServer.start();

// Onboard customers
const acme = await api.onboardCustomer('acme-corp', 'ACME Corporation', 'enterprise');
const startup = await api.onboardCustomer('startup-inc', 'Startup Inc', 'basic');
```

#### Real-Time Token Management

```typescript
import { createPerBearerMcpServer } from '@majkapp/fastify-mcp-server';

const server = createPerBearerMcpServer({ port: 8080 });

// Start with empty server
await server.start();
console.log('🟢 Server running, ready for dynamic tokens');

// Simulate real-time customer operations
setInterval(() => {
  const customerId = `customer-${Date.now()}`;
  const token = `token-${customerId}`;
  
  console.log(`➕ Adding customer: ${customerId}`);
  server.addToken(token, () => {
    const mcp = new McpServer({ name: `${customerId}-server`, version: '1.0.0' });
    mcp.tool('hello', 'Say hello', {}, () => ({
      content: [{ type: 'text', text: `Hello from ${customerId}!` }]
    }));
    return mcp.server;
  });

  // Remove after 30 seconds (simulate customer lifecycle)
  setTimeout(() => {
    console.log(`➖ Removing customer: ${customerId}`);
    server.removeToken(token);
  }, 30000);
  
}, 5000); // Add new customer every 5 seconds

// Monitor activity
server.on('tokenAdded', (token) => console.log(`🔑 Token added: ${token}`));
server.on('tokenRemoved', (token) => console.log(`🗑️  Token removed: ${token}`));
```

---

### 🛠️ Advanced Usage Patterns

#### Role-Based Access Control

```typescript
enum UserRole {
  VIEWER = 'viewer',
  EDITOR = 'editor', 
  ADMIN = 'admin'
}

class RoleBasedMcpService {
  private server = createPerBearerMcpServer({ port: 9001 });
  
  async createUserToken(userId: string, role: UserRole) {
    const token = `user-${userId}-${role}`;
    
    this.server.addToken(token, () => {
      const mcp = new McpServer({ name: `${role}-tools`, version: '1.0.0' });
      
      // Tools available to all users
      mcp.tool('read-data', 'Read data', { id: { type: 'string' } }, 
        ({ id }) => ({ content: [{ type: 'text', text: `Data for ${id}` }] }));
      
      // Editor and admin tools
      if (role === UserRole.EDITOR || role === UserRole.ADMIN) {
        mcp.tool('write-data', 'Write data', { 
          id: { type: 'string' }, 
          content: { type: 'string' } 
        }, ({ id, content }) => ({ 
          content: [{ type: 'text', text: `Saved ${content} to ${id}` }] 
        }));
      }
      
      // Admin-only tools
      if (role === UserRole.ADMIN) {
        mcp.tool('delete-data', 'Delete data', { id: { type: 'string' } },
          ({ id }) => ({ content: [{ type: 'text', text: `Deleted ${id}` }] }));
        mcp.tool('manage-users', 'Manage users', {},
          () => ({ content: [{ type: 'text', text: 'User management interface' }] }));
      }
      
      return mcp.server;
    });
    
    return token;
  }
}
```

#### Geographic Server Distribution  

```typescript
class GeoDistributedMcpService {
  private servers = new Map();
  
  async createRegionalServer(region: 'us-east', 'us-west', 'eu', 'asia') {
    const server = createPerBearerMcpServer({ 
      port: this.getRegionalPort(region),
      logging: true 
    });
    
    // Add region-specific tools and data
    server.addToken('regional-access', () => {
      const mcp = new McpServer({ name: `${region}-services`, version: '1.0.0' });
      
      mcp.tool('local-time', 'Get local time', {}, () => ({
        content: [{ type: 'text', text: new Date().toLocaleString('en-US', { 
          timeZone: this.getTimezone(region) 
        })}]
      }));
      
      mcp.tool('regional-data', 'Get regional data', {}, () => ({
        content: [{ type: 'text', text: `Data from ${region} datacenter` }]
      }));
      
      return mcp.server;
    });
    
    await server.start();
    this.servers.set(region, server);
    return server;
  }
}
```

---

### 📊 Monitoring & Events

The per-bearer token interface provides comprehensive event monitoring:

```typescript
const server = createPerBearerMcpServer();

// Server lifecycle events
server.on('started', (info) => {
  console.log(`🚀 Server started at ${info.url} (port ${info.port})`);
  console.log(`📋 Process ID: ${process.pid}`);
});

server.on('stopped', () => {
  console.log('🔴 Server stopped gracefully');
});

// Token management events  
server.on('tokenAdded', (token) => {
  console.log(`➕ New token registered: ${token}`);
  console.log(`📊 Total tokens: ${server.getStats().registeredTokens}`);
});

server.on('tokenRemoved', (token) => {
  console.log(`➖ Token removed: ${token}`);
});

server.on('tokenUpdated', (token) => {
  console.log(`🔄 Token updated: ${token}`);
});

// Server registration events (detailed tracking)
server.on('serverRegistered', ({ token, serverName, serverVersion, registeredAt }) => {
  console.log(`📦 Server registered:`, {
    name: serverName,
    version: serverVersion,
    token: token.substring(0, 8) + '...',
    timestamp: registeredAt.toISOString()
  });
});

server.on('serverRemoved', ({ token, serverName, hadActiveSessions, removedAt }) => {
  console.log(`🗑️  Server removed: ${serverName}`, {
    hadActiveSessions,
    removedAt: removedAt.toISOString()
  });
});

// Session activity monitoring
server.on('sessionCreated', ({ sessionId, token, createdAt }) => {
  console.log(`👤 New session: ${sessionId.substring(0, 8)}... for token ${token.substring(0, 8)}...`);
});

server.on('sessionEnded', ({ sessionId, duration }) => {
  console.log(`👋 Session ended: ${sessionId.substring(0, 8)}... (${duration}ms)`);
});

// Tool usage analytics
server.on('toolCalled', ({ toolName, token, sessionId, duration, success }) => {
  console.log(`🔧 Tool executed:`, {
    tool: toolName,
    token: token.substring(0, 8) + '...',
    duration: `${duration}ms`,
    status: success ? '✅' : '❌'
  });
});
```

### 🔧 Production Deployment

```typescript
import { createPerBearerMcpServer } from '@majkapp/fastify-mcp-server';
import closeWithGrace from 'close-with-grace';

class ProductionMcpService {
  private server: PerBearerMcpServer;
  
  async initialize() {
    this.server = createPerBearerMcpServer({
      port: process.env.MCP_PORT || 8080,
      logging: process.env.NODE_ENV !== 'production'
    });
    
    // Set up production monitoring
    this.setupHealthChecks();
    this.setupMetrics();
    this.setupGracefulShutdown();
    
    await this.server.start();
    return this.server.getServerInfo();
  }
  
  private setupHealthChecks() {
    setInterval(() => {
      const stats = this.server.getStats();
      
      // Alert on high session count
      if (stats.activeSessions > 1000) {
        console.warn('⚠️  High session count:', stats.activeSessions);
      }
      
      // Alert on token limit
      if (stats.registeredTokens > 10000) {
        console.warn('⚠️  High token count:', stats.registeredTokens);
      }
      
      // Memory monitoring
      const memory = process.memoryUsage();
      if (memory.heapUsed > 500 * 1024 * 1024) { // 500MB
        console.warn('⚠️  High memory usage:', Math.round(memory.heapUsed / 1024 / 1024) + 'MB');
      }
    }, 30000);
  }
  
  private setupGracefulShutdown() {
    closeWithGrace({ delay: 5000 }, async ({ signal, err }) => {
      if (err) {
        console.error('🚨 Server closing with error:', err);
      } else {
        console.log(`📡 ${signal} received, shutting down gracefully...`);
      }
      
      const stats = this.server.getStats();
      console.log(`📊 Final stats: ${stats.activeSessions} sessions, ${stats.registeredTokens} tokens`);
      
      await this.server.stop();
      console.log('✅ Shutdown complete');
    });
  }
}

// Start production service
const service = new ProductionMcpService();
service.initialize().then(info => {
  console.log('🎯 Production MCP service ready:', info);
});
```

---

### 🔌 Client Configuration

Each bearer token connects to the same MCP endpoint but receives completely different tools and capabilities:

#### MCP Client Settings (VS Code/Claude Desktop)

```json
{
  "mcpServers": {
    "math-service": {
      "type": "http",
      "url": "http://127.0.0.1:8080/mcp",
      "headers": {
        "Authorization": "Bearer math-user-123"
      }
    },
    "admin-service": {
      "type": "http", 
      "url": "http://127.0.0.1:8080/mcp",
      "headers": {
        "Authorization": "Bearer admin-user-456"
      }
    },
    "customer-acme": {
      "type": "http",
      "url": "http://127.0.0.1:8080/mcp", 
      "headers": {
        "Authorization": "Bearer enterprise-acme-corp-1234567890"
      }
    }
  }
}
```

#### Using Environment Variables for Security

```json
{
  "mcpServers": {
    "my-service": {
      "type": "http",
      "url": "https://your-domain.com/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_TOKEN}"
      }
    }
  }
}
```

Set the environment variable:
```bash
export MCP_TOKEN="your-secure-bearer-token-here"
```

#### Dynamic Client Configuration

```typescript
// Generate client config for customer onboarding
function generateMcpClientConfig(customerToken: string, serverUrl: string) {
  return {
    mcpServers: {
      [`customer-${Date.now()}`]: {
        type: "http",
        url: `${serverUrl}/mcp`,
        headers: {
          Authorization: `Bearer ${customerToken}`
        }
      }
    }
  };
}

// Usage in your onboarding API
app.post('/api/customers/:id/mcp-config', async (req, res) => {
  const { id } = req.params;
  const customer = await database.getCustomer(id);
  
  const config = generateMcpClientConfig(
    customer.mcpToken,
    process.env.MCP_SERVER_URL
  );
  
  res.json({
    message: 'MCP configuration ready',
    config,
    setupInstructions: [
      '1. Copy the configuration below',
      '2. Add it to your MCP client settings',
      '3. Restart your client to connect'
    ]
  });
});
```

---

## API Reference

### Plugin Options

#### Standard MCP Server Options
```typescript
type FastifyMcpServerOptions = {
  server: Server;      // MCP Server instance from @modelcontextprotocol/sdk
  endpoint?: string;   // Custom endpoint path (default: '/mcp')
  authorization?: {    // Authorization configuration
    bearerMiddlewareOptions?: {
      verifier: OAuthTokenVerifier; // Custom verifier for Bearer tokens
      requiredScopes?: string[]; // Optional scopes required for access
      resourceMetadataUrl?: string; // Optional URL for resource metadata
    };
    bearerTokenProvider?: BearerTokenProvider; // Per-bearer token provider
    oauth2?: {         // OAuth2 metadata configuration
      authorizationServerOAuthMetadata: OAuthMetadata;
      protectedResourceOAuthMetadata: OAuthProtectedResourceMetadata;
    };
  };
}
```

#### 🆕 Per-Bearer Token Server Options  
```typescript
type PerBearerMcpServerOptions = {
  port?: number;       // Port number (0 for dynamic assignment)
  host?: string;       // Host to bind to (default: '127.0.0.1') 
  logging?: boolean;   // Enable request logging (default: false)
  endpoint?: string;   // MCP endpoint path (default: '/mcp')
}

// Create per-bearer server
function createPerBearerMcpServer(options?: PerBearerMcpServerOptions): PerBearerMcpServer;
```

#### Per-Bearer Token Server Interface
```typescript
interface PerBearerMcpServer extends EventEmitter {
  // Token management
  addToken(token: string, serverFactory: ServerFactory): this;
  removeToken(token: string): this;
  updateToken(token: string, serverFactory: ServerFactory): this;
  
  // Server lifecycle
  start(): Promise<ServerInfo>;
  stop(): Promise<void>;
  
  // Status and monitoring  
  isRunning(): boolean;
  getStats(): ServerStats;
  getTokens(): string[];
  hasToken(token: string): boolean;
  getServerInfo(): ServerInfo | null;
  
  // Event emitter for comprehensive monitoring
  on(event: 'started', listener: (info: ServerInfo) => void): this;
  on(event: 'stopped', listener: () => void): this;
  on(event: 'tokenAdded', listener: (token: string) => void): this;
  on(event: 'tokenRemoved', listener: (token: string) => void): this;
  on(event: 'tokenUpdated', listener: (token: string) => void): this;
  on(event: 'serverRegistered', listener: (info: ServerRegisteredEvent) => void): this;
  on(event: 'serverRemoved', listener: (info: ServerRemovedEvent) => void): this;
  on(event: 'serverUpdated', listener: (info: ServerUpdatedEvent) => void): this;
  on(event: 'sessionCreated', listener: (session: SessionEvent) => void): this;
  on(event: 'sessionEnded', listener: (session: SessionEvent) => void): this;
  on(event: 'toolCalled', listener: (call: ToolCallEvent) => void): this;
}

type ServerFactory = () => Promise<Server> | Server;

type ServerInfo = {
  port: number;
  url: string;
  host: string; 
  endpoint: string;
  startedAt: Date;
}

type ServerStats = {
  registeredTokens: number;
  activeServers: number;
  activeSessions: number;
  uptime: number;
}
```

### MCP Decorator

The plugin decorates your Fastify instance with an MCP server that provides several useful methods:

```typescript
const mcpServer = getMCPDecorator(app);

// Get session statistics
const stats = mcpServer.getStats();
console.log(`Active sessions: ${stats.activeSessions}`);

// Access session manager for event handling
const sessionManager = mcpServer.getSessionManager();

// Graceful shutdown
await mcpServer.shutdown();
```

### Session Events

Monitor session lifecycle with event listeners:

```typescript
const sessionManager = mcpServer.getSessionManager();

// Session created
sessionManager.on('sessionCreated', (sessionId: string) => {
  console.log(`New MCP session: ${sessionId}`);
});

// Session destroyed
sessionManager.on('sessionDestroyed', (sessionId: string) => {
  console.log(`MCP session ended: ${sessionId}`);
});

// Transport errors
sessionManager.on('transportError', (sessionId: string, error: Error) => {
  console.error(`Error in session ${sessionId}:`, error);
});
```

### 🆕 Token Provider Interface

For advanced use cases, you can use the `TokenBasedServerProvider` directly:

```typescript
import { TokenBasedServerProvider } from '@majkapp/fastify-mcp-server';

const provider = new TokenBasedServerProvider({
  'token1': () => createServer1(),
  'token2': () => createServer2()
});

// Runtime token management
provider.addToken('token3', () => createServer3());
provider.removeToken('token1');
provider.updateToken('token2', () => createNewServer2());

// Use with standard Fastify plugin
await app.register(FastifyMcpServer, {
  endpoint: '/mcp',
  authorization: {
    bearerTokenProvider: provider,
    bearerMiddlewareOptions: {
      verifier: provider
    }
  }
});
```

## HTTP Protocol

The plugin exposes three HTTP endpoints for MCP communication:

### POST `/mcp`

- **Purpose**: Create new sessions or send requests to existing sessions
- **Headers**:
  - `content-type: application/json`
  - `mcp-session-id: <session-id>` (optional, for existing sessions)
- **Body**: MCP request payload

### GET `/mcp`

- **Purpose**: Retrieve streaming responses
- **Headers**:
  - `mcp-session-id: <session-id>` (required)
- **Response**: Server-sent events stream

### DELETE `/mcp`

- **Purpose**: Terminate sessions
- **Headers**:
  - `mcp-session-id: <session-id>` (required)

### Session Management

Sessions are managed through a dedicated `SessionManager` class that:

- **Creates** new transport instances with unique session IDs
- **Tracks** active sessions in memory
- **Handles** session lifecycle events
- **Provides** graceful cleanup on shutdown
- **Emits** events for monitoring and logging

## Advanced Usage

### Custom Error Handling

```typescript
sessionManager.on('transportError', (sessionId, error) => { 
    console.error(`Transport error: ${error.message}`);
});
```

### Health Monitoring

```typescript
// Periodic health check
setInterval(() => {
  const stats = mcpServer.getStats();
  console.log(`Health Check - Active Sessions: ${stats.activeSessions}`);
  
  // Alert if too many sessions
  if (stats.activeSessions > 100) {
    console.warn('High session count detected');
  }
}, 30000);
```

### Graceful Shutdown

```typescript
import closeWithGrace from 'close-with-grace';

closeWithGrace({ delay: 500 }, async ({ signal, err }) => {
  if (err) {
    app.log.error({ err }, 'server closing with error');
  } else {
    app.log.info(`${signal} received, server closing`);
  }
  
  // Shutdown MCP sessions before closing Fastify
  await mcpServer.shutdown();
  await app.close();
});
```

## Authentication: Bearer Token Support

You can secure your MCP endpoints using Bearer token authentication. The plugin provides a `bearerMiddlewareOptions` option, which enables validation of Bearer tokens in the `Authorization` header for all MCP requests.

### Enabling Bearer Token Authentication

Pass the `authorization.bearerMiddlewareOptions` option when registering the plugin. It accepts `BearerAuthMiddlewareOptions` from the SDK:

```typescript
import type { BearerAuthMiddlewareOptions } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
```

```typescript
await app.register(FastifyMcpServer, {
  server: mcp.server,
  authorization: {
    bearerMiddlewareOptions: {
      verifier: myVerifier, // implements verifyAccessToken(token)
      requiredScopes: ['mcp:read', 'mcp:write'], // optional
      resourceMetadataUrl: 'https://example.com/.well-known/oauth-resource', // optional,
    }
  }
});
```

- **verifier**: An object with a `verifyAccessToken(token)` method that returns the decoded token info or throws on failure. It must implements the `OAuthTokenVerifier` interface from the SDK.
- **requiredScopes**: (Optional) Array of scopes required for access.
- **resourceMetadataUrl**: (Optional) URL included in the `WWW-Authenticate` header for 401 responses.

### How It Works

The plugin uses a Fastify `preHandler` hook applied in the context of the MCP registered routes (see `addBearerPreHandlerHook`) to:

- Extract the Bearer token from the `Authorization` header (`Authorization: Bearer TOKEN`).
- Validate the token using your verifier.
- Check for required scopes and token expiration.
- Attach the decoded auth info to the request object (`req.raw.auth`).
- Respond with proper OAuth2 error codes and `WWW-Authenticate` headers on failure.

#### Example Tool with authentication information

You can access the validated authentication information in your MCP tools via the `authInfo` parameter:

```typescript
mcp.tool('example-auth-tool', 'Demo to display the validated access token in authInfo object', ({ authInfo }) => {
  return {
    content: [
      {
        type: 'text',
        // Just a bad example, do not expose sensitive information in your LLM responses! :-)
        text: `Authenticated with token: ${authInfo.token}, scopes: ${authInfo.scopes.join(', ')}, expires at: ${new Date(authInfo.expiresAt).toISOString()}`
      }
    ]
  };
});
```

#### Example Error Response

If authentication fails, the response will include a `WWW-Authenticate` header:

```txt
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="invalid_token", error_description="Token has expired"
Content-Type: application/json

{"error":"invalid_token","error_description":"Token has expired"}
```

#### Example using PAT in Visual Studio Code

```json
{
    "inputs": [
        {
            "type": "promptString",
            "id": "bearer_token",
            "description": "Enter your MCP Bearer Token",
            "password": true
        }
    ],
    "servers": {
        "my-mcp-server": {
            "url": "http://localhost:9080/mcp",
            "headers": {
                "Authorization": "Bearer ${input:bearer_token}"
            }
        }
    }
}
```

## Well-Known OAuth Metadata Routes

The plugin can automatically register standard OAuth 2.0 metadata endpoints under the `.well-known` path, which are useful for interoperability with OAuth clients and resource servers. You can test metadata discovery with the MCP inspector in the `Authentication` tab.

### Registering Well-Known Routes

To enable these endpoints, provide the `authorization.oauth2.authorizationServerOAuthMetadata` and/or `authorization.oauth2.protectedResourceOAuthMetadata` options when registering the plugin:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import FastifyMcpServer from '@majkapp/fastify-mcp-server';

const mcp = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

const authorizationServerMetadata = {
  issuer: 'https://your-domain.com',
  authorization_endpoint: 'https://your-domain.com/oauth/authorize',
  token_endpoint: 'https://your-domain.com/oauth/token',
  // ...other OAuth metadata fields
};

const protectedResourceMetadata = {
  resource: 'https://your-domain.com/.well-known/oauth-protected-resource',
  // ...other resource metadata fields
};

await app.register(FastifyMcpServer, {
  server: mcp.server,
  authorization: {
    oauth2: {
      authorizationServerOAuthMetadata: authorizationServerMetadata, // Registers /.well-known/oauth-authorization-server
      protectedResourceOAuthMetadata: protectedResourceMetadata,     // Registers /.well-known/oauth-protected-resource
    }
  }
});
```

### Endpoints

- `GET /.well-known/oauth-authorization-server` — Returns the OAuth authorization server metadata.
- `GET /.well-known/oauth-protected-resource` — Returns the OAuth protected resource metadata.

These endpoints are registered only if the corresponding metadata options are provided.

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/gaiin-platform/fastify-mcp-server.git
cd fastify-mcp-server

# Install dependencies
npm install

# Run development server with hot reload
npm run dev
```

### Scripts

**Development:**
- `npm run dev` - Run development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm test` - Run test suite with 100% coverage
- `npm run test:lcov` - Generate LCOV coverage report

**Per-Bearer Token Demos:**
- `npm run demo:simple` - Simple multi-tenant server (great for beginners)
- `npm run demo:per-bearer` - Comprehensive demo with 3 different token types
- `npm run demo:runtime-tokens` - Live token management (add/remove/update)

**Utilities:**
- `npm run inspector` - Open MCP inspector for testing
- `npm run lint` - Run code linting
- `npm run clean` - Clean build artifacts

### Testing

The project maintains comprehensive test coverage including:

**Core Tests:**
- Bearer token authentication and validation
- Session management and lifecycle
- Plugin registration and configuration
- Well-known OAuth endpoints

**🆕 Per-Bearer Token Tests:**
- `test/per-bearer-token.test.ts` - Token provider functionality
- `test/server-events.test.ts` - Server lifecycle events
- `test/per-bearer-integration.test.ts` - End-to-end integration tests

Run tests with:

```bash
npm test
```

**Test Coverage Areas:**
- ✅ Runtime token management (add/remove/update)
- ✅ Server isolation and caching
- ✅ Event emission and timing
- ✅ Error handling and edge cases
- ✅ Concurrent access patterns
- ✅ Session cleanup and memory management
- ✅ Authentication and authorization flows

## Contributing

Contributions are welcome! Please read our contributing guidelines and ensure:

1. Tests pass with 100% coverage
2. Code follows the established style (enforced by Biome)
3. Commits follow conventional commit format
4. Changes are properly documented

## License

- ISC © [gaiin-platform](https://github.com/gaiin-platform)
- ISC © [Flavio Del Grosso](https://github.com/flaviodelgrosso)

## Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol/servers) - Official MCP specification and servers
- [Fastify](https://github.com/fastify/fastify) - Fast and low overhead web framework
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - TypeScript SDK for MCP
