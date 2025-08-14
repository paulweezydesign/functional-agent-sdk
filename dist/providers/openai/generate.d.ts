import type { ModelGenerate } from '../../types/index.js';
export type OpenAIModelOptions = {
    apiKey?: string;
    model?: string;
};
export declare const createOpenAIGenerate: (opts?: OpenAIModelOptions) => ModelGenerate;
//# sourceMappingURL=generate.d.ts.map