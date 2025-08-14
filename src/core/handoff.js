/**
 * Handoff Module
 * Functional approach to agent handoffs and communication
 */

// Handoff result types
export const HandoffType = Object.freeze({
  CONTINUE: 'continue',
  DELEGATE: 'delegate',
  COMPLETE: 'complete',
  ERROR: 'error',
});

// Create a handoff result
export const createHandoff = ({
  type,
  targetAgent = null,
  message = null,
  metadata = {},
}) => Object.freeze({
  type,
  targetAgent,
  message,
  metadata: Object.freeze({ ...metadata }),
  timestamp: new Date().toISOString(),
});

// Handoff predicates
export const isHandoff = (result) => 
  result && result.type && Object.values(HandoffType).includes(result.type);

export const isDelegation = (handoff) => 
  handoff?.type === HandoffType.DELEGATE;

export const isCompletion = (handoff) => 
  handoff?.type === HandoffType.COMPLETE;

export const isError = (handoff) => 
  handoff?.type === HandoffType.ERROR;

// Handoff creators - convenience functions
export const continueProcessing = (message, metadata = {}) =>
  createHandoff({
    type: HandoffType.CONTINUE,
    message,
    metadata,
  });

export const delegateTo = (targetAgent, message, metadata = {}) =>
  createHandoff({
    type: HandoffType.DELEGATE,
    targetAgent,
    message,
    metadata,
  });

export const completeHandoff = (message, metadata = {}) =>
  createHandoff({
    type: HandoffType.COMPLETE,
    message,
    metadata,
  });

export const errorHandoff = (error, metadata = {}) =>
  createHandoff({
    type: HandoffType.ERROR,
    message: error.message || String(error),
    metadata: { ...metadata, error },
  });

// Handoff router - determines which agent should handle a message
export const createRouter = (routes) => {
  const routeMap = new Map(
    routes.map(({ pattern, agent, condition }) => [
      pattern,
      { agent, condition },
    ])
  );

  return {
    route: (message, context = {}) => {
      for (const [pattern, { agent, condition }] of routeMap) {
        const matches = typeof pattern === 'function'
          ? pattern(message, context)
          : pattern instanceof RegExp
          ? pattern.test(message)
          : message.includes(pattern);

        if (matches) {
          if (!condition || condition(message, context)) {
            return delegateTo(agent, message, { matchedPattern: pattern });
          }
        }
      }
      
      return continueProcessing(message);
    },
    
    // Add a new route immutably
    withRoute: (pattern, agent, condition) =>
      createRouter([
        ...routes,
        { pattern, agent, condition },
      ]),
  };
};

// Handoff chain - processes handoffs through multiple agents
export const createHandoffChain = (...agents) => {
  const agentMap = new Map(agents.map(agent => [agent.name, agent]));

  return {
    process: async (initialMessage, context = {}) => {
      const history = [];
      let currentAgent = agents[0];
      let currentMessage = initialMessage;
      let currentContext = { ...context };
      
      while (currentAgent) {
        try {
          // Process with current agent
          const result = await currentAgent.process(
            [{ role: 'user', content: currentMessage }],
            currentContext
          );
          
          history.push({
            agent: currentAgent.name,
            input: currentMessage,
            output: result,
            timestamp: new Date().toISOString(),
          });

          // Check if result contains a handoff
          if (result.handoff && isHandoff(result.handoff)) {
            const handoff = result.handoff;
            
            if (isDelegation(handoff)) {
              // Find the target agent
              const nextAgent = agentMap.get(handoff.targetAgent);
              if (!nextAgent) {
                return {
                  success: false,
                  error: `Agent ${handoff.targetAgent} not found`,
                  history: Object.freeze(history),
                };
              }
              
              currentAgent = nextAgent;
              currentMessage = handoff.message || currentMessage;
              currentContext = { ...currentContext, ...handoff.metadata };
            } else if (isCompletion(handoff)) {
              // Chain completed successfully
              return {
                success: true,
                result: handoff.message,
                history: Object.freeze(history),
                finalContext: Object.freeze(currentContext),
              };
            } else if (isError(handoff)) {
              // Error occurred
              return {
                success: false,
                error: handoff.message,
                history: Object.freeze(history),
                errorMetadata: handoff.metadata,
              };
            }
          } else {
            // No handoff, assume completion
            return {
              success: true,
              result: result.messages?.[0]?.content || result,
              history: Object.freeze(history),
              finalContext: Object.freeze(currentContext),
            };
          }
        } catch (error) {
          history.push({
            agent: currentAgent.name,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
          
          return {
            success: false,
            error: error.message,
            history: Object.freeze(history),
          };
        }
      }
    },
    
    // Add an agent to the chain
    withAgent: (agent) =>
      createHandoffChain(...agents, agent),
  };
};

// Conditional handoff - delegates based on conditions
export const conditionalHandoff = (conditions) => (message, context) => {
  for (const { condition, agent, transform } of conditions) {
    if (condition(message, context)) {
      const transformedMessage = transform ? transform(message) : message;
      return delegateTo(agent, transformedMessage);
    }
  }
  
  return continueProcessing(message);
};

// Handoff middleware - wraps an agent to add handoff capabilities
export const withHandoffCapability = (agent, handoffLogic) => ({
  ...agent,
  process: async (messages, context = {}) => {
    const result = await agent.process(messages, context);
    
    // Apply handoff logic to determine next step
    const lastMessage = messages[messages.length - 1]?.content || '';
    const handoff = handoffLogic(lastMessage, { ...context, agentResult: result });
    
    return {
      ...result,
      handoff,
    };
  },
});

// Utility to create a handoff decision function
export const createHandoffDecision = (rules) => (message, context) => {
  const decisions = rules.map(rule => ({
    score: rule.score(message, context),
    handoff: rule.handoff,
  }));
  
  // Sort by score and take the highest
  const bestDecision = decisions
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  
  return bestDecision ? bestDecision.handoff : continueProcessing(message);
};