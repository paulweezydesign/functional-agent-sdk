import pino from 'pino';
export const createLogger = () => {
    const base = pino({ level: process.env.LOG_LEVEL ?? 'info' });
    return {
        info: (obj, msg) => base.info(obj, msg),
        error: (obj, msg) => base.error(obj, msg),
    };
};
//# sourceMappingURL=logger.js.map