type Level = "info" | "warn" | "error" | "debug";

const log = (level: Level, message: string, meta?: Record<string, unknown>) => {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
};

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta)
};
