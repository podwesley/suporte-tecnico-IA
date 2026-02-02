export interface CommandResult {
  command: string;
  output: string;
  success: boolean;
}

export class CommandExecutor {
  private readonly API_URL = 'http://localhost:8509/api/execute';
  private readonly STREAM_URL = 'http://localhost:8509/api/execute-stream';
  private readonly SELECT_DIR_URL = 'http://localhost:8509/api/select-directory';

  public async execute(command: string, cwd?: string | null): Promise<CommandResult> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      return {
        command,
        output: data.output || "No output returned.",
        success: data.success ?? true
      };
    } catch (error) {
      console.error("Command execution failed:", error);
      throw new Error(error instanceof Error ? error.message : "Unknown error");
    }
  }

  public async executeStream(
    command: string, 
    onOutput: (chunk: string) => void,
    cwd?: string | null
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.STREAM_URL);
      url.searchParams.append('command', command);
      if (cwd) url.searchParams.append('cwd', cwd);

      const eventSource = new EventSource(url.toString());

      eventSource.onopen = () => {
        console.log("Stream connection established");
      };

      eventSource.addEventListener('output', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          onOutput(data.text);
        } catch (e) {
          console.error("Failed to parse stream data", e);
        }
      });

      eventSource.addEventListener('error', (event: any) => {
        const data = JSON.parse(event.data);
        onOutput(`\nERROR: ${data.text}`);
        eventSource.close();
        reject(new Error(data.text));
      });

      eventSource.addEventListener('done', (event: any) => {
        const data = JSON.parse(event.data);
        if (data.exitCode !== 0) {
          onOutput(`\n[Processo finalizado com código ${data.exitCode}]`);
        }
        eventSource.close();
        resolve();
      });

      eventSource.onerror = (err) => {
        // ReadyState 2 means closed. If it closed without a 'done' event, it's a network error.
        if (eventSource.readyState === 2) {
            console.error("EventSource connection was closed unexpectedly");
        }
        eventSource.close();
        reject(new Error("Não foi possível conectar ao servidor de comandos. Verifique se o backend (server.js) está rodando."));
      };
    });
  }

  public async selectDirectory(): Promise<string | null> {
      try {
          const response = await fetch(this.SELECT_DIR_URL, { method: 'POST' });
          const data = await response.json();
          return data.success ? data.path : null;
      } catch (e) {
          console.error("Failed to select directory", e);
          return null;
      }
  }
}

export const commandExecutor = new CommandExecutor();