import type { Agent, AgentContext, Message, ModelGenerate, Tool } from '../types/index.js';
export type CreateAgentOptions = {
    modelGenerate: ModelGenerate;
    system?: string;
    render?: (messages: Message[]) => string;
    tools?: Tool[];
    logger?: AgentContext['logger'];
};
export declare const createAgent: (options: CreateAgentOptions) => Agent;
export declare const send: (agent: Agent, input: string, base?: Partial<AgentContext>) => Promise<AgentContext>;
//# sourceMappingURL=agent.d.ts.map