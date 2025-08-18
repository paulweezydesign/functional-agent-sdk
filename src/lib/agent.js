import { OpenAI } from 'openai';

/**
 * Creates a stateless functional agent.
 * @param {Object} options
 * @param {string} options.model - The OpenAI model to use (e.g., 'gpt-4o')
 * @param {Array<Function>} [options.middlewares] - Middleware pipeline executed before invoking OpenAI.
 * @returns {Function} runAgent - A function that takes user input and returns assistant output.
 */
export function createAgent({ model = 'gpt-4o', middlewares = [] } = {}) {
  const client = new OpenAI();

  // compose middlewares into single function
  const applyMiddlewares = middlewares.reduceRight(
    (next, mw) => mw(next),
    async (messages, extra) => {
      // Base handler: call OpenAI chat completion
      const completion = await client.chat.completions.create({
        model,
        messages,
        ...extra,
      });
      return completion.choices[0].message;
    }
  );

  /**
   * Execute the agent with conversation messages.
   * @param {Array<{role: 'user'|'assistant'|'system', content: string}>} messages
   * @param {Object} [extraParams] - Passed directly to the OpenAI endpoint.
   * @returns {Promise<{role: string, content: string}>}
   */
  return function runAgent(messages, extraParams = {}) {
    return applyMiddlewares(messages, extraParams);
  };
}