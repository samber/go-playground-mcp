import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createGoPlaygroundClient } from './go-playground-client.js';
import {
  type RunGoCodeArgs,
  type ShareGoCodeArgs,
  type RunAndShareGoCodeArgs,
  type ReadGoPlaygroundUrlArgs,
  type ExecuteGoPlaygroundUrlArgs,
  type MCPGoPlaygroundResult,
  type MCPGoPlaygroundSuccess,
  type MCPGoPlaygroundFailure,
  type GoPlaygroundError,
  TOOL_NAMES,
  type ToolName,
  GoPlaygroundErrorCode,
  isValidToolName,
  isRunGoCodeArgs,
  isShareGoCodeArgs,
  isRunAndShareGoCodeArgs,
  isReadGoPlaygroundUrlArgs,
  isExecuteGoPlaygroundUrlArgs,
  assertNever,
  createGoPlaygroundError,
} from './types.js';

// MCP response type
type MCPToolResponse = { content: Array<{ type: 'text'; text: string }> };

// Server configuration
type ServerConfig = {
  readonly name: string;
  readonly version: string;
};

const defaultServerConfig: ServerConfig = {
  name: 'go-playground-mcp',
  version: '1.0.0',
};

// Tool definitions
const createToolDefinitions = (): readonly Tool[] =>
  [
    {
      name: TOOL_NAMES.RUN_GO_CODE,
      description:
        'Run Go code in the Go Playground and return execution results',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The Go code to execute',
          },
          withVet: {
            type: 'boolean',
            description: 'Whether to run go vet on the code (default: true)',
            default: true,
          },
        },
        required: ['code'],
      },
    },
    {
      name: TOOL_NAMES.SHARE_GO_CODE,
      description: 'Share Go code and get a shareable URL',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The Go code to share',
          },
        },
        required: ['code'],
      },
    },
    {
      name: TOOL_NAMES.RUN_AND_SHARE_GO_CODE,
      description:
        'Run Go code and get both execution results and a shareable URL',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The Go code to execute and share',
          },
          withVet: {
            type: 'boolean',
            description: 'Whether to run go vet on the code (default: true)',
            default: true,
          },
        },
        required: ['code'],
      },
    },
    {
      name: TOOL_NAMES.READ_GO_PLAYGROUND_URL,
      description: 'Read Go code from an existing Go Playground URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The Go Playground URL to read code from (e.g., https://go.dev/play/abc123 or https://play.golang.org/p/abc123)',
          },
        },
        required: ['url'],
      },
    },
    {
      name: TOOL_NAMES.EXECUTE_GO_PLAYGROUND_URL,
      description: 'Execute Go code from an existing Go Playground URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The Go Playground URL to execute code from (e.g., https://go.dev/play/abc123 or https://play.golang.org/p/abc123)',
          },
          withVet: {
            type: 'boolean',
            description: 'Whether to run go vet on the code (default: true)',
            default: true,
          },
        },
        required: ['url'],
      },
    },
  ] as const;

// Response formatting functions
const formatSuccessResponse = (result: MCPGoPlaygroundSuccess): string => {
  const parts = [
    '✅ Code executed successfully!\n',
    '**Output:**',
    '```',
    result.output || '(no output)',
    '```\n',
    `**Exit Code:** ${result.exitCode}`,
  ] as const;

  return parts.join('\n');
};

const formatFailureResponse = (result: MCPGoPlaygroundFailure): string => {
  const parts = [
    '❌ Code execution failed!\n',
    '**Errors:**',
    '```',
    result.errors,
    '```\n',
  ];

  if (result.exitCode !== undefined) {
    parts.push(`**Exit Code:** ${result.exitCode}`);
  }

  return parts.join('\n');
};

const formatRunResponse = (result: MCPGoPlaygroundResult): string => {
  return result.success
    ? formatSuccessResponse(result)
    : formatFailureResponse(result);
};

const formatRunAndShareResponse = (result: MCPGoPlaygroundResult): string => {
  const runResponse = formatRunResponse(result);
  const parts = [runResponse];

  if (result.shareUrl) {
    parts.push(`\n**Share URL:** ${result.shareUrl}`);
  } else {
    parts.push('\n⚠️ Failed to generate share URL');
  }

  return parts.join('');
};

