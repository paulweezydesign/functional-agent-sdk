export const withSystem = (system) => (next) => async (ctx) => {
    const updated = {
        ...ctx,
        messages: [{ role: 'system', content: system }, ...ctx.messages],
    };
    return next(updated);
};
export const withTools = (tools) => (next) => async (ctx) => {
    ctx.tools = [...(ctx.tools ?? []), ...tools];
    return next(ctx);
};
export const withLogging = (logger) => (next) => async (ctx) => {
    logger?.info({ messages: ctx.messages }, 'agent:input');
    const out = await next(ctx);
    logger?.info({ messages: out.messages }, 'agent:output');
    return out;
};
export const withMemory = () => {
    let history = [];
    return (next) => async (ctx) => {
        const merged = { ...ctx, messages: [...history, ...ctx.messages] };
        const out = await next(merged);
        history = out.messages;
        return out;
    };
};
//# sourceMappingURL=middleware.js.map