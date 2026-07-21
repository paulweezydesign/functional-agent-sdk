import { nanoid } from 'nanoid';
export const createAgent = (options) => {
    const { modelGenerate, system, render, tools = [], logger } = options;
    return async (context) => {
        const id = context.id ?? nanoid();
        const messages = [];
        if (system)
            messages.push({ role: 'system', content: system });
        messages.push(...context.messages);
        const effectiveTools = [...tools, ...(context.tools ?? [])];
        const result = await modelGenerate({ messages, tools: effectiveTools });
        const updated = {
            id,
            messages: [...messages, { role: 'assistant', content: result.content }],
            ...(render ? { render } : {}),
            ...(logger ? { logger } : {}),
            ...(context.tools ? { tools: context.tools } : {}),
        };
        return updated;
    };
};
export const send = async (agent, input, base) => {
    const context = {
        id: base?.id ?? nanoid(),
        messages: [{ role: 'user', content: input }],
        ...(base?.render ? { render: base.render } : {}),
        ...(base?.logger ? { logger: base.logger } : {}),
        ...(base?.tools ? { tools: base.tools } : {}),
    };
    return agent(context);
};
//# sourceMappingURL=agent.js.map