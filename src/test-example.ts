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
    const initialShareUrl = await client.shareCode(testCode);
    console.log('Share URL:', initialShareUrl ?? 'Failed to generate');

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

    // Test reading from playground URL
    console.log('\n6. Testing URL reading functionality...');
    // First share some code to get a valid URL
    const shareUrl = await client.shareCode(testCode);
    if (shareUrl) {
      console.log('Testing with shared URL:', shareUrl);
      const readResult = await client.readUrl(shareUrl);
      if (readResult.success) {
        console.log('✅ Successfully read code from URL:', {
          codeLength: readResult.code.length,
          firstLine: readResult.code.split('\n')[0],
        });
      } else {
        console.log('❌ Failed to read from URL:', readResult.error);
      }

      // Test executing from playground URL
      console.log('\n7. Testing URL execution functionality...');
      const executeResult = await client.executeUrl(shareUrl);
      if (executeResult.success) {
        console.log('✅ Successfully executed code from URL:', {
          output: executeResult.output,
          exitCode: executeResult.exitCode,
        });
      } else {
        console.log('❌ Failed to execute from URL:', executeResult.errors);
      }
    } else {
      console.log('❌ Failed to create share URL for testing');
    }

    // Test invalid URL
    console.log('\n8. Testing invalid URL handling...');
    const invalidUrl = 'https://example.com/invalid';
    const invalidReadResult = await client.readUrl(invalidUrl);
    if (!invalidReadResult.success) {
      console.log('✅ Correctly handled invalid URL:', invalidReadResult.error);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGoPlayground().catch(console.error);
}
