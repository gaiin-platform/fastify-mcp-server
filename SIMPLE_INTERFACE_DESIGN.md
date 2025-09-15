# Simple PerBearerMcpServer Interface Design

## 🎯 Overview

This design provides a simple, ergonomic interface that wraps all the complexity of per-bearer token MCP servers into a single, easy-to-use class.

## 🔥 Developer Ergonomics Comparison

| Feature | Current Complex Way | New Simple Way |
|---------|-------------------|----------------|
| **Server Setup** | Create Fastify app, register plugins, configure auth, setup event handlers (50+ lines) | `createPerBearerMcpServer({ port: 0 })` (1 line) |
| **Add Token** | Create provider, configure bearer middleware, setup server factory, handle errors | `server.addToken('token', () => createServer())` (1 line) |
| **Dynamic Port** | Manual port detection, URL parsing, error handling | `const { port } = await server.start()` (built-in) |
| **Event Handling** | Manual session manager access, multiple event listeners setup | `server.on('sessionCreated', callback)` (unified events) |
| **Runtime Management** | Direct provider calls, manual cleanup, state tracking | `server.removeToken('token')` (automatic cleanup) |
| **Status Checking** | Multiple object access, manual state aggregation | `server.getStats()` (single call) |
| **Error Handling** | Manual try/catch, transport error handling, session cleanup | Built-in error handling with events |
| **Graceful Shutdown** | Manual session cleanup, server close, resource management | `await server.stop()` (automatic cleanup) |

## 🚀 Key Interface Features

### 1. **Simple Constructor**
```typescript
const server = createPerBearerMcpServer({
  port: 0,        // 0 = dynamic port
  host: '127.0.0.1',
  endpoint: '/mcp',
  logging: true,
  oauth2: { ... } // Optional
});
```

### 2. **Fluent Token Management**
```typescript
server
  .addToken('math-token', () => createMathServer())
  .addToken('time-token', () => createTimeServer())
  .addToken('data-token', () => createDataServer());
```

### 3. **Lifecycle Management**
```typescript
// Start and get dynamic port
const { port, url } = await server.start();

// Check status anytime
console.log('Running:', server.isRunning());
console.log('Port:', server.getServerInfo()?.port);

// Graceful stop
await server.stop();
```

### 4. **Runtime Token Operations**
```typescript
// Add new customer token
server.addToken(`customer-${id}`, () => createCustomerServer(id));

// Remove expired token
server.removeToken('expired-token');

// Update token with new capabilities
server.updateToken('existing-token', () => createUpdatedServer());
```

### 5. **Rich Event System**
```typescript
server.on('started', (info) => console.log(`Started at ${info.url}`));
server.on('sessionCreated', (session) => logSession(session));
server.on('tokenAdded', (token) => notifyTokenAdded(token));
server.on('toolCalled', (call) => logToolUsage(call));
```

### 6. **Status and Monitoring**
```typescript
// Get comprehensive stats
const stats = server.getStats();
// {
//   registeredTokens: 5,
//   activeServers: 3,
//   activeSessions: 2,
//   tokens: ['token1', 'token2', ...],
//   sessions: [{ sessionId, token, serverName, createdAt }, ...]
// }

// Check specific tokens
server.hasToken('customer-123-token');  // true/false
server.getTokens();                     // ['token1', 'token2', ...]
server.getActiveSessions();             // [session objects]
```

## 📱 Usage Patterns

### **1. Quick Prototyping**
```typescript
const server = createPerBearerMcpServer()
  .addToken('test', () => new McpServer({ name: 'test', version: '1.0.0' }));

const { port } = await server.start();
console.log(`Prototype server running on port ${port}`);
```

### **2. SaaS Customer Management**
```typescript
class CustomerService {
  private mcp = createPerBearerMcpServer({ port: 9090 });

  async addCustomer(id, name, plan) {
    const token = `customer-${id}`;
    this.mcp.addToken(token, () => this.createCustomerServer(name, plan));
    return { token, planFeatures: this.getPlanFeatures(plan) };
  }

  removeCustomer(id) {
    return this.mcp.removeToken(`customer-${id}`);
  }
}
```

### **3. Development Environment**
```typescript
const dev = createPerBearerMcpServer({ logging: true })
  .addToken('dev', () => createDevServer())
  .addToken('test', () => createTestServer());

dev.on('sessionCreated', s => console.log(`🔍 Debug session: ${s.token}`));
dev.on('toolCalled', c => console.log(`🔧 Tool used: ${c.toolName}`));

await dev.start(); // Auto-assigns port, shows in logs
```