// Response creation utilities
const createSuccessResponse = (text: string): MCPToolResponse => ({
  content: [{ type: 'text', text }],
});

const createErrorResponse = (error: unknown): MCPToolResponse => {
  let errorMessage: string;

  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'GoPlaygroundError'
  ) {
    const goError = error as GoPlaygroundError;
    errorMessage = `Error [${goError.code}]: ${goError.message}`;
  } else if (error instanceof Error) {
    errorMessage = `Error: ${error.message}`;
  } else {
    errorMessage = `Unexpected error: ${String(error)}`;
  }

  // Log the full error for debugging
  console.error('MCP Server Error:', error);

  return { content: [{ type: 'text', text: errorMessage }] };
};

// Tool handler functions
const createRunGoCodeHandler =
  (client: ReturnType<typeof createGoPlaygroundClient>) =>
  async (args: RunGoCodeArgs): Promise<MCPToolResponse> => {
    try {
      const { code, withVet = true } = args;
      const result = await client.runCode(code, withVet);
      const responseText = formatRunResponse(result);
      return createSuccessResponse(responseText);
    } catch (error) {
      console.error('Error in handleRunGoCode:', error);
      return createErrorResponse(error);
    }
  };

const createShareGoCodeHandler =
  (client: ReturnType<typeof createGoPlaygroundClient>) =>
  async (args: ShareGoCodeArgs): Promise<MCPToolResponse> => {
    try {
      const { code } = args;
      const shareUrl = await client.shareCode(code);

      const responseText = shareUrl
        ? `✅ Code shared successfully!\n\n**Share URL:** ${shareUrl}`
        : '❌ Failed to share code. Please try again.';

      return createSuccessResponse(responseText);
    } catch (error) {
      console.error('Error in handleShareGoCode:', error);
      return createErrorResponse(error);
    }
  };

const createRunAndShareGoCodeHandler =
  (client: ReturnType<typeof createGoPlaygroundClient>) =>
  async (args: RunAndShareGoCodeArgs): Promise<MCPToolResponse> => {
    try {
      const { code, withVet = true } = args;
      const result = await client.runAndShare(code, withVet);
      const responseText = formatRunAndShareResponse(result);
      return createSuccessResponse(responseText);
    } catch (error) {
      console.error('Error in handleRunAndShareGoCode:', error);
      return createErrorResponse(error);
    }
  };

const createReadGoPlaygroundUrlHandler =
  (client: ReturnType<typeof createGoPlaygroundClient>) =>
  async (args: ReadGoPlaygroundUrlArgs): Promise<MCPToolResponse> => {
    try {
      const { url } = args;
      const result = await client.readUrl(url);

      if (!result.success) {
        const responseText = `❌ Failed to read code from playground URL.\n\n**Error:** ${result.error}`;
        return createSuccessResponse(responseText);
      }

      const responseText = `✅ Successfully read code from playground URL!\n\n**Code:**\n\`\`\`go\n${result.code}\n\`\`\``;
      return createSuccessResponse(responseText);
    } catch (error) {
      console.error('Error in handleReadGoPlaygroundUrl:', error);
      return createErrorResponse(error);
    }
  };

const createExecuteGoPlaygroundUrlHandler =
  (client: ReturnType<typeof createGoPlaygroundClient>) =>
  async (args: ExecuteGoPlaygroundUrlArgs): Promise<MCPToolResponse> => {
    try {
      const { url, withVet = true } = args;
      const result = await client.executeUrl(url, withVet);
      const responseText = formatRunResponse(result);
      return createSuccessResponse(responseText);
    } catch (error) {
      console.error('Error in handleExecuteGoPlaygroundUrl:', error);
      return createErrorResponse(error);
    }
  };

// Tool routing function
const createToolRouter = (
  client: ReturnType<typeof createGoPlaygroundClient>
) => {
  const handlers = {
    [TOOL_NAMES.RUN_GO_CODE]: createRunGoCodeHandler(client),
    [TOOL_NAMES.SHARE_GO_CODE]: createShareGoCodeHandler(client),
    [TOOL_NAMES.RUN_AND_SHARE_GO_CODE]: createRunAndShareGoCodeHandler(client),
    [TOOL_NAMES.READ_GO_PLAYGROUND_URL]: createReadGoPlaygroundUrlHandler(client),
    [TOOL_NAMES.EXECUTE_GO_PLAYGROUND_URL]: createExecuteGoPlaygroundUrlHandler(client),
  } as const;

  return async (
    toolName: ToolName,
    args: unknown
  ): Promise<MCPToolResponse> => {
    switch (toolName) {
      case TOOL_NAMES.RUN_GO_CODE: {
        if (!isRunGoCodeArgs(args)) {
          return createErrorResponse(
            createGoPlaygroundError(
              'Invalid arguments for run_go_code',
              GoPlaygroundErrorCode.VALIDATION_ERROR
            )
          );
        }
        return await handlers[TOOL_NAMES.RUN_GO_CODE](args);
      }

      case TOOL_NAMES.SHARE_GO_CODE: {
        if (!isShareGoCodeArgs(args)) {
          return createErrorResponse(
            createGoPlaygroundError(
              'Invalid arguments for share_go_code',
              GoPlaygroundErrorCode.VALIDATION_ERROR
            )
          );
        }
        return await handlers[TOOL_NAMES.SHARE_GO_CODE](args);
      }

      case TOOL_NAMES.RUN_AND_SHARE_GO_CODE: {
        if (!isRunAndShareGoCodeArgs(args)) {
          return createErrorResponse(
            createGoPlaygroundError(
              'Invalid arguments for run_and_share_go_code',
              GoPlaygroundErrorCode.VALIDATION_ERROR
            )
          );
        }
        return await handlers[TOOL_NAMES.RUN_AND_SHARE_GO_CODE](args);
      }

      case TOOL_NAMES.READ_GO_PLAYGROUND_URL: {
        if (!isReadGoPlaygroundUrlArgs(args)) {
          return createErrorResponse(
            createGoPlaygroundError(
              'Invalid arguments for read_go_playground_url',
              GoPlaygroundErrorCode.VALIDATION_ERROR
            )
          );
        }
        return await handlers[TOOL_NAMES.READ_GO_PLAYGROUND_URL](args);
      }

      case TOOL_NAMES.EXECUTE_GO_PLAYGROUND_URL: {
        if (!isExecuteGoPlaygroundUrlArgs(args)) {
          return createErrorResponse(
            createGoPlaygroundError(
              'Invalid arguments for execute_go_playground_url',
              GoPlaygroundErrorCode.VALIDATION_ERROR
            )
          );
        }
        return await handlers[TOOL_NAMES.EXECUTE_GO_PLAYGROUND_URL](args);
      }

      default:
        return assertNever(toolName);
    }
  };
};

// Server setup functions
const setupToolHandlers = (
  server: Server,
  router: ReturnType<typeof createToolRouter>
) => {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: createToolDefinitions(),
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    try {
      // Validate tool name
      if (!isValidToolName(name)) {
        return createErrorResponse(
          createGoPlaygroundError(
            `Unknown tool: ${String(name)}`,
            GoPlaygroundErrorCode.VALIDATION_ERROR
          )
        );
      }

      // Route to appropriate handler
      return await router(name, args);
    } catch (error) {
      return createErrorResponse(error);
    }
  });
};

// Main server creation function
export const createMCPServer = (config: Partial<ServerConfig> = {}) => {
  const finalConfig = { ...defaultServerConfig, ...config };
  const client = createGoPlaygroundClient();
  const router = createToolRouter(client);

  const server = new Server(
    {
      name: finalConfig.name,
      version: finalConfig.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  setupToolHandlers(server, router);

  const run = async (): Promise<void> => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Go Playground MCP Server started');
  };

  return { server, run };
};

// Default server instance
export const defaultMCPServer = createMCPServer();

// Main run function for the default server
export const runMCPServer = defaultMCPServer.run;
