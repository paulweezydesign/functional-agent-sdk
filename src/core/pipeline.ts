import type { Agent, Middleware, Pipeline } from '../types/index.js';

export const compose = (...middlewares: Middleware[]): Pipeline => {
	return (agent: Agent): Agent => {
		return middlewares.reduceRight((acc, mw) => mw(acc), agent);
	};
};

export const apply = (agent: Agent, ...pipelines: Pipeline[]): Agent => {
	return pipelines.reduce((acc, p) => p(acc), agent);
};