import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import pino, { type Logger, type LoggerOptions } from "pino";

type CorrelationContext = {
  correlationId: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
};

type ContextInput = Partial<Omit<CorrelationContext, "correlationId">> & {
  correlationId?: string;
};

const storage = new AsyncLocalStorage<CorrelationContext>();

const isDevelopment = process.env.NODE_ENV !== "production";
const logLevel = process.env.PINO_LOG_LEVEL ?? (isDevelopment ? "debug" : "info");

const baseLoggerOptions: LoggerOptions = {
  level: logLevel,
  redact: ["password", "token", "authorization"],
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
        },
      }
    : undefined,
  hooks: {
    logMethod(args, method) {
      const context = storage.getStore();
      if (context) {
        if (args.length === 0) {
          args.push(context);
        } else if (typeof args[0] === "object" && !Array.isArray(args[0])) {
          args[0] = { ...context, ...args[0] };
        } else {
          args.unshift(context);
        }
      }

      return method.apply(this, args as Parameters<typeof method>);
    },
  },
};

const loggerInstance: Logger = pino(baseLoggerOptions);

export const logger = loggerInstance;

export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

export function withCorrelationContext<T>(context: ContextInput, handler: () => T): T {
  const existing = storage.getStore();
  const correlationId = context.correlationId ?? existing?.correlationId ?? randomUUID();
  const nextContext: CorrelationContext = {
    correlationId,
    requestId: context.requestId ?? existing?.requestId,
    userId: context.userId ?? existing?.userId,
    sessionId: context.sessionId ?? existing?.sessionId,
    ipAddress: context.ipAddress ?? existing?.ipAddress,
  };

  return storage.run(nextContext, handler);
}

export function addContext(values: Partial<CorrelationContext>): void {
  const current = storage.getStore();
  if (!current) {
    const correlationId = values.correlationId ?? randomUUID();
    storage.enterWith({
      correlationId,
      requestId: values.requestId,
      userId: values.userId,
      sessionId: values.sessionId,
      ipAddress: values.ipAddress,
    });
    return;
  }

  storage.enterWith({ ...current, ...values, correlationId: values.correlationId ?? current.correlationId });
}

export function childLogger(bindings: Record<string, unknown>): Logger {
  return loggerInstance.child(bindings);
}
