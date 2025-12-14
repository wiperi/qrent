# Fetch Available Gemini Model Names

This skill fetches all available Gemini models from Google GenAI API and provides detailed information about them.

## Task

Run the TypeScript script 

```TypeScript
/**
 * Script to list all available Gemini models from Google GenAI API
 *
 * Usage:
 *   tsx packages/frontend/scripts/list-available-models.ts
 */

import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

async function listAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in environment variables');
    process.exit(1);
  }

  console.log('🔍 Fetching available models from Google GenAI API...\n');

  try {
    const genAI = new GoogleGenAI({ apiKey });

    // List all available models using Pager
    const modelsPager = await genAI.models.list();

    // Collect all models from the pager
    const allModels: any[] = [];
    for await (const model of modelsPager) {
      allModels.push(model);
    }

    if (allModels.length === 0) {
      console.log('No models found.');
      return;
    }

    console.log(`✅ Found ${allModels.length} models:\n`);
    console.log('='.repeat(100));

    // Filter and categorize models
    const generateContentModels: any[] = [];
    const liveApiModels: any[] = [];
    const otherModels: any[] = [];

    for (const model of allModels) {
      const modelInfo = {
        name: model.name,
        displayName: model.displayName || 'N/A',
        supportedActions: model.supportedActions || [],
        description: model.description || 'No description',
      };

      // Categorize by supported actions (note: it's supportedActions, not supportedGenerationMethods)
      const actions = model.supportedActions || [];

      if (actions.includes('generateContent')) {
        generateContentModels.push(modelInfo);
      } else if (actions.includes('streamGenerateContent') || model.name.includes('live')) {
        liveApiModels.push(modelInfo);
      } else {
        otherModels.push(modelInfo);
      }
    }

    // Print models that support generateContent (what we need)
    console.log('\n📝 Models supporting "generateContent" (suitable for our use case):');
    console.log('-'.repeat(100));
    if (generateContentModels.length > 0) {
      generateContentModels.forEach((model, index) => {
        console.log(`\n${index + 1}. ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Supported Actions: ${model.supportedActions.join(', ')}`);
        console.log(`   Description: ${model.description}`);
      });
    } else {
      console.log('   None found');
    }

    // Print Live API models
    console.log('\n\n🎙️  Live API Models (not suitable for REST API):');
    console.log('-'.repeat(100));
    if (liveApiModels.length > 0) {
      liveApiModels.forEach((model, index) => {
        console.log(`\n${index + 1}. ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Supported Actions: ${model.supportedActions.join(', ')}`);
      });
    } else {
      console.log('   None found');
    }

    // Print other models
    if (otherModels.length > 0) {
      console.log('\n\n🔧 Other Models:');
      console.log('-'.repeat(100));
      otherModels.forEach((model, index) => {
        console.log(`\n${index + 1}. ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Supported Actions: ${model.supportedActions.join(', ')}`);
      });
    }

    // Generate array for code
    console.log('\n\n📋 Model names array (copy to your code):');
    console.log('='.repeat(100));
    console.log('const availableModels = [');
    generateContentModels.forEach(model => {
      const shortName = model.name.replace('models/', '');
      console.log(`  '${shortName}',`);
    });
    console.log('];');

    console.log('\n\n✨ Summary:');
    console.log(`   - Total models: ${allModels.length}`);
    console.log(`   - generateContent compatible: ${generateContentModels.length}`);
    console.log(`   - Live API models: ${liveApiModels.length}`);
    console.log(`   - Other models: ${otherModels.length}`);

  } catch (error: any) {
    console.error('❌ Error fetching models:', error);
    if (error.message) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
listAvailableModels();
```

## Instructions

1. **Check prerequisites**:
   - Verify that `GEMINI_API_KEY` is set in the environment variables (`.env` or `.env.local`)
   - If the API key is not found, inform the user that they need to set it

2. **Run the script**:
   - Execute the script using tsx: `tsx packages/frontend/scripts/list-available-models.ts`
   - The script will automatically load environment variables from `.env` and `.env.local`

3. **Interpret the results**:
   - The script categorizes models into three groups:
     - **generateContent compatible models**: These are suitable for REST API usage (our use case)
     - **Live API models**: These use WebSocket/streaming and are not suitable for REST API
     - **Other models**: Models with different capabilities

4. **Present the information**:
   - Show the total number of models found
   - Highlight the models that support "generateContent" (most relevant for the project)
   - Provide the model names array that can be copied to code
   - Include any relevant details like display names and descriptions

5. **Handle errors**:
   - If the script fails due to missing API key, clearly explain how to set it
   - If there are API errors, show the error message and suggest checking API key validity
   - If there are network issues, suggest checking internet connection

## Expected Output

The script will output:
- A list of all available models with their names, display names, and supported actions
- Models categorized by their capabilities
- A ready-to-use JavaScript array of model names
- A summary with counts of different model types

## Notes

- This script requires the `@google/genai` package to be installed
- The models list may change over time as Google updates their API
- The script filters models by their `supportedActions` property to determine compatibility
