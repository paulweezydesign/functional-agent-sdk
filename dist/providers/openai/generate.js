import OpenAI from 'openai';
const mapMessages = (messages) => {
    return messages.map((m) => {
        if (m.role === 'tool') {
            return { role: 'tool', content: m.content, tool_call_id: m.toolName };
        }
        return m;
    });
};
export const createOpenAIGenerate = (opts = {}) => {
    const client = new OpenAI({ apiKey: opts.apiKey ?? process.env.OPENAI_API_KEY });
    const model = opts.model ?? 'gpt-4o-mini';
    const generate = async ({ messages, tools, stream, onToken, maxTokens, temperature, stop }) => {
        const baseParams = {
            model,
            messages: mapMessages(messages),
            max_tokens: maxTokens,
            temperature,
            stop,
        };
        if (!stream) {
            const res = await client.chat.completions.create(baseParams);
            const content = res.choices?.[0]?.message?.content ?? '';
            return { content };
        }
        const streamRes = await client.chat.completions.create({ ...baseParams, stream: true });
        let content = '';
        for await (const part of streamRes) {
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
//# sourceMappingURL=generate.js.map