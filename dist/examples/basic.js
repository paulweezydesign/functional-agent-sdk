import { createAgent, send } from '../core/agent.js';
import { compose } from '../core/pipeline.js';
import { withLogging, withMemory, withSystem } from '../core/middleware.js';
import { createOpenAIGenerate } from '../providers/openai/generate.js';
import { createLogger } from '../utils/logger.js';
const main = async () => {
    const logger = createLogger();
    const generate = createOpenAIGenerate({ model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini' });
    const baseAgent = createAgent({ modelGenerate: generate });
    const pipeline = compose(withSystem('You are a concise, helpful assistant.'), withMemory(), withLogging(logger));
    const agent = pipeline(baseAgent);
    const result = await send(agent, 'In 1 sentence, explain composability in functional design.');
    console.log(result.messages.at(-1)?.content);
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=basic.js.map