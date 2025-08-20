// Branded types for better type safety
export type GoCode = string & { readonly __brand: 'GoCode' };
export type ShareId = string & { readonly __brand: 'ShareId' };
export type ShareUrl = string & { readonly __brand: 'ShareUrl' };

// Utility functions for branded types
export const createGoCode = (code: string): GoCode => code as GoCode;
export const createShareId = (id: string): ShareId => id as ShareId;
export const createShareUrl = (url: string): ShareUrl => url as ShareUrl;

// Event kind as strict literal type
export type EventKind = 'stdout' | 'stderr' | 'exit';

// Go Playground API response types using type aliases
export type GoPlaygroundEvent = {
  readonly Message: string;
  readonly Kind: EventKind;
  readonly Delay: number;
};

export type GoPlaygroundResponse = {
  readonly Errors: string;
  readonly Events?: readonly GoPlaygroundEvent[] | null;
  readonly Status: number;
  readonly IsTest: boolean;
  readonly TestsFailed: number;
  readonly VetOK?: boolean;
};

export type GoPlaygroundShareResponse = string; // The API returns just the share ID as a string

// Request types with strict validation
export type GoPlaygroundRunRequest = {
  readonly version: number;
  readonly body: GoCode;
  readonly withVet?: boolean;
};

export type GoPlaygroundShareRequest = {
  readonly body: GoCode;
};

// Result types as discriminated union for better type safety
export type MCPGoPlaygroundResult =
  | MCPGoPlaygroundSuccess
  | MCPGoPlaygroundFailure;

export type MCPGoPlaygroundSuccess = {
  readonly success: true;
  readonly output: string;
  readonly exitCode: number;
  readonly shareUrl?: ShareUrl;
};

export type MCPGoPlaygroundFailure = {
  readonly success: false;
  readonly errors: string;
  readonly exitCode?: number;
  readonly shareUrl?: ShareUrl;
};

// Configuration types with strict constraints
export type GoPlaygroundConfig = {
  readonly baseUrl: `https://${string}`;
  readonly frontendUrl: `https://${string}`;
  readonly timeout: number;
};

// Tool argument types with strict validation
export type RunGoCodeArgs = {
  readonly code: GoCode;
  readonly withVet?: boolean;
};

export type ShareGoCodeArgs = {
  readonly code: GoCode;
};

export type RunAndShareGoCodeArgs = {
  readonly code: GoCode;
  readonly withVet?: boolean;
};

// Tool names as const assertion with mapped types
export const TOOL_NAMES = {
  RUN_GO_CODE: 'run_go_code',
  SHARE_GO_CODE: 'share_go_code',
  RUN_AND_SHARE_GO_CODE: 'run_and_share_go_code',
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

// Error types with error codes using enums and functional error handling
export const GoPlaygroundErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  COMPILATION_ERROR: 'COMPILATION_ERROR',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SHARE_ERROR: 'SHARE_ERROR',
} as const;

export type GoPlaygroundErrorCodeType =
  (typeof GoPlaygroundErrorCode)[keyof typeof GoPlaygroundErrorCode];

// Error type using functional approach
export type GoPlaygroundError = {
  readonly name: 'GoPlaygroundError';
  readonly message: string;
  readonly code: GoPlaygroundErrorCodeType;
  readonly statusCode?: number;
};

// Error constructor function instead of class
export const createGoPlaygroundError = (
  message: string,
  code: GoPlaygroundErrorCodeType,
  statusCode?: number
): GoPlaygroundError => ({
  name: 'GoPlaygroundError',
  message,
  code,
  statusCode,
});

// Result type for error handling
export type Result<T, E = GoPlaygroundError> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

// Type guards for runtime validation using functional approach
export const isGoCode = (value: unknown): value is GoCode => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const isValidToolName = (value: unknown): value is ToolName => {
  return (
    typeof value === 'string' &&
    Object.values(TOOL_NAMES).includes(value as ToolName)
  );
};

export const isRunGoCodeArgs = (args: unknown): args is RunGoCodeArgs => {
  return (
    typeof args === 'object' &&
    args !== null &&
    'code' in args &&
    isGoCode((args as Record<string, unknown>).code) &&
    (!('withVet' in args) ||
      typeof (args as Record<string, unknown>).withVet === 'boolean')
  );
};

export const isShareGoCodeArgs = (args: unknown): args is ShareGoCodeArgs => {
  return (
    typeof args === 'object' &&
    args !== null &&
    'code' in args &&
    isGoCode((args as Record<string, unknown>).code)
  );
};

export const isRunAndShareGoCodeArgs = (
  args: unknown
): args is RunAndShareGoCodeArgs => {
  return (
    typeof args === 'object' &&
    args !== null &&
    'code' in args &&
    isGoCode((args as Record<string, unknown>).code) &&
    (!('withVet' in args) ||
      typeof (args as Record<string, unknown>).withVet === 'boolean')
  );
};

// Utility type for exhaustive switch statements
export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
};

// Functional validators
export const validateGoCode = (code: string): Result<GoCode> => {
  if (!isGoCode(code)) {
    return {
      success: false,
      error: createGoPlaygroundError(
        'Invalid Go code: code must be a non-empty string',
        GoPlaygroundErrorCode.VALIDATION_ERROR
      ),
    };
  }
  return { success: true, data: createGoCode(code) };
};

// Functional response processors
export type ProcessedOutput = {
  readonly output: string;
  readonly hasErrors: boolean;
};

export const processEvents = (
  events: readonly GoPlaygroundEvent[]
): ProcessedOutput => {
  if (!Array.isArray(events) || events.length === 0) {
    return { output: '', hasErrors: false };
  }

  const stdoutEvents = events.filter(
    (event): event is GoPlaygroundEvent & { Kind: 'stdout' } =>
      event &&
      typeof event === 'object' &&
      'Kind' in event &&
      event.Kind === 'stdout'
  );

  const stderrEvents = events.filter(
    (event): event is GoPlaygroundEvent & { Kind: 'stderr' } =>
      event &&
      typeof event === 'object' &&
      'Kind' in event &&
      event.Kind === 'stderr'
  );

  const output = stdoutEvents
    .map(event => event?.Message ?? '')
    .filter(message => message !== '')
    .join('');

  return {
    output,
    hasErrors: stderrEvents.length > 0,
  };
};
