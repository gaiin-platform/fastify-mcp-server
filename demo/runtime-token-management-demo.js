#!/usr/bin/env node

/**
 * Runtime Token Management Demo
 * 
 * Demonstrates adding, updating, and removing bearer tokens
 * while the server is running (zero downtime operations).
 * 
 * Usage: npm run demo:runtime-tokens
 */

import { createPerBearerMcpServer } from '../dist/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

function createCustomerServer(customerId, plan = 'basic') {
  const server = new McpServer({ 
    name: `customer-${customerId}`, 
    version: '1.0.0' 
  });
  
  // Basic tools for all customers
  server.tool('get-info', 'Get customer information', {}, () => ({
    content: [{ type: 'text', text: `Customer: ${customerId}\\nPlan: ${plan}\\nStatus: Active` }]
  }));
  
  // Premium features for upgraded plans
  if (plan === 'premium' || plan === 'enterprise') {
    server.tool('advanced-analytics', 'Premium analytics', {}, () => ({
      content: [{ type: 'text', text: `📊 Advanced Analytics for ${customerId}\\nPlan: ${plan}\\nRevenue: $${Math.floor(Math.random() * 50000)}` }]
    }));
  }
  
  // Enterprise-only features
  if (plan === 'enterprise') {
    server.tool('admin-panel', 'Enterprise admin panel', {}, () => ({
      content: [{ type: 'text', text: `🏢 Enterprise Admin Panel\\nCustomer: ${customerId}\\nFull management access enabled` }]
    }));
  }
  
  return server.server;
}

async function main() {
  console.log('🚀 Runtime Token Management Demo');
  console.log('=================================');
  
  // Create server with dynamic port
  const server = createPerBearerMcpServer({ port: 0, logging: true });
  
  // Set up event monitoring
  server.on('started', ({ url, port }) => {
    console.log(`✅ Server started at ${url} (port ${port})`);
  });
  
  server.on('tokenAdded', (token) => {
    console.log(`➕ Token added: ${token}`);
  });
  
  server.on('tokenRemoved', (token) => {
    console.log(`➖ Token removed: ${token}`);
  });
  
  server.on('tokenUpdated', (token) => {
    console.log(`🔄 Token updated: ${token}`);
  });
  
  server.on('serverRegistered', ({ serverName, token }) => {
    console.log(`📦 Server registered: ${serverName} for token ${token.substring(0, 12)}...`);
  });
  
  server.on('sessionCreated', ({ sessionId, token }) => {
    console.log(`👤 New session: ${sessionId.substring(0, 8)}... (token: ${token.substring(0, 8)}...)`);
  });
  
  // Start with empty server
  await server.start();
  const { url } = server.getServerInfo();
  
  console.log('\\n🎭 Simulating customer lifecycle operations...');
  
  // Phase 1: Customer onboarding
  setTimeout(() => {
    console.log('\\n📈 Phase 1: Customer Onboarding');
    console.log('==================================');
    
    server.addToken('customer-acme-basic', () => createCustomerServer('acme-corp', 'basic'));
    server.addToken('customer-startup-basic', () => createCustomerServer('startup-inc', 'basic'));
    server.addToken('customer-bigco-premium', () => createCustomerServer('big-company', 'premium'));
    
    console.log(`📊 Stats: ${server.getStats().registeredTokens} tokens, ${server.getStats().activeServers} servers`);
  }, 1000);
  
  // Phase 2: Plan upgrades
  setTimeout(() => {
    console.log('\\n💎 Phase 2: Plan Upgrades');
    console.log('==========================');
    
    // Upgrade startup to premium
    server.updateToken('customer-startup-basic', () => createCustomerServer('startup-inc', 'premium'));
    
    // Upgrade big company to enterprise
    server.updateToken('customer-bigco-premium', () => createCustomerServer('big-company', 'enterprise'));
    
    console.log(`📊 Stats: ${server.getStats().registeredTokens} tokens, ${server.getStats().activeServers} servers`);
  }, 3000);
  
  // Phase 3: New enterprise customer
  setTimeout(() => {
    console.log('\\n🏢 Phase 3: Enterprise Customer');
    console.log('=================================');
    
    server.addToken('customer-enterprise-corp', () => createCustomerServer('enterprise-corp', 'enterprise'));
    
    console.log(`📊 Stats: ${server.getStats().registeredTokens} tokens, ${server.getStats().activeServers} servers`);
    console.log(`🔑 Active tokens: ${server.getTokens().join(', ')}`);
  }, 5000);
  
  // Phase 4: Customer churn
  setTimeout(() => {
    console.log('\\n📉 Phase 4: Customer Churn');
    console.log('============================');
    
    server.removeToken('customer-acme-basic');
    console.log('Customer acme-corp has churned and been removed');
    
    console.log(`📊 Final stats: ${server.getStats().registeredTokens} tokens, ${server.getStats().activeServers} servers`);
    console.log(`🔑 Remaining tokens: ${server.getTokens().join(', ')}`);
  }, 7000);
  
  // Show client configuration
  setTimeout(() => {
    console.log('\\n📋 Client Configuration Examples');
    console.log('==================================');
    console.log('Use these configurations to test different customer access levels:\\n');
    
    const configs = {
      "startup-premium": {
        type: "http",
        url: url,
        headers: { Authorization: "Bearer customer-startup-basic" }
      },
      "enterprise-customer": {
        type: "http", 
        url: url,
        headers: { Authorization: "Bearer customer-enterprise-corp" }
      }
    };
    
    console.log(JSON.stringify({ mcpServers: configs }, null, 2));
  }, 9000);
  
  // Keep running
  console.log('\\n⏳ Demo will run continuously. Press Ctrl+C to stop.');
  console.log('🔍 Test with MCP Inspector or client to see different access levels!');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\n🛑 Shutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);