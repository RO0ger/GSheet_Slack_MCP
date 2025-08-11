export interface Logger {
  info(message: string, meta?: any): void;
  success(message: string, meta?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, meta?: any): void;
}

class ConsoleLogger implements Logger {
  info(message: string, meta?: any) {
    const line = `ℹ️  ${message}` + (meta ? ` ${JSON.stringify(meta)}` : '') + '\n';
    // Important: write logs to stderr to avoid contaminating MCP stdout JSON-RPC stream
    process.stderr.write(line);
  }
  
  success(message: string, meta?: any) {
    const line = `✅ ${message}` + (meta ? ` ${JSON.stringify(meta)}` : '') + '\n';
    process.stderr.write(line);
  }
  
  error(message: string, error?: any) {
    const line = `❌ ${message}` + (error ? ` ${error?.message || String(error)}` : '') + '\n';
    process.stderr.write(line);
  }
  
  warn(message: string, meta?: any) {
    const line = `⚠️  ${message}` + (meta ? ` ${JSON.stringify(meta)}` : '') + '\n';
    process.stderr.write(line);
  }
}

export const logger: Logger = new ConsoleLogger(); 