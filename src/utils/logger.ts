import pino from 'pino';

export const createLogger = () => {
	const base = pino({ level: process.env.LOG_LEVEL ?? 'info' });
	return {
		info: (obj: unknown, msg?: string) => base.info(obj as any, msg),
		error: (obj: unknown, msg?: string) => base.error(obj as any, msg),
	};
};