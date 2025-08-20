#!/usr/bin/env node

import { runMCPServer } from './mcp-server.js';

async function main(): Promise<void> {
  try {
    await runMCPServer();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
