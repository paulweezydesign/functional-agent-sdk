# Functional Agent SDK (JavaScript / TypeScript)

Composable, functional agent primitives with an OpenAI provider.

## Install

```bash
npm i
```

Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.

## Build and run example

```bash
npm run build
npm run example
```

## Core ideas
- Pure functions and middlewares compose via `compose(...)`
- Providers expose a `generate` function compatible with `createAgent`
- Tools and memory are opt-in middlewares

## Minimal usage
```ts
import { createAgent, send, compose, withSystem } from 'functional-agent-sdk';
import { createOpenAIGenerate } from 'functional-agent-sdk/openai';

const agent = compose(withSystem('You are helpful.'))(
  createAgent({ modelGenerate: createOpenAIGenerate({ model: 'gpt-4o-mini' }) })
);

const out = await send(agent, 'Hello');
console.log(out.messages.at(-1)?.content);
```
