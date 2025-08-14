/**
 * Advanced Workflow Examples
 * Demonstrates handoffs, guardrails, tracing, and complex compositions
 */

import {
  createAgent,
  createHandoffChain,
  delegateTo,
  completeHandoff,
  createGuardrail,
  validators,
  withGuardrails,
  createTracer,
  withTracing,
  createTool,
  createToolRegistry,
  withMiddleware,
  toolMiddleware,
  createStateMachine,
  pipe,
  compose,
  withOpenAI,
  createOpenAIClient,
} from '../index.js';

// Example 1: Multi-Agent Workflow with Handoffs
const triageAgent = createAgent({
  name: 'Triage',
  instructions: 'You analyze user requests and route them to the appropriate specialist.',
  model: 'gpt-3.5-turbo',
});

const technicalAgent = createAgent({
  name: 'Technical',
  instructions: 'You handle technical questions and provide detailed explanations.',
  model: 'gpt-4',
});

const creativeAgent = createAgent({
  name: 'Creative',
  instructions: 'You handle creative tasks like writing, brainstorming, and design.',
  model: 'gpt-4',
  temperature: 0.9,
});

// Create handoff logic
const createTriageHandoff = (message) => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('code') || lowerMessage.includes('technical')) {
    return delegateTo('Technical', message, { category: 'technical' });
  } else if (lowerMessage.includes('write') || lowerMessage.includes('creative')) {
    return delegateTo('Creative', message, { category: 'creative' });
  }
  
  return completeHandoff(`I can help you with that: ${message}`);
};

// Create the handoff chain
const workflowChain = createHandoffChain(
  triageAgent,
  technicalAgent,
  creativeAgent
);

// Example 2: Guardrails for Safe Agent Execution
const safetyGuardrail = createGuardrail({
  name: 'safety',
  inputValidator: compose(
    validators.required,
    validators.maxLength(1000),
    validators.safeContent
  ),
  outputValidator: compose(
    validators.noPersonalInfo,
    validators.maxLength(2000)
  ),
  onInputError: (result) => {
    console.error('Input validation failed:', result.errors);
  },
  onOutputError: (result) => {
    console.error('Output validation failed:', result.errors);
  },
});

// Apply guardrails to agents
const safeAgent = withGuardrails(technicalAgent, safetyGuardrail);

// Example 3: Advanced Tool Composition with Middleware
const searchTool = createTool({
  name: 'search',
  description: 'Search for information',
  parameters: {
    query: { type: 'string', required: true },
    limit: { type: 'number', required: false },
  },
  execute: async ({ query, limit = 10 }) => {
    // Simulated search
    return {
      results: Array(limit).fill(null).map((_, i) => ({
        title: `Result ${i + 1} for "${query}"`,
        url: `https://example.com/result${i + 1}`,
      })),
    };
  },
});

// Apply multiple middleware
const enhancedSearchTool = pipe(
  (tool) => withMiddleware(tool, toolMiddleware.withLogging()),
  (tool) => withMiddleware(tool, toolMiddleware.withCache(60000)),
  (tool) => withMiddleware(tool, toolMiddleware.withRetry(3)),
  (tool) => withMiddleware(tool, toolMiddleware.withTimeout(5000))
)(searchTool);

// Tool registry with enhanced tools
const toolRegistry = createToolRegistry([
  enhancedSearchTool,
  createTool({
    name: 'calculate',
    description: 'Perform calculations',
    parameters: { expression: { type: 'string', required: true } },
    execute: async ({ expression }) => eval(expression),
  }),
]);

// Example 4: Comprehensive Tracing and Monitoring
const tracer = createTracer({
  enabled: true,
  formatter: (event) => {
    const { type, name, timestamp, metadata } = event;
    return `[${new Date(timestamp).toISOString()}] ${type}: ${name} ${
      metadata.duration ? `(${metadata.duration}ms)` : ''
    }`;
  },
});

// Create traced agents
const tracedWorkflow = pipe(
  (agent) => withTracing(agent, tracer),
  (agent) => agent.withTools([enhancedSearchTool])
);

const monitoredTriageAgent = tracedWorkflow(triageAgent);
const monitoredTechnicalAgent = tracedWorkflow(technicalAgent);

// Example 5: State Machine for Complex Workflows
const workflowStateMachine = createStateMachine({
  initial: 'idle',
  context: {
    messages: [],
    currentAgent: null,
    attempts: 0,
  },
  states: {
    idle: {
      on: {
        START: {
          target: 'triaging',
          actions: [(ctx, event) => ({
            ...ctx,
            messages: [event.message],
            attempts: 0,
          })],
        },
      },
    },
    triaging: {
      entry: (ctx) => console.log('Starting triage...'),
      on: {
        ROUTE_TECHNICAL: {
          target: 'processing_technical',
          actions: [(ctx) => ({ ...ctx, currentAgent: 'technical' })],
        },
        ROUTE_CREATIVE: {
          target: 'processing_creative',
          actions: [(ctx) => ({ ...ctx, currentAgent: 'creative' })],
        },
        COMPLETE: 'completed',
      },
    },
    processing_technical: {
      on: {
        SUCCESS: 'completed',
        ERROR: {
          target: 'error_recovery',
          guard: (ctx) => ctx.attempts < 3,
        },
      },
    },
    processing_creative: {
      on: {
        SUCCESS: 'completed',
        ERROR: {
          target: 'error_recovery',
          guard: (ctx) => ctx.attempts < 3,
        },
      },
    },
    error_recovery: {
      entry: (ctx) => ({ ...ctx, attempts: ctx.attempts + 1 }),
      on: {
        RETRY: 'triaging',
        FAIL: 'failed',
      },
    },
    completed: {
      entry: (ctx) => console.log('Workflow completed successfully'),
    },
    failed: {
      entry: (ctx) => console.log('Workflow failed after', ctx.attempts, 'attempts'),
    },
  },
});

