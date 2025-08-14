import { nanoid } from 'nanoid';
import type { Agent, AgentContext, Message, ModelGenerate, Tool } from '../types/index.js';

export type CreateAgentOptions = {
	modelGenerate: ModelGenerate;
	system?: string;
	render?: (messages: Message[]) => string;
	tools?: Tool[];
	logger?: AgentContext['logger'];
};

export const createAgent = (options: CreateAgentOptions): Agent => {
	const { modelGenerate, system, render, tools = [], logger } = options;

	return async (context: AgentContext): Promise<AgentContext> => {
		const id = context.id ?? nanoid();
		const messages: Message[] = [];
		if (system) messages.push({ role: 'system', content: system });
		messages.push(...context.messages);

		const effectiveTools: Tool[] = [...tools, ...(context.tools ?? [])];
		const result = await modelGenerate({ messages, tools: effectiveTools });
		const updated: AgentContext = {
			id,
			messages: [...messages, { role: 'assistant', content: result.content }],
			...(render ? { render } : {}),
			...(logger ? { logger } : {}),
			...(context.tools ? { tools: context.tools } : {}),
		};
		return updated;
	};
};

export const send = async (agent: Agent, input: string, base?: Partial<AgentContext>): Promise<AgentContext> => {
	const context: AgentContext = {
		id: base?.id ?? nanoid(),
		messages: [{ role: 'user', content: input }],
		...(base?.render ? { render: base.render } : {}),
		...(base?.logger ? { logger: base.logger } : {}),
		...(base?.tools ? { tools: base.tools } : {}),
	};
	return agent(context);
};