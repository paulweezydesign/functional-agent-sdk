import type { Agent, Middleware, Pipeline } from '../types/index.js';
export declare const compose: (...middlewares: Middleware[]) => Pipeline;
export declare const apply: (agent: Agent, ...pipelines: Pipeline[]) => Agent;
//# sourceMappingURL=pipeline.d.ts.map