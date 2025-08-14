/**
 * Tools Module
 * Functional approach to tool definitions and execution
 */

// Tool type definition
export const createTool = ({
  name,
  description,
  parameters,
  execute,
  validate = () => ({ isValid: true }),
}) => Object.freeze({
  name,
  description,
  parameters: Object.freeze(parameters || {}),
  validate,
  execute,
  
  // Create a new tool with modified properties
  withName: (newName) => createTool({
    name: newName,
    description,
    parameters,
    execute,
    validate,
  }),
  
  withExecutor: (newExecutor) => createTool({
    name,
    description,
    parameters,
    execute: newExecutor,
    validate,
  }),
  
  withValidator: (newValidator) => createTool({
    name,
    description,
    parameters,
    execute,
    validate: newValidator,
  }),
});

// Tool combinator - creates a tool that executes multiple tools
export const combineTool = (...tools) => createTool({
  name: `combined_${tools.map(t => t.name).join('_')}`,
  description: `Executes tools: ${tools.map(t => t.name).join(', ')}`,
  parameters: tools.reduce((acc, tool) => ({ ...acc, ...tool.parameters }), {}),
  execute: async (params) => {
    const results = [];
    for (const tool of tools) {
      const result = await tool.execute(params);
      results.push({ tool: tool.name, result });
    }
    return results;
  },
});

// Parallel tool execution
export const parallelTool = (...tools) => createTool({
  name: `parallel_${tools.map(t => t.name).join('_')}`,
  description: `Executes tools in parallel: ${tools.map(t => t.name).join(', ')}`,
  parameters: tools.reduce((acc, tool) => ({ ...acc, ...tool.parameters }), {}),
  execute: async (params) => {
    const results = await Promise.all(
      tools.map(async (tool) => ({
        tool: tool.name,
        result: await tool.execute(params),
      }))
    );
    return results;
  },
});

// Conditional tool execution
export const conditionalTool = (condition, toolIfTrue, toolIfFalse = null) => createTool({
  name: `conditional_${toolIfTrue.name}`,
  description: `Conditionally executes ${toolIfTrue.name}`,
  parameters: { ...toolIfTrue.parameters, ...(toolIfFalse?.parameters || {}) },
  execute: async (params) => {
    const shouldExecute = typeof condition === 'function' ? condition(params) : condition;
    
    if (shouldExecute) {
      return await toolIfTrue.execute(params);
    } else if (toolIfFalse) {
      return await toolIfFalse.execute(params);
    }
    
    return null;
  },
});

// Tool middleware - wraps a tool with additional functionality
export const withMiddleware = (tool, middleware) => createTool({
  ...tool,
  execute: middleware(tool.execute),
});

// Common middleware functions
export const middleware = {
  // Logging middleware
  withLogging: (logger = console.log) => (execute) => async (params) => {
    logger(`Executing with params:`, params);
    const start = Date.now();
    try {
      const result = await execute(params);
      logger(`Completed in ${Date.now() - start}ms:`, result);
      return result;
    } catch (error) {
      logger(`Failed after ${Date.now() - start}ms:`, error);
      throw error;
    }
  },
  
  // Retry middleware
  withRetry: (maxAttempts = 3, delay = 1000) => (execute) => async (params) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await execute(params);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  },
  
  // Caching middleware
  withCache: (ttl = 60000) => {
    const cache = new Map();
    
    return (execute) => async (params) => {
      const key = JSON.stringify(params);
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.result;
      }
      
      const result = await execute(params);
      cache.set(key, { result, timestamp: Date.now() });
      
      return result;
    };
  },
  
  // Timeout middleware
  withTimeout: (ms) => (execute) => async (params) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
    
    return Promise.race([execute(params), timeout]);
  },
};

// Tool registry for managing available tools
export const createToolRegistry = (initialTools = []) => {
  const tools = new Map(initialTools.map(tool => [tool.name, tool]));
  
  return {
    // Register a tool
    register: (tool) => {
      const newTools = new Map(tools);
      newTools.set(tool.name, tool);
      return createToolRegistry(Array.from(newTools.values()));
    },
    
    // Get a tool by name
    get: (name) => tools.get(name),
    
    // Get all tools
    getAll: () => Array.from(tools.values()),
    
    // Execute a tool by name
    execute: async (name, params) => {
      const tool = tools.get(name);
      if (!tool) {
        throw new Error(`Tool ${name} not found`);
      }
      
      const validation = tool.validate(params);
      if (!validation.isValid) {
        throw new Error(`Invalid parameters: ${validation.errors?.join(', ')}`);
      }
      
      return await tool.execute(params);
    },
    
    // Create a subset registry
    subset: (...toolNames) => {
      const subsetTools = toolNames
        .map(name => tools.get(name))
        .filter(Boolean);
      return createToolRegistry(subsetTools);
    },
  };
};

// Built-in tools
export const builtInTools = {
  // Echo tool - returns the input
  echo: createTool({
    name: 'echo',
    description: 'Returns the input message',
    parameters: {
      message: { type: 'string', required: true },
    },
    execute: async ({ message }) => message,
  }),
  
  // Delay tool - waits for specified time
  delay: createTool({
    name: 'delay',
    description: 'Waits for specified milliseconds',
    parameters: {
      ms: { type: 'number', required: true },
    },
    execute: async ({ ms }) => {
      await new Promise(resolve => setTimeout(resolve, ms));
      return `Waited ${ms}ms`;
    },
  }),
  
  // Transform tool - applies a transformation
  transform: createTool({
    name: 'transform',
    description: 'Transforms input using a function',
    parameters: {
      input: { type: 'any', required: true },
      operation: { type: 'string', required: true },
    },
    execute: async ({ input, operation }) => {
      const operations = {
        uppercase: (s) => String(s).toUpperCase(),
        lowercase: (s) => String(s).toLowerCase(),
        reverse: (s) => String(s).split('').reverse().join(''),
        length: (s) => String(s).length,
      };
      
      const fn = operations[operation];
      if (!fn) {
        throw new Error(`Unknown operation: ${operation}`);
      }
      
      return fn(input);
    },
  }),
};

// Function to create a tool from an OpenAI function schema
export const fromOpenAISchema = (schema) => createTool({
  name: schema.name,
  description: schema.description,
  parameters: schema.parameters,
  execute: async (params) => {
    // This would be implemented to call the actual function
    return { name: schema.name, params };
  },
  validate: (params) => {
    // Basic validation based on schema
    const required = schema.parameters?.required || [];
    const missing = required.filter(key => !(key in params));
    
    if (missing.length > 0) {
      return {
        isValid: false,
        errors: missing.map(key => `Missing required parameter: ${key}`),
      };
    }
    
    return { isValid: true };
  },
});

// Utility to convert tools to OpenAI function format
export const toOpenAIFormat = (tool) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: tool.parameters,
      required: Object.entries(tool.parameters || {})
        .filter(([_, spec]) => spec.required)
        .map(([key]) => key),
    },
  },
});