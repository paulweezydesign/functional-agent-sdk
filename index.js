/**
 * Functional OpenAI Agent SDK
 * A composable, functional approach to building AI agents
 */

// Core modules
export * from './src/core/agent.js';
export * from './src/core/handoff.js';
export * from './src/core/guardrails.js';
export * from './src/core/tools.js';
export * from './src/core/tracing.js';
export * from './src/core/state.js';

// Integrations
export * from './src/integrations/openai.js';

// Convenience re-exports
export { 
  createAgent,
  pipe,
  compose,
  curry,
} from './src/core/agent.js';

export {
  createHandoff,
  delegateTo,
  completeHandoff,
  createHandoffChain,
} from './src/core/handoff.js';

export {
  createGuardrail,
  validators,
  withGuardrails,
} from './src/core/guardrails.js';

export {
  createTool,
  middleware as toolMiddleware,
  createToolRegistry,
} from './src/core/tools.js';

export {
  createTracer,
  createLogger,
  withTracing,
} from './src/core/tracing.js';

export {
  createState,
  createStateMachine,
  memoize,
} from './src/core/state.js';

export {
  createOpenAIClient,
  withOpenAI,
  withStreaming,
} from './src/integrations/openai.js';