export interface CommandResult {
  command: string;
  output: string;
  success: boolean;
}

export class CommandExecutor {
  private readonly API_URL = 'http://localhost:8080/api/execute';
  private readonly SELECT_DIR_URL = 'http://localhost:8080/api/select-directory';

  // Executes the command by calling the backend API
  public async execute(command: string, cwd?: string | null): Promise<CommandResult> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, cwd }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        command,
        output: data.output || "No output returned.",
        success: data.success ?? true
      };

    } catch (error) {
      console.error("Command execution failed:", error);
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }

  public async selectDirectory(): Promise<string | null> {
      try {
          const response = await fetch(this.SELECT_DIR_URL, {
              method: 'POST'
          });
          const data = await response.json();
          return data.success ? data.path : null;
      } catch (e) {
          console.error("Failed to select directory", e);
          return null;
      }
  }
}

export const commandExecutor = new CommandExecutor();