### **4. Production Deployment**
```typescript
const prod = createPerBearerMcpServer({
  port: process.env.PORT || 8080,
  host: '0.0.0.0',
  logging: process.env.NODE_ENV !== 'production',
  oauth2: {
    issuer: process.env.OAUTH_ISSUER,
    authorizationEndpoint: process.env.OAUTH_AUTH_ENDPOINT,
    tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT,
    registrationEndpoint: process.env.OAUTH_REG_ENDPOINT
  }
});

// Load customer tokens from database
const customers = await db.getActiveCustomers();
customers.forEach(customer => {
  prod.addToken(customer.apiToken, () => createCustomerMcp(customer));
});

// Production monitoring
prod.on('transportError', (sessionId, error) => {
  logger.error('MCP transport error', { sessionId, error });
});

await prod.start();
```

## 🎯 Benefits

### **For Developers**
- **90% less boilerplate** - Single class instead of multiple components
- **Type safety** - Full TypeScript support with rich type definitions  
- **IntelliSense support** - Great IDE experience with autocomplete
- **Fluent interface** - Method chaining for readable code
- **Sensible defaults** - Works out of the box with minimal configuration

### **For Operations**
- **Zero downtime** - Add/remove tokens without restart
- **Dynamic ports** - Perfect for containerized deployments
- **Rich monitoring** - Built-in events for logging and metrics
- **Graceful shutdown** - Proper cleanup and resource management
- **Error resilience** - Built-in error handling and recovery

### **For Architecture**
- **Multi-tenant ready** - Perfect for SaaS applications
- **Horizontally scalable** - Each server instance is independent
- **Environment flexible** - Works for dev, test, staging, production
- **Integration friendly** - Event-driven architecture for easy integration

## 🎪 Enhanced Event System

The interface provides **dual-level event tracking** for comprehensive monitoring:

### **Token Events (Basic Operations)**
```typescript
server.on('tokenAdded', (token) => console.log(`➕ Token: ${token}`));
server.on('tokenRemoved', (token) => console.log(`➖ Token: ${token}`));
server.on('tokenUpdated', (token) => console.log(`🔄 Token: ${token}`));
```

### **Server Events (Detailed Tracking) - NEW!**
```typescript
// When a new MCP server is created for a token
server.on('serverRegistered', (info) => {
  console.log(`📦 Server: ${info.serverName} v${info.serverVersion}`);
  console.log(`   Token: ${info.token}`);
  console.log(`   Registered: ${info.registeredAt}`);
});

// When an MCP server is removed (with cleanup info)
server.on('serverRemoved', (info) => {
  console.log(`🗑️ Server: ${info.serverName} removed`);
  console.log(`   Token: ${info.token}`);
  console.log(`   Had active sessions: ${info.hadActiveSessions ? 'YES' : 'NO'}`);
  console.log(`   Removed: ${info.removedAt}`);
});

// When an MCP server is updated (plan upgrades, etc.)
server.on('serverUpdated', (info) => {
  console.log(`🔄 Server upgrade for token: ${info.token}`);
  console.log(`   ${info.oldServerName} → ${info.newServerName}`);
  console.log(`   Updated: ${info.updatedAt}`);
});
```

### **Use Cases for Server Events**

1. **Production Monitoring**
   ```typescript
   server.on('serverRegistered', (info) => {
     metrics.gauge('mcp_servers_registered', server.getStats().registeredTokens);
     logger.info('New MCP server deployed', info);
   });
   ```

2. **Customer Notifications**
   ```typescript
   server.on('serverRegistered', (info) => {
     notifyCustomer(info.token, `Your ${info.serverName} is now active!`);
   });

   server.on('serverUpdated', (info) => {
     notifyCustomer(info.token, 'Your plan has been upgraded!');
   });
   ```

3. **Billing & Analytics**
   ```typescript
   server.on('serverRegistered', (info) => {
     billing.startMeteringForCustomer(info.token, info.serverName);
   });

   server.on('serverRemoved', (info) => {
     if (info.hadActiveSessions) {
       analytics.recordChurnWithActiveUsage(info.token);
     }
   });
   ```

4. **Audit & Compliance**
   ```typescript
   server.on('serverUpdated', (info) => {
     audit.logConfigurationChange({
       token: info.token,
       change: `${info.oldServerName} → ${info.newServerName}`,
       timestamp: info.updatedAt
     });
   });
   ```

## 🔧 Implementation Status

- ✅ **Interface designed** - Complete TypeScript interface defined
- ✅ **Core logic ready** - TokenBasedServerProvider with runtime management
- ✅ **Event system** - Event emitter patterns defined
- 🚧 **Integration layer** - Needs Fastify wrapper implementation
- 🚧 **Session tracking** - Enhanced session manager for event data
- 🚧 **Port detection** - Dynamic port discovery and reporting

## 🎪 Next Steps

1. **Implement the wrapper class** - Create the PerBearerMcpServer class
2. **Enhance session tracking** - Add token/server info to session events
3. **Add tool call tracking** - Monitor and emit tool usage events
4. **Create comprehensive tests** - Unit and integration testing
5. **Add examples and documentation** - Complete developer guide

This interface transforms a complex, multi-step setup into a simple, powerful, and developer-friendly API that handles all the complexity behind the scenes while providing rich monitoring and control capabilities.