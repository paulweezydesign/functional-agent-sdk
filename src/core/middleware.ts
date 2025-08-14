import type { Agent, AgentContext, Message, Middleware, Tool } from '../types/index.js';

export const withSystem = (system: string): Middleware => (next) => async (ctx) => {
	const updated: AgentContext = {
		...ctx,
		messages: [{ role: 'system', content: system }, ...ctx.messages],
	};
	return next(updated);
};

export const withTools = (tools: Tool[]): Middleware => (next) => async (ctx) => {
	(ctx as any).tools = [...((ctx as any).tools ?? []), ...tools];
	return next(ctx);
};

export const withLogging = (logger: AgentContext['logger']): Middleware => (next) => async (ctx) => {
	logger?.info({ messages: ctx.messages }, 'agent:input');
	const out = await next(ctx);
	logger?.info({ messages: out.messages }, 'agent:output');
	return out;
};

export const withMemory = (): Middleware => {
	let history: Message[] = [];
	return (next) => async (ctx) => {
		const merged: AgentContext = { ...ctx, messages: [...history, ...ctx.messages] };
		const out = await next(merged);
		history = out.messages;
		return out;
	};
};