// Example 6: Functional Composition of Complex Behaviors
const createIntelligentRouter = (rules) => (message, context) => {
  const scores = rules.map(rule => ({
    agent: rule.agent,
    score: rule.scorer(message, context),
  }));
  
  const bestMatch = scores.reduce((best, current) =>
    current.score > best.score ? current : best
  );
  
  return bestMatch.score > 0.5
    ? delegateTo(bestMatch.agent, message)
    : completeHandoff('I can help with general questions.');
};

const intelligentRouter = createIntelligentRouter([
  {
    agent: 'Technical',
    scorer: (msg) => {
      const technicalKeywords = ['code', 'programming', 'debug', 'error', 'api'];
      const matches = technicalKeywords.filter(kw => msg.toLowerCase().includes(kw));
      return matches.length / technicalKeywords.length;
    },
  },
  {
    agent: 'Creative',
    scorer: (msg) => {
      const creativeKeywords = ['write', 'design', 'create', 'imagine', 'story'];
      const matches = creativeKeywords.filter(kw => msg.toLowerCase().includes(kw));
      return matches.length / creativeKeywords.length;
    },
  },
]);

// Example 7: Advanced Agent Composition Pattern
const createSupervisedAgent = ({ agent, supervisor, reviewThreshold = 0.8 }) => {
  return {
    ...agent,
    process: async (messages, context) => {
      // First, get the agent's response
      const agentResult = await agent.process(messages, context);
      
      // Check if supervision is needed
      const confidence = agentResult.metadata?.confidence || 1.0;
      
      if (confidence < reviewThreshold) {
        // Have supervisor review
        const reviewMessages = [
          ...messages,
          {
            role: 'system',
            content: `Review this response: ${agentResult.messages[agentResult.messages.length - 1].content}`,
          },
        ];
        
        const supervisorResult = await supervisor.process(reviewMessages, {
          ...context,
          reviewing: true,
        });
        
        return {
          ...agentResult,
          reviewed: true,
          finalResponse: supervisorResult.messages[supervisorResult.messages.length - 1].content,
        };
      }
      
      return agentResult;
    },
  };
};

// Example 8: Functional Error Handling and Recovery
const withErrorRecovery = (fallbackAgent) => (agent) => ({
  ...agent,
  process: async (messages, context) => {
    try {
      return await agent.process(messages, context);
    } catch (error) {
      console.error(`Error in ${agent.name}:`, error);
      
      // Fallback to another agent
      const fallbackMessages = [
        ...messages,
        {
          role: 'system',
          content: `Previous agent failed with error: ${error.message}. Please provide assistance.`,
        },
      ];
      
      return await fallbackAgent.process(fallbackMessages, context);
    }
  },
});

// Example 9: Complete Workflow with All Features
async function runCompleteWorkflow() {
  const client = createOpenAIClient();
  
  // Create enhanced agents
  const enhancedTriage = pipe(
    (agent) => withOpenAI(agent, client),
    (agent) => withTracing(agent, tracer),
    (agent) => withGuardrails(agent, safetyGuardrail),
    (agent) => withErrorRecovery(creativeAgent)(agent)
  )(triageAgent);
  
  const enhancedTechnical = pipe(
    (agent) => withOpenAI(agent, client),
    (agent) => withTracing(agent, tracer),
    (agent) => agent.withTools(toolRegistry.getAll())
  )(technicalAgent);
  
  // Create supervised technical agent
  const supervisedTechnical = createSupervisedAgent({
    agent: enhancedTechnical,
    supervisor: enhancedTriage,
    reviewThreshold: 0.7,
  });
  
  // Process a message through the workflow
  const result = await enhancedTriage.process([
    { role: 'user', content: 'Can you help me debug this Python code?' }
  ]);
  
  // Analyze traces
  const traces = tracer.getTraces();
  console.log(`Workflow completed with ${traces.length} trace events`);
  
  return result;
}

// Example 10: Functional Workflow Builder
const createWorkflowBuilder = () => {
  const steps = [];
  
  const builder = {
    addAgent: (agent, condition = () => true) => {
      steps.push({ type: 'agent', agent, condition });
      return builder;
    },
    
    addGuardrail: (guardrail) => {
      steps.push({ type: 'guardrail', guardrail });
      return builder;
    },
    
    addTransform: (transform) => {
      steps.push({ type: 'transform', transform });
      return builder;
    },
    
    build: () => async (input, context = {}) => {
      let current = input;
      
      for (const step of steps) {
        if (step.type === 'agent' && step.condition(current, context)) {
          current = await step.agent.process(current, context);
        } else if (step.type === 'guardrail') {
          const validation = step.guardrail.validateInput(current);
          if (!validation.isValid) {
            throw new Error(`Guardrail failed: ${validation.errors.join(', ')}`);
          }
        } else if (step.type === 'transform') {
          current = step.transform(current);
        }
      }
      
      return current;
    },
  };
  
  return builder;
};

// Build a complex workflow
const complexWorkflow = createWorkflowBuilder()
  .addGuardrail(safetyGuardrail)
  .addAgent(triageAgent)
  .addTransform((result) => ({
    ...result,
    timestamp: new Date().toISOString(),
  }))
  .addAgent(technicalAgent, (_, ctx) => ctx.category === 'technical')
  .addAgent(creativeAgent, (_, ctx) => ctx.category === 'creative')
  .build();

// Export for use
export {
  workflowChain,
  safeAgent,
  toolRegistry,
  workflowStateMachine,
  intelligentRouter,
  createSupervisedAgent,
  runCompleteWorkflow,
  complexWorkflow,
  createWorkflowBuilder,
};