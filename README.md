# Functional OpenAI Agent SDK

A modern, functional JavaScript implementation of an agent SDK inspired by OpenAI's design principles. Built with composability, immutability, and functional programming at its core.

## Features

- 🔧 **Functional Composition** - Build complex agents by composing simple functions
- 🔄 **Immutable State** - All operations return new instances, preventing side effects
- 🎯 **Type-Safe** - Designed with modern JavaScript features for better type inference
- 🔗 **Composable Middleware** - Add functionality through functional composition
- 🛡️ **Built-in Guardrails** - Input/output validation with functional validators
- 📊 **Comprehensive Tracing** - Track agent execution with functional middleware
- 🤝 **Agent Handoffs** - Seamlessly transfer control between specialized agents
- 🛠️ **Tool System** - Functional approach to tool definitions and execution
- 📦 **Zero Dependencies** - Core SDK has no external dependencies (except OpenAI client)

## Installation

```bash
npm install functional-openai-agent-sdk
```

## Quick Start

```javascript
import { createAgent, withOpenAI, createOpenAIClient } from 'functional-openai-agent-sdk';

// Create a basic agent
const agent = createAgent({
  name: 'Assistant',
  instructions: 'You are a helpful AI assistant.',
  model: 'gpt-4',
  temperature: 0.7,
});

// Connect to OpenAI
const client = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
const aiAgent = withOpenAI(agent, client);

// Process messages
const result = await aiAgent.process([
  { role: 'user', content: 'Hello, how can you help me?' }
]);
```

## Core Concepts

### 1. Functional Composition

Everything in this SDK is built on functional composition:

```javascript
import { pipe, compose } from 'functional-openai-agent-sdk';

// Pipe - left to right composition
const enhancedAgent = pipe(
  (agent) => agent.withTemperature(0.5),
  (agent) => agent.withModel('gpt-4-turbo'),
  (agent) => withLogging(agent),
  (agent) => withRetry(3)(agent)
)(baseAgent);

// Compose - right to left composition
const agentFactory = compose(
  withGuardrails(safetyRules),
  withTracing(tracer),
  withTools(toolRegistry)
);
```

### 2. Immutable Updates

All updates create new instances:

```javascript
const agent1 = createAgent({ name: 'Agent1', temperature: 0.7 });
const agent2 = agent1.withTemperature(0.5);

// agent1 is unchanged
console.log(agent1.temperature); // 0.7
console.log(agent2.temperature); // 0.5
```

### 3. Agent Creation

Agents are created using factory functions:

```javascript
// Basic agent
const agent = createAgent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant.',
  model: 'gpt-4',
  temperature: 0.7,
  tools: [],
});

// From template
const coder = fromTemplate('coder');

// Specialized agent factory
const createSpecialist = (domain) => createAgent({
  name: `${domain}Specialist`,
  instructions: `You are an expert in ${domain}.`,
  model: 'gpt-4',
});
```

### 4. Tools System

Tools are functional and composable:

```javascript
const searchTool = createTool({
  name: 'search',
  description: 'Search for information',
  parameters: {
    query: { type: 'string', required: true },
  },
  execute: async ({ query }) => {
    // Implementation
    return results;
  },
});

// Apply middleware
const enhancedTool = pipe(
  (tool) => withMiddleware(tool, toolMiddleware.withLogging()),
  (tool) => withMiddleware(tool, toolMiddleware.withCache(60000)),
  (tool) => withMiddleware(tool, toolMiddleware.withRetry(3))
)(searchTool);
```

### 5. Guardrails

Functional validation for inputs and outputs:

```javascript
const guardrail = createGuardrail({
  name: 'safety',
  inputValidator: compose(
    validators.required,
    validators.maxLength(1000),
    validators.safeContent
  ),
  outputValidator: validators.noPersonalInfo,
});

const safeAgent = withGuardrails(agent, guardrail);
```

### 6. Handoffs

Delegate work between agents:

```javascript
const router = createRouter([
  {
    pattern: /technical|code|programming/i,
    agent: 'TechnicalAgent',
  },
  {
    pattern: /creative|write|design/i,
    agent: 'CreativeAgent',
  },
]);

const handoffChain = createHandoffChain(
  triageAgent,
  technicalAgent,
  creativeAgent
);
```

### 7. State Management

Immutable state with functional updates:

```javascript
const state = createState({ count: 0, users: [] });

// Update state immutably
const newState = state
  .update({ count: 1 })
  .setIn(['users', 0], { name: 'Alice' });

// With lenses
const countLens = lenses.prop('count');
const incrementCount = countLens.modify(n => n + 1);
```

## Advanced Patterns

### Supervised Agents

```javascript
const supervisedAgent = createSupervisedAgent({
  agent: technicalAgent,
  supervisor: seniorAgent,
  reviewThreshold: 0.8,
});
```

### Workflow Builder

```javascript
const workflow = createWorkflowBuilder()
  .addGuardrail(inputValidation)
  .addAgent(triageAgent)
  .addTransform(addTimestamp)
  .addAgent(specialistAgent, (ctx) => ctx.needsSpecialist)
  .build();
```

### Streaming Support

```javascript
const streamingAgent = withStreaming(agent, client);

for await (const chunk of streamingAgent.stream(messages)) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content);
  }
}
```

## Examples

See the `/examples` directory for comprehensive examples:

- `basic-usage.js` - Basic agent creation and composition
- `advanced-workflows.js` - Complex workflows with handoffs and guardrails

## API Reference

### Core Functions

- `createAgent(config)` - Create a new agent
- `pipe(...fns)` - Left-to-right function composition
- `compose(...fns)` - Right-to-left function composition
- `curry(fn)` - Create a curried version of a function

### Agent Methods

- `agent.process(messages, context)` - Process messages
- `agent.withTools(tools)` - Add tools to agent
- `agent.withInstructions(instructions)` - Update instructions
- `agent.withModel(model)` - Change the model

### Middleware Functions

- `withOpenAI(agent, client)` - Add OpenAI integration
- `withTracing(agent, tracer)` - Add tracing
- `withGuardrails(agent, guardrail)` - Add validation
- `withRetry(attempts)(agent)` - Add retry logic

## Philosophy

This SDK embraces functional programming principles:

1. **Pure Functions** - Functions don't have side effects
2. **Immutability** - Data is never mutated
3. **Composition** - Build complex behavior from simple functions
4. **Higher-Order Functions** - Functions that operate on other functions
5. **Declarative** - Describe what you want, not how to do it

## Contributing

Contributions are welcome! Please ensure:

- Code follows functional programming principles
- All functions are pure when possible
- State mutations are avoided
- New features are composable

## License

MIT