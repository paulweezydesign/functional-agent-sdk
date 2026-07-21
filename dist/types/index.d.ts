export type ToolRun<Input, Output> = (args: Input) => Promise<Output> | Output;
export type Tool<Input = unknown, Output = unknown> = {
    name: string;
    description?: string;
    run: ToolRun<Input, Output>;
};
export type Message = {
    role: 'system';
    content: string;
} | {
    role: 'user';
    content: string;
} | {
    role: 'assistant';
    content: string;
} | {
    role: 'tool';
    toolName: string;
    content: string;
};
export type ModelGenerate = (params: {
    messages: Message[];
    tools?: Tool[];
    maxTokens?: number;
    temperature?: number;
    stop?: string[];
    stream?: boolean;
    onToken?: (token: string) => void;
}) => Promise<{
    content: string;
    toolCalls?: Array<{
        name: string;
        args: unknown;
    }>;
}>;
export type AgentContext = {
    id: string;
    messages: Message[];
    render?: (messages: Message[]) => string;
    logger?: {
        info: (o: unknown, msg?: string) => void;
        error: (o: unknown, msg?: string) => void;
    };
    tools?: Tool[];
};
export type Agent = (context: AgentContext) => Promise<AgentContext>;
export type Middleware = (next: Agent) => Agent;
export type Pipeline = (agent: Agent) => Agent;
//# sourceMappingURL=index.d.ts.map