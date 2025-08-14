/**
 * Core Agent Module
 * Functional approach to creating and composing agents
 */

// Utility functions for functional composition
export const pipe = (...fns) => (value) =>
  fns.reduce((acc, fn) => fn(acc), value);

export const compose = (...fns) => (value) =>
  fns.reduceRight((acc, fn) => fn(acc), value);

export const curry = (fn) => (...args) =>
  args.length >= fn.length 
    ? fn(...args) 
    : curry(fn.bind(null, ...args));

// Agent factory function
export const createAgent = ({
  name,
  instructions,
  model = 'gpt-4',
  tools = [],
  temperature = 0.7,
  maxTokens = null,
  responseFormat = null,
}) => {
  // Return an immutable agent configuration
  const agent = Object.freeze({
    name,
    instructions,
    model,
    tools: Object.freeze([...tools]),
    temperature,
    maxTokens,
    responseFormat,
    
    // Pure function to process messages
    process: async (messages, context = {}) => {
      // This returns a new result without mutating anything
      return {
        agent: name,
        messages: [...messages],
        context: { ...context },
        timestamp: new Date().toISOString(),
      };
    },
    
    // Create a new agent with updated properties
    withTools: (newTools) => createAgent({
      name,
      instructions,
      model,
      tools: [...tools, ...newTools],
      temperature,
      maxTokens,
      responseFormat,
    }),
    
    withInstructions: (newInstructions) => createAgent({
      name,
      instructions: typeof newInstructions === 'function' 
        ? newInstructions(instructions)
        : newInstructions,
      model,
      tools,
      temperature,
      maxTokens,
      responseFormat,
    }),
    
    withModel: (newModel) => createAgent({
      name,
      instructions,
      model: newModel,
      tools,
      temperature,
      maxTokens,
      responseFormat,
    }),
  });
  
  return agent;
};

// Higher-order function to create specialized agents
export const createSpecializedAgent = (baseConfig) => (specialization) =>
  createAgent({
    ...baseConfig,
    ...specialization,
    instructions: `${baseConfig.instructions}\n\n${specialization.instructions || ''}`,
  });

// Agent combinator - combines multiple agents into a workflow
export const combineAgents = (...agents) => ({
  agents: Object.freeze(agents),
  
  // Process messages through all agents in sequence
  processSequential: async (messages, context = {}) => {
    let currentMessages = [...messages];
    let currentContext = { ...context };
    const results = [];
    
    for (const agent of agents) {
      const result = await agent.process(currentMessages, currentContext);
      results.push(result);
      
      // Pass the output to the next agent
      if (result.messages) {
        currentMessages = result.messages;
      }
      if (result.context) {
        currentContext = { ...currentContext, ...result.context };
      }
    }
    
    return {
      results: Object.freeze(results),
      finalMessages: Object.freeze(currentMessages),
      finalContext: Object.freeze(currentContext),
    };
  },
  
  // Process messages through agents in parallel
  processParallel: async (messages, context = {}) => {
    const results = await Promise.all(
      agents.map(agent => agent.process([...messages], { ...context }))
    );
    
    return {
      results: Object.freeze(results),
      messages: Object.freeze(messages),
      context: Object.freeze(context),
    };
  },
});

// Function to create agent from a template
export const fromTemplate = (template) => {
  const templates = {
    assistant: {
      name: 'Assistant',
      instructions: 'You are a helpful AI assistant.',
      model: 'gpt-4',
      temperature: 0.7,
    },
    coder: {
      name: 'Coder',
      instructions: 'You are an expert programmer. Write clean, efficient code.',
      model: 'gpt-4',
      temperature: 0.3,
    },
    creative: {
      name: 'Creative',
      instructions: 'You are a creative writer. Be imaginative and original.',
      model: 'gpt-4',
      temperature: 0.9,
    },
  };
  
  return createAgent(templates[template] || templates.assistant);
};

// Lens-like utilities for updating nested properties immutably
export const agentLens = {
  name: {
    get: (agent) => agent.name,
    set: (value) => (agent) => createAgent({ ...agent, name: value }),
  },
  instructions: {
    get: (agent) => agent.instructions,
    set: (value) => (agent) => createAgent({ ...agent, instructions: value }),
  },
  temperature: {
    get: (agent) => agent.temperature,
    set: (value) => (agent) => createAgent({ ...agent, temperature: value }),
  },
};

// Utility to apply multiple transformations
export const transformAgent = (agent, ...transformations) =>
  pipe(...transformations)(agent);