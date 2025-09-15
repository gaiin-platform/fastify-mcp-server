# Fastify MCP Server Plugin

A robust Fastify plugin that provides seamless integration with the Model Context Protocol (MCP) through streamable HTTP transport. This plugin enables your Fastify applications to act as MCP servers, allowing AI assistants and other clients to interact with your services using the standardized MCP protocol.

[![NPM version](https://img.shields.io/npm/v/fastify-mcp-server.svg?style=flat)](https://www.npmjs.com/package/fastify-mcp-server)
[![NPM downloads](https://img.shields.io/npm/dm/fastify-mcp-server.svg?style=flat)](https://www.npmjs.com/package/fastify-mcp-server)
[![CI](https://github.com/flaviodelgrosso/fastify-mcp-server/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/flaviodelgrosso/fastify-mcp-server/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/flaviodelgrosso/fastify-mcp-server/graph/badge.svg?token=4ZGUR6VXTJ)](https://codecov.io/gh/flaviodelgrosso/fastify-mcp-server)

## Table of Contents

- [Fastify MCP Server Plugin](#fastify-mcp-server-plugin)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
    - [Core Functionality](#core-functionality)
    - [Advanced Features](#advanced-features)
  - [Installation](#installation)
  - [Quick Demo](#quick-demo)
  - [Quick Start](#quick-start)
  - [API Reference](#api-reference)
    - [Plugin Options](#plugin-options)
    - [MCP Decorator](#mcp-decorator)
    - [Session Events](#session-events)
  - [HTTP Protocol](#http-protocol)
    - [POST `/mcp`](#post-mcp)
    - [GET `/mcp`](#get-mcp)
    - [DELETE `/mcp`](#delete-mcp)
    - [Session Management](#session-management)
  - [Advanced Usage](#advanced-usage)
    - [Custom Error Handling](#custom-error-handling)
    - [Health Monitoring](#health-monitoring)
    - [Graceful Shutdown](#graceful-shutdown)
  - [Authentication: Bearer Token Support](#authentication-bearer-token-support)
    - [Enabling Bearer Token Authentication](#enabling-bearer-token-authentication)
    - [How It Works](#how-it-works)
      - [Example Tool with authentication information](#example-tool-with-authentication-information)
      - [Example Error Response](#example-error-response)
      - [Example using PAT in Visual Studio Code](#example-using-pat-in-visual-studio-code)
  - [Well-Known OAuth Metadata Routes](#well-known-oauth-metadata-routes)
    - [Registering Well-Known Routes](#registering-well-known-routes)
    - [Endpoints](#endpoints)
  - [Development](#development)
    - [Setup](#setup)
    - [Scripts](#scripts)
    - [Testing](#testing)
  - [Contributing](#contributing)
  - [License](#license)
  - [Related Projects](#related-projects)

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
npm install fastify-mcp-server @modelcontextprotocol/sdk
```

## Quick Demo

To quickly see the plugin in action, you can run the following examples:

### Standard MCP Server
```bash
npm run dev
npm run inspector
```

### 🆕 Per-Bearer Token Demo
```bash
# Start per-bearer token demo (3 different tokens with different tools)
npm run demo:per-bearer

# Start runtime token management demo (add/remove tokens live)
npm run demo:runtime-tokens
```

This will start a Fastify server with the MCP plugin enabled, allowing you to interact with it via the MCP inspector or any MCP-compatible client.

## Quick Start

```typescript
import Fastify from 'fastify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import FastifyMcpServer, { getMcpDecorator } from 'fastify-mcp-server';

const app = Fastify({ logger: true });

// Create MCP server instance
const mcp = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// Define MCP tools
mcp.tool('hello-world', () => ({
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

This plugin now supports **per-bearer token MCP servers**, allowing different bearer tokens to access completely different sets of tools and capabilities. Perfect for multi-tenant SaaS applications!

### Quick Start with Per-Bearer Tokens

```typescript
import { TokenBasedServerProvider } from 'fastify-mcp-server';

// Create different servers for different tokens
const bearerTokenProvider = new TokenBasedServerProvider({
  'basic-user-token': () => createBasicMathServer(),
  'admin-token': () => createAdminServer(),
  'premium-customer-token': () => createPremiumAnalyticsServer()
});

await app.register(FastifyMcpServer, {
  endpoint: '/mcp',
  authorization: {
    bearerTokenProvider,
    bearerMiddlewareOptions: {
      verifier: bearerTokenProvider  // Use same provider for verification
    }
  }
});
```

### Simple Interface (Recommended)

```typescript
import { createPerBearerMcpServer } from 'fastify-mcp-server';

const server = createPerBearerMcpServer({
  port: 0,        // Dynamic port assignment
  logging: true
})
.addToken('math-token', () => createMathServer())
.addToken('admin-token', () => createAdminServer());

// Rich event system
server.on('started', (info) => console.log(\`🚀 Server at \${info.url}\`));
server.on('serverRegistered', (info) => 
  console.log(\`📦 \${info.serverName} registered for \${info.token}\`));
server.on('sessionCreated', (session) => 
  console.log(\`👤 Session: \${session.sessionId}\`));

const { port } = await server.start();
console.log(\`Started on dynamic port: \${port}\`);
```

### Runtime Token Management

```typescript
// Add tokens at runtime (zero downtime)
server.addToken('new-customer-token', () => createCustomerServer());

// Remove expired tokens
server.removeToken('expired-token');

// Update existing tokens (plan upgrades)
server.updateToken('customer-token', () => createPremiumServer());

// Monitor status
console.log('Active tokens:', server.getTokens());
console.log('Stats:', server.getStats());
```

### Multi-Tenant SaaS Pattern

```typescript
class CustomerMcpService {
  private mcp = createPerBearerMcpServer({ port: 9090 });

  async addCustomer(customerId, name, plan) {
    const token = \`customer-\${customerId}-token\`;
    this.mcp.addToken(token, () => this.createCustomerServer(name, plan));
    return { token, features: this.getPlanFeatures(plan) };
  }

  removeCustomer(customerId) {
    this.mcp.removeToken(\`customer-\${customerId}-token\`);
  }

  upgradeCustomer(customerId, newPlan) {
    const token = \`customer-\${customerId}-token\`;
    this.mcp.updateToken(token, () => this.createCustomerServer(name, newPlan));
  }
}
```

### MCP Client Configuration

Each bearer token connects to the same URL but gets different tools:

```json
{
  "mcpServers": {
    "basic-math": {
      "type": "http",
      "url": "http://127.0.0.1:9081/mcp",
      "headers": {
        "Authorization": "Bearer basic-user-token"
      }
    },
    "admin-tools": {
      "type": "http",
      "url": "http://127.0.0.1:9081/mcp",
      "headers": {
        "Authorization": "Bearer admin-token"
      }
    }
  }
}
```

## API Reference

### Plugin Options

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
    oauth2?: {         // OAuth2 metadata configuration
      authorizationServerOAuthMetadata: OAuthMetadata; // OAuth metadata for authorization server
      protectedResourceOAuthMetadata: OAuthProtectedResourceMetadata; // OAuth metadata for protected resource
    };
  };
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

### 🆕 Per-Bearer Token Events

The new per-bearer token interface provides rich event monitoring:

```typescript
const server = createPerBearerMcpServer();

// Server lifecycle events
server.on('started', (info) => console.log(`🚀 Started at ${info.url}`));
server.on('stopped', () => console.log('🔴 Stopped'));

// Token management events
server.on('tokenAdded', (token) => console.log(`➕ Token: ${token}`));
server.on('tokenRemoved', (token) => console.log(`➖ Token: ${token}`));
server.on('tokenUpdated', (token) => console.log(`🔄 Token: ${token}`));

// Server registration events (detailed tracking)
server.on('serverRegistered', (info) => {
  console.log(`📦 ${info.serverName} v${info.serverVersion} registered for ${info.token}`);
});

server.on('serverRemoved', (info) => {
  console.log(`🗑️ ${info.serverName} removed (had sessions: ${info.hadActiveSessions})`);
});

server.on('serverUpdated', (info) => {
  console.log(`🔄 Server updated: ${info.oldServerName} → ${info.newServerName}`);
});

// Session and activity events
server.on('sessionCreated', (session) => {
  console.log(`👤 Session ${session.sessionId} for ${session.token}`);
});

server.on('toolCalled', (call) => {
  console.log(`🔧 Tool ${call.toolName} called by ${call.token}`);
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
import FastifyMcpServer from 'fastify-mcp-server';

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
git clone https://github.com/flaviodelgrosso/fastify-mcp-server.git
cd fastify-mcp-server

# Install dependencies
npm install

# Run development server with hot reload
npm run dev
```

### Scripts

- `npm run dev` - Run development server with hot reload
- `npm run demo:per-bearer` - Run per-bearer token demo with 3 different tokens
- `npm run demo:runtime-tokens` - Run runtime token management demo
- `npm run build` - Build TypeScript to JavaScript
- `npm test` - Run test suite with 100% coverage
- `npm run test:lcov` - Generate LCOV coverage report
- `npm run release` - Create a new release

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

ISC © [Flavio Del Grosso](https://github.com/flaviodelgrosso)

## Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol/servers) - Official MCP specification and servers
- [Fastify](https://github.com/fastify/fastify) - Fast and low overhead web framework
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - TypeScript SDK for MCP
