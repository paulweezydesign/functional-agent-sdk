import OpenAI from 'openai';
import type { Message, ModelGenerate, Tool } from '../../types/index.js';

export type OpenAIModelOptions = {
	apiKey?: string;
	model?: string;
};

const mapMessages = (messages: Message[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
	return messages.map((m) => {
		if (m.role === 'tool') {
			return { role: 'tool', content: m.content, tool_call_id: m.toolCallId } as any;
		}
		return m as any;
	});
};

const mapTools = (tools?: Tool[]): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined => {
	if (!tools || tools.length === 0) return undefined;
	return tools.map((t) => ({
		type: 'function',
		function: {
			name: t.name,
			description: t.description,
			parameters: (t.parameters as any) ?? { type: 'object', properties: {} },
		},
	}));
};

export const createOpenAIGenerate = (opts: OpenAIModelOptions = {}): ModelGenerate => {
	const client = new OpenAI({ apiKey: opts.apiKey ?? process.env.OPENAI_API_KEY });
	const model = opts.model ?? 'gpt-4o-mini';

	const generate: ModelGenerate = async ({ messages, tools, stream, onToken, maxTokens, temperature, stop }) => {
		const baseParams = {
			model,
			messages: mapMessages(messages),
			tools: mapTools(tools),
			max_tokens: maxTokens,
			temperature,
			stop,
		};

		if (!stream) {
			const res = await client.chat.completions.create(baseParams as any);
			const choice = res.choices?.[0];
			const content = choice?.message?.content ?? '';
			const toolCalls = choice?.message?.tool_calls?.map((tc) => ({
				id: tc.id,
				name: tc.function?.name ?? '',
				args: (() => {
					try {
						return tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
					} catch {
						return tc.function?.arguments;
					}
				})(),
			})) ?? [];
			return { content, toolCalls: toolCalls.length ? toolCalls : undefined };
		}

		const streamRes = await client.chat.completions.create({ ...(baseParams as any), stream: true });
		let content = '';
		for await (const part of streamRes as any) {
			const delta = part.choices?.[0]?.delta?.content ?? '';
			if (delta) {
				content += delta;
				onToken?.(delta);
			}
		}
		return { content };
	};
	return generate;
};