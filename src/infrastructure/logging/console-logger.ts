import type { Logger } from "@/core/ports/services";

type Fields = Record<string, string | number | boolean | null>;

/** JSON por línea, fácil de ingerir. Los casos de uso solo pasan códigos y contadores: nada de PII. */
export class ConsoleLogger implements Logger {
  private write(level: "info" | "warn" | "error", event: string, fields?: Fields) {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
  }
  info(event: string, fields?: Fields) {
    this.write("info", event, fields);
  }
  warn(event: string, fields?: Fields) {
    this.write("warn", event, fields);
  }
  error(event: string, fields?: Fields) {
    this.write("error", event, fields);
  }
}
