export const compose = (...middlewares) => {
    return (agent) => {
        return middlewares.reduceRight((acc, mw) => mw(acc), agent);
    };
};
export const apply = (agent, ...pipelines) => {
    return pipelines.reduce((acc, p) => p(acc), agent);
};
//# sourceMappingURL=pipeline.js.map