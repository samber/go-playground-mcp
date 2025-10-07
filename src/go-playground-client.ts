import axios, { type AxiosInstance, type AxiosError } from 'axios';
import {
  type GoPlaygroundResponse,
  type GoPlaygroundShareResponse,
  type GoPlaygroundRunRequest,
  type GoPlaygroundShareRequest,
  type MCPGoPlaygroundResult,
  type MCPGoPlaygroundSuccess,
  type MCPGoPlaygroundFailure,
  type GoPlaygroundConfig,
  type ShareUrl,
  type GoPlaygroundError,
  createShareUrl,
  validateGoCode,
  processEvents,
  isGoPlaygroundUrl,
} from './types.js';

// Configuration with defaults
const createDefaultConfig = (): GoPlaygroundConfig => ({
  baseUrl: 'https://play.golang.org' as const,
  frontendUrl: 'https://go.dev/play' as const,
  timeout: 30000,
});

// HTTP client factory
const createHttpClient = (config: GoPlaygroundConfig): AxiosInstance =>
  axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: {
      'User-Agent': 'go-playground-mcp/1.0.0',
    },
  });

// Error handling utilities
const isAxiosError = (error: unknown): error is AxiosError =>
  axios.isAxiosError(error);

const isGoPlaygroundError = (error: unknown): error is GoPlaygroundError =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  error.name === 'GoPlaygroundError';

const handleApiError = (error: unknown): MCPGoPlaygroundFailure => {
  if (isAxiosError(error)) {
    const statusCode = error.response?.status;
    return {
      success: false,
      errors: `HTTP Error: ${statusCode ?? 'unknown'} - ${error.message}`,
    };
  }

  if (isGoPlaygroundError(error)) {
    return {
      success: false,
      errors: `GoPlayground Error [${error.code}]: ${error.message}`,
    };
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    errors: `Unexpected error: ${errorMessage}`,
  };
};

// Response processing functions
const processRunResponse = (
  result: GoPlaygroundResponse
): MCPGoPlaygroundResult => {
  // Validate response structure
  if (!result || typeof result !== 'object') {
    return {
      success: false,
      errors: 'Invalid response from Go Playground API',
    };
  }

  // Check for compilation errors (Errors field contains compilation errors)
  if (result.Errors && result.Errors.trim() !== '') {
    return {
      success: false,
      errors: result.Errors,
      exitCode: result.Status,
    };
  }

  // Check for runtime errors (runtime errors appear in Events with Kind: 'stderr')
  const stderrEvents =
    result.Events?.filter(event => event.Kind === 'stderr') ?? [];
  if (stderrEvents.length > 0) {
    const errorMessages = stderrEvents.map(event => event.Message).join('');
    return {
      success: false,
      errors: errorMessages,
      exitCode: result.Status,
    };
  }

  // Process output using functional approach
  const processedOutput = processEvents(result.Events ?? []);

  return {
    success: true,
    output: processedOutput.output,
    exitCode: result.Status,
  };
};

// Core API functions
export const runGoCode =
  (config: Partial<GoPlaygroundConfig> = {}) =>
  async (
    code: string,
    withVet: boolean = true
  ): Promise<MCPGoPlaygroundResult> => {
    // Validate input
    const validationResult = validateGoCode(code);
    if (!validationResult.success) {
      return {
        success: false,
        errors: validationResult.error.message,
      };
    }

    const finalConfig = { ...createDefaultConfig(), ...config };
    const client = createHttpClient(finalConfig);

    try {
      const request: GoPlaygroundRunRequest = {
        version: 2,
        body: validationResult.data,
        withVet,
      };

      const response = await client.post<GoPlaygroundResponse>(
        '/compile',
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Debug logging
      console.error(
        'Go Playground API Response:',
        JSON.stringify(response.data, null, 2)
      );

      return processRunResponse(response.data);
    } catch (error) {
      console.error('Go Playground API Error:', error);
      return handleApiError(error);
    }
  };

export const shareGoCode =
  (config: Partial<GoPlaygroundConfig> = {}) =>
  async (code: string): Promise<ShareUrl | null> => {
    // Validate input
    const validationResult = validateGoCode(code);
    if (!validationResult.success) {
      console.error(
        'Invalid Go code for sharing:',
        validationResult.error.message
      );
      return null;
    }

    const finalConfig = { ...createDefaultConfig(), ...config };
    const client = createHttpClient(finalConfig);

    try {
      const request: GoPlaygroundShareRequest = {
        body: validationResult.data,
      };

      const response = await client.post<GoPlaygroundShareResponse>(
        '/share',
        request.body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const shareId = response.data;
      // Use the frontend URL for sharing, not the API URL
      return createShareUrl(`${finalConfig.frontendUrl}/p/${shareId}`);
    } catch (error) {
      console.error('Failed to share code:', error);
      return null;
    }
  };

export const runAndShareGoCode =
  (config: Partial<GoPlaygroundConfig> = {}) =>
  async (
    code: string,
    withVet: boolean = true
  ): Promise<MCPGoPlaygroundResult> => {
    // Validate input once
    const validationResult = validateGoCode(code);
    if (!validationResult.success) {
      return {
        success: false,
        errors: validationResult.error.message,
      };
    }

    const validatedCode = validationResult.data;

    // Create functions with config
    const runCode = runGoCode(config);
    const shareCode = shareGoCode(config);

    // Execute both operations
    const runResult = await runCode(validatedCode, withVet);
    const shareUrl = await shareCode(validatedCode);

    // Merge results based on discriminated union
    if (runResult.success) {
      return {
        ...runResult,
        shareUrl: shareUrl ?? undefined,
      } satisfies MCPGoPlaygroundSuccess;
    } else {
      return {
        ...runResult,
        shareUrl: shareUrl ?? undefined,
      } satisfies MCPGoPlaygroundFailure;
    }
  };

// Factory function for creating a client with specific config
export const createGoPlaygroundClient = (
  config: Partial<GoPlaygroundConfig> = {}
) => ({
  runCode: runGoCode(config),
  shareCode: shareGoCode(config),
  runAndShare: runAndShareGoCode(config),
  readUrl: readGoPlaygroundUrl(config),
  executeUrl: executeGoPlaygroundUrl(config),
});

// Function to read code from playground URL
export const readGoPlaygroundUrl =
  (config: Partial<GoPlaygroundConfig> = {}) =>
  async (url: string): Promise<{ success: true; code: string } | { success: false; error: string }> => {
    // Validate URL
    if (!isGoPlaygroundUrl(url)) {
      return {
        success: false,
        error: 'Invalid Go Playground URL. Expected format: https://go.dev/play/xyz or https://play.golang.org/p/xyz',
      };
    }

    const finalConfig = { ...createDefaultConfig(), ...config };
    const client = createHttpClient(finalConfig);

    try {
      // Extract share ID from URL
      let shareId: string | null = null;
      if (url.includes('go.dev/play/')) {
        // Handles both go.dev/play/<id> and go.dev/play/p/<id>
        const after = url.split('go.dev/play/')[1];
        const parts = after.split('/').filter(Boolean);
        if (parts.length === 1) {
          shareId = parts[0];
        } else if (parts.length >= 2 && parts[0] === 'p') {
          shareId = parts[1];
        }
      } else if (url.includes('play.golang.org/p/')) {
        shareId = url.split('play.golang.org/p/')[1].split('/')[0];
      }

      if (!shareId) {
        return {
          success: false,
          error: 'Invalid Go Playground URL format',
        };
      }

      // Fetch the code from the playground
      const response = await client.get(`/p/${shareId}.go`);

      if (response.status !== 200) {
        return {
          success: false,
          error: `Failed to fetch code: HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        code: response.data,
      };
    } catch (error) {
      console.error('Failed to read playground URL:', error);
      if (isAxiosError(error)) {
        return {
          success: false,
          error: `Network error: ${error.message}`,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

// Function to execute code from playground URL
export const executeGoPlaygroundUrl =
  (config: Partial<GoPlaygroundConfig> = {}) =>
  async (url: string, withVet: boolean = true): Promise<MCPGoPlaygroundResult> => {
    // First read the code from the URL
    const readResult = await readGoPlaygroundUrl(config)(url);
    if (!readResult.success) {
      return {
        success: false,
        errors: readResult.error,
      };
    }

    // Then execute the code
    const runCode = runGoCode(config);
    return await runCode(readResult.code, withVet);
  };

// Default client for backward compatibility
export const defaultGoPlaygroundClient = createGoPlaygroundClient();

// Export individual functions for tree-shaking and functional composition
export {
  runGoCode as run,
  shareGoCode as share,
  runAndShareGoCode as runAndShare,
  readGoPlaygroundUrl as read,
  executeGoPlaygroundUrl as execute,
};
