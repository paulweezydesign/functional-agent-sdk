# Functional Agent SDK (JavaScript)

A tiny functional layer atop the official `openai` JavaScript client. It embraces:

* Pure functions over classes
* Composable middleware pipeline (inspired by Koa / Redux)
* Modern ECMAScript modules (ESM)

## Quick Start

```bash
npm install functional-agent-sdk openai dotenv
```

```js
import { createAgent } from 'functional-agent-sdk';
import { logger } from 'functional-agent-sdk/lib/middleware.js';

const run = createAgent({
  model: 'gpt-4o',
  middlewares: [logger()],
});

const response = await run([
  { role: 'user', content: 'Hello! How are you?' },
]);

console.log(response.content);
```

## Middleware Pattern

A middleware is just a higher-order async function:

```js
const myMiddleware = (next) => async (messages, extra) => {
  // do something before
  const result = await next(messages, extra);
  // mutate / side-effects after
  return result;
};
```

Chain as many as you like!