import { ChildProcess } from "child_process";
import { spawn } from "child_process";

class LanguageServerWrapper {
  public process: ChildProcess | undefined;
  private requestId: number = 0;
  public requestHandlers: Map<number, (value: object) => void> = new Map();

  constructor(
    public readonly command: string,
    public readonly args: string[],
    public verbose: boolean = false,
  ) {}

  start() {
    this.process = spawn(this.command, this.args);

    this.listen();

    if (!this.process.stderr) {
      throw new Error("Language server is not running");
    }

    this.process.stderr.on("data", (data) => {
      throw `stderr: ${data}`;
    });

    this.process.on("close", (code) => {
      if (this.verbose) {
        console.log(`child process exited with code ${code}`);
      }
    });
  }

  stop() {
    this.verbose = false;
    this.process?.kill("SIGKILL");
  }

  listen() {
    if (!this.process?.stdout) {
      throw new Error("Language server is not running");
    }

    let buffer = "";

    this.process.stdout.on("data", (chunk) => {
      buffer += chunk;

      while (true) {
        // Check for the Content-Length line
        const lengthMatch = buffer.match(/Content-Length: (\d+)\r\n/);
        if (!lengthMatch || !lengthMatch[1]) break;

        const contentLength = parseInt(lengthMatch[1], 10);
        const messageStart = buffer.indexOf("\r\n\r\n") + 4;

        // Continue unless the full message is in the buffer
        if (buffer.length < messageStart + contentLength) break;

        const rawMessage = buffer.slice(
          messageStart,
          messageStart + contentLength,
        );
        const message = JSON.parse(rawMessage);

        if (message.id !== undefined && this.requestHandlers.has(message.id)) {
          if (this.verbose) {
            console.log(`Resolving request ${message.id} with ${rawMessage}`);
          }
          this.requestHandlers.get(message.id)?.(message.result);
          this.requestHandlers.delete(message.id);
        } else {
          if (this.verbose) {
            console.warn(JSON.stringify(message, null, 2));
          }
        }

        // Remove the processed message from the buffer
        buffer = buffer.slice(messageStart + contentLength);
      }
    });
  }

  notify(method: string, params: object) {
    if (!this.process || !this.process.stdin) {
      throw new Error("Language server is not running");
    }

    this.process.stdin.write(makeJSONRPCMessage({ method, params }));

    if (this.verbose) {
      console.log(
        `Sent notification with method ${method} and ${JSON.stringify({
          method,
          params,
        })}`,
      );
    }
  }

  request(method: string, params: object) {
    if (!this.process || !this.process.stdin) {
      throw new Error("Language server is not running");
    }

    this.requestId += 1;

    this.process.stdin.write(
      makeJSONRPCMessage({ method, params, id: this.requestId }),
    );

    if (this.verbose) {
      console.log(
        `Sent request ${this.requestId} with ${JSON.stringify({
          method,
          params,
          id: this.requestId,
        })}`,
      );
    }

    return new Promise((resolve) => {
      this.requestHandlers.set(this.requestId, resolve);
    });
  }
}

const makeJSONRPCMessage = (obj: object) => {
  const message = JSON.stringify({ jsonrpc: "2.0", ...obj });
  const messageLength = Buffer.byteLength(message, "utf-8");
  const header = `Content-Length: ${messageLength}\r\n\r\n`;

  return header + message;
};

export { LanguageServerWrapper };
