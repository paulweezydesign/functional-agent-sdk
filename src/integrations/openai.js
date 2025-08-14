/**
 * OpenAI Integration Module
 * Connects the functional agent SDK with OpenAI's API
 */

import OpenAI from 'openai';

// Create OpenAI client factory
export const createOpenAIClient = (config = {}) => {
  const client = new OpenAI({
    apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    ...config,
  });
  
  return client;
};

// Create an OpenAI-powered agent executor
export const createOpenAIExecutor = (client) => async (agent, messages, context = {}) => {
  const { tools = [], model, temperature, maxTokens, responseFormat } = agent;
  
  // Convert tools to OpenAI format
  const openaiTools = tools.map(tool => ({
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
  }));
  
  // Build the messages with system prompt
  const systemMessage = {
    role: 'system',
    content: agent.instructions,
  };
  
  const allMessages = [systemMessage, ...messages];
  
  // Make the API call
  const completion = await client.chat.completions.create({
    model,
    messages: allMessages,
    temperature,
    max_tokens: maxTokens,
    response_format: responseFormat,
    tools: openaiTools.length > 0 ? openaiTools : undefined,
    tool_choice: openaiTools.length > 0 ? 'auto' : undefined,
  });
  
  const message = completion.choices[0].message;
  
  // Handle tool calls if any
  if (message.tool_calls) {
    const toolResults = await executeToolCalls(message.tool_calls, tools);
    
    return {
      message,
      toolResults,
      usage: completion.usage,
    };
  }
  
  return {
    message,
    usage: completion.usage,
  };
};

// Execute tool calls
const executeToolCalls = async (toolCalls, availableTools) => {
  const toolMap = new Map(availableTools.map(t => [t.name, t]));
  const results = [];
  
  for (const toolCall of toolCalls) {
    const tool = toolMap.get(toolCall.function.name);
    
    if (!tool) {
      results.push({
        toolCallId: toolCall.id,
        error: `Tool ${toolCall.function.name} not found`,
      });
      continue;
    }
    
    try {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await tool.execute(args);
      
      results.push({
        toolCallId: toolCall.id,
        result,
      });
    } catch (error) {
      results.push({
        toolCallId: toolCall.id,
        error: error.message,
      });
    }
  }
  
  return results;
};

// Create an enhanced agent with OpenAI execution
export const withOpenAI = (agent, client) => ({
  ...agent,
  
  process: async (messages, context = {}) => {
    const executor = createOpenAIExecutor(client);
    const result = await executor(agent, messages, context);
    
    // Build response
    const response = {
      agent: agent.name,
      messages: [...messages, result.message],
      toolResults: result.toolResults,
      usage: result.usage,
      context: { ...context },
      timestamp: new Date().toISOString(),
    };
    
    // If there were tool calls, we need to send the results back
    if (result.toolResults && result.toolResults.length > 0) {
      const toolMessages = result.toolResults.map(tr => ({
        role: 'tool',
        tool_call_id: tr.toolCallId,
        content: tr.error || JSON.stringify(tr.result),
      }));
      
      // Make another call with tool results
      const followUp = await executor(agent, [...messages, result.message, ...toolMessages], context);
      
      return {
        ...response,
        messages: [...response.messages, ...toolMessages, followUp.message],
        usage: {
          prompt_tokens: (result.usage?.prompt_tokens || 0) + (followUp.usage?.prompt_tokens || 0),
          completion_tokens: (result.usage?.completion_tokens || 0) + (followUp.usage?.completion_tokens || 0),
          total_tokens: (result.usage?.total_tokens || 0) + (followUp.usage?.total_tokens || 0),
        },
      };
    }
    
    return response;
  },
});

// Streaming support
export const createStreamingExecutor = (client) => async function* (agent, messages, context = {}) {
  const { tools = [], model, temperature, maxTokens, responseFormat } = agent;
  
  // Convert tools to OpenAI format
  const openaiTools = tools.map(tool => ({
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
  }));
  
  // Build the messages with system prompt
  const systemMessage = {
    role: 'system',
    content: agent.instructions,
  };
  
  const allMessages = [systemMessage, ...messages];
  
  // Create the stream
  const stream = await client.chat.completions.create({
    model,
    messages: allMessages,
    temperature,
    max_tokens: maxTokens,
    response_format: responseFormat,
    tools: openaiTools.length > 0 ? openaiTools : undefined,
    tool_choice: openaiTools.length > 0 ? 'auto' : undefined,
    stream: true,
  });
  
  // Process the stream
  let content = '';
  let toolCalls = [];
  
  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta;
    
    if (delta.content) {
      content += delta.content;
      yield {
        type: 'content',
        content: delta.content,
      };
    }
    
    if (delta.tool_calls) {
      // Handle streaming tool calls
      for (const toolCall of delta.tool_calls) {
        if (!toolCalls[toolCall.index]) {
          toolCalls[toolCall.index] = {
            id: toolCall.id,
            type: 'function',
            function: { name: '', arguments: '' },
          };
        }
        
        if (toolCall.function?.name) {
          toolCalls[toolCall.index].function.name = toolCall.function.name;
        }
        
        if (toolCall.function?.arguments) {
          toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
        }
      }
      
      yield {
        type: 'tool_calls',
        toolCalls: [...toolCalls],
      };
    }
  }
  
  // Execute tool calls if any
  if (toolCalls.length > 0) {
    const toolResults = await executeToolCalls(toolCalls, tools);
    yield {
      type: 'tool_results',
      toolResults,
    };
  }
  
  yield {
    type: 'done',
    message: {
      role: 'assistant',
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
  };
};

// Create a streaming agent
export const withStreaming = (agent, client) => ({
  ...agent,
  
  stream: async function* (messages, context = {}) {
    const executor = createStreamingExecutor(client);
    
    yield* executor(agent, messages, context);
  },
});

// Batch processing for multiple agents
export const createBatchProcessor = (client) => async (agents, messages, context = {}) => {
  const executor = createOpenAIExecutor(client);
  
  // Process all agents in parallel
  const results = await Promise.all(
    agents.map(agent => executor(agent, messages, context))
  );
  
  return results.map((result, index) => ({
    agent: agents[index].name,
    result,
  }));
};

// Token counting utilities
export const estimateTokens = (messages, model = 'gpt-4') => {
  // Simplified token estimation
  // In production, use tiktoken or similar library
  const text = messages.map(m => m.content || '').join(' ');
  const wordCount = text.split(/\s+/).length;
  
  // Rough estimate: 1 word ≈ 1.3 tokens
  return Math.ceil(wordCount * 1.3);
};

// Cost estimation
export const estimateCost = (usage, model = 'gpt-4') => {
  const pricing = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };
  
  const modelPricing = pricing[model] || pricing['gpt-4'];
  
  const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
  const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    tokens: usage.total_tokens,
  };
};