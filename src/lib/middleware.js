/**
 * Helper to compose middlewares in functional style.
 * Middleware signature: (next) => async (messages, extra) => result
 * @param  {...Function} middlewares 
 */
export const composeMiddlewares = (...middlewares) => middlewares;

/**
 * Example logging middleware.
 */
export const logger = (loggerFn = console.log) => (next) => async (messages, extra) => {
  loggerFn('>> Request', { messages, extra });
  const result = await next(messages, extra);
  loggerFn('<< Response', result);
  return result;
};