import type { AgentContext, Middleware, Tool } from '../types/index.js';
export declare const withSystem: (system: string) => Middleware;
export declare const withTools: (tools: Tool[]) => Middleware;
export declare const withLogging: (logger: AgentContext["logger"]) => Middleware;
export declare const withMemory: () => Middleware;
//# sourceMappingURL=middleware.d.ts.map