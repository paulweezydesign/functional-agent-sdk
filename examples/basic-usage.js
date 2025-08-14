/**
 * Basic Usage Examples
 * Demonstrates the functional and composable nature of the SDK
 */

import {
  createAgent,
  createOpenAIClient,
  withOpenAI,
  pipe,
  compose,
} from '../index.js';

// Example 1: Basic Agent Creation
const basicAgent = createAgent({
  name: 'Assistant',
  instructions: 'You are a helpful AI assistant.',
  model: 'gpt-4',
  temperature: 0.7,
});

// Example 2: Functional Composition
const enhancedAgent = pipe(
  (agent) => agent.withInstructions(
    (inst) => `${inst} Always be concise and clear.`
  ),
  (agent) => agent.withModel('gpt-4-turbo'),
  (agent) => agent.withTools([
    {
      name: 'calculate',
      description: 'Perform basic calculations',
      parameters: {
        expression: { type: 'string', required: true },
      },
      execute: async ({ expression }) => {
        // Safe eval for demo purposes
        try {
          return eval(expression);
        } catch (error) {
          return `Error: ${error.message}`;
        }
      },
    },
  ])
)(basicAgent);

// Example 3: Agent Templates and Specialization
const createSpecializedAssistant = (specialization) =>
  createAgent({
    name: `${specialization}Assistant`,
    instructions: `You are an expert ${specialization} assistant.`,
    model: 'gpt-4',
    temperature: 0.5,
  });

const coderAgent = createSpecializedAssistant('coding')
  .withInstructions((inst) => `${inst} Write clean, efficient code with comments.`)
  .withTools([
    {
      name: 'run_code',
      description: 'Execute code snippets',
      parameters: {
        language: { type: 'string', required: true },
        code: { type: 'string', required: true },
      },
      execute: async ({ language, code }) => {
        // Simulated code execution
        return `Executed ${language} code: ${code.substring(0, 50)}...`;
      },
    },
  ]);

// Example 4: Composing Multiple Agents
const researchAgent = createAgent({
  name: 'Researcher',
  instructions: 'You gather and analyze information.',
  model: 'gpt-4',
});

const writerAgent = createAgent({
  name: 'Writer',
  instructions: 'You write clear, engaging content based on research.',
  model: 'gpt-4',
});

// Compose agents functionally
const createResearchWritingPipeline = compose(
  (agents) => agents.map(agent => agent.withModel('gpt-4-turbo')),
  (agents) => agents.map(agent => agent.withTemperature(0.7))
);

const pipeline = createResearchWritingPipeline([researchAgent, writerAgent]);

// Example 5: Using with OpenAI
async function demonstrateOpenAIIntegration() {
  const client = createOpenAIClient({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Enhance agent with OpenAI capabilities
  const aiAgent = withOpenAI(basicAgent, client);
  
  // Process a message
  const result = await aiAgent.process([
    { role: 'user', content: 'What is functional programming?' }
  ]);
  
  console.log('AI Response:', result.messages[result.messages.length - 1].content);
  console.log('Token Usage:', result.usage);
}

// Example 6: Functional Tool Composition
const createToolChain = (...tools) => ({
  execute: async (input) => {
    let result = input;
    for (const tool of tools) {
      result = await tool.execute(result);
    }
    return result;
  },
});

const preprocessTool = {
  execute: async (text) => text.trim().toLowerCase(),
};

const analyzeTool = {
  execute: async (text) => ({
    length: text.length,
    words: text.split(/\s+/).length,
  }),
};

const toolChain = createToolChain(preprocessTool, analyzeTool);

// Example 7: Higher-Order Agent Functions
const withLogging = (agent) => ({
  ...agent,
  process: async (messages, context) => {
    console.log(`[${agent.name}] Processing ${messages.length} messages`);
    const result = await agent.process(messages, context);
    console.log(`[${agent.name}] Completed processing`);
    return result;
  },
});

const withRetry = (maxAttempts = 3) => (agent) => ({
  ...agent,
  process: async (messages, context) => {
    let lastError;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await agent.process(messages, context);
      } catch (error) {
        lastError = error;
        console.log(`Attempt ${i + 1} failed, retrying...`);
      }
    }
    throw lastError;
  },
});

// Compose multiple enhancements
const robustAgent = pipe(
  withLogging,
  withRetry(3)
)(basicAgent);

// Example 8: Curried Functions for Partial Application
const createAgentWithDefaults = (defaults) => (config) =>
  createAgent({ ...defaults, ...config });

const createCompanyAgent = createAgentWithDefaults({
  model: 'gpt-4',
  temperature: 0.7,
  instructions: 'You represent our company. Be professional and helpful.',
});

const supportAgent = createCompanyAgent({
  name: 'Support',
  instructions: 'You handle customer support inquiries.',
});

// Example 9: Agent Transformation Pipeline
const agentPipeline = [
  (agent) => agent.withTemperature(0.5),
  (agent) => agent.withModel('gpt-4-turbo'),
  (agent) => withLogging(agent),
  (agent) => withRetry(2)(agent),
];

const transformAgent = (agent, transformations) =>
  transformations.reduce((acc, transform) => transform(acc), agent);

const finalAgent = transformAgent(basicAgent, agentPipeline);

// Example 10: Functional State Management with Agents
const createStatefulAgent = (agent, initialState = {}) => {
  let state = initialState;
  
  return {
    ...agent,
    getState: () => ({ ...state }),
    setState: (newState) => {
      state = { ...state, ...newState };
    },
    process: async (messages, context) => {
      const result = await agent.process(messages, {
        ...context,
        state,
      });
      
      // Update state based on result if needed
      if (result.newState) {
        state = { ...state, ...result.newState };
      }
      
      return result;
    },
  };
};

// Export examples for testing
export {
  basicAgent,
  enhancedAgent,
  coderAgent,
  pipeline,
  demonstrateOpenAIIntegration,
  toolChain,
  robustAgent,
  supportAgent,
  finalAgent,
  createStatefulAgent,
};