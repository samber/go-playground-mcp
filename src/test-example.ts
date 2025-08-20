import { createGoPlaygroundClient } from './go-playground-client.js';
import { validateGoCode } from './types.js';

async function testGoPlayground(): Promise<void> {
  const client = createGoPlaygroundClient();

  // Using proper Go code type and validation
  const testCodeString = `package main

import "fmt"

func main() {
    fmt.Println("Hello from MCP Go Playground!")
}`;

  // Validate the code using functional approach
  const validationResult = validateGoCode(testCodeString);
  if (!validationResult.success) {
    console.error('Code validation failed:', validationResult.error.message);
    return;
  }

  const testCode = validationResult.data;

  console.log(
    'Testing Go Playground client with functional TypeScript patterns...\n'
  );

  try {
    // Test running code with proper typing
    console.log('1. Running code...');
    const runResult = await client.runCode(testCode);

    if (runResult.success) {
      console.log('✅ Success:', {
        output: runResult.output,
        exitCode: runResult.exitCode,
      });
    } else {
      console.log('❌ Failure:', {
        errors: runResult.errors,
        exitCode: runResult.exitCode,
      });
    }

    // Test sharing code with branded types
    console.log('\n2. Sharing code...');
    const shareUrl = await client.shareCode(testCode);
    console.log('Share URL:', shareUrl ?? 'Failed to generate');

    // Test run and share with discriminated union handling
    console.log('\n3. Running and sharing code...');
    const runAndShareResult = await client.runAndShare(testCode);

    // TypeScript can now properly narrow the type based on the success property
    if (runAndShareResult.success) {
      console.log('✅ Run and share success:', {
        output: runAndShareResult.output,
        exitCode: runAndShareResult.exitCode,
        shareUrl: runAndShareResult.shareUrl,
      });
    } else {
      console.log('❌ Run and share failure:', {
        errors: runAndShareResult.errors,
        exitCode: runAndShareResult.exitCode,
        shareUrl: runAndShareResult.shareUrl,
      });
    }

    // Demonstrate functional validation with invalid code
    console.log('\n4. Testing functional validation...');
    const invalidValidation = validateGoCode('');
    if (!invalidValidation.success) {
      console.log(
        'Expected validation error:',
        invalidValidation.error.message
      );
    }

    // Test with proper error handling
    console.log('\n5. Testing with malformed code...');
    const malformedCode = 'this is not valid go code';
    const malformedValidation = validateGoCode(malformedCode);
    if (malformedValidation.success) {
      const result = await client.runCode(malformedValidation.data);
      if (!result.success) {
        console.log(
          'Expected compilation error:',
          `${result.errors.substring(0, 100)}...`
        );
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGoPlayground().catch(console.error);
}
