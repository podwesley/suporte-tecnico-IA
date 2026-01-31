export interface CommandResult {
  command: string;
  output: string;
  success: boolean;
}

export class CommandExecutor {
  private readonly API_URL = 'http://localhost:8080/api/execute';

  // Executes the command by calling the backend API
  public async execute(command: string): Promise<CommandResult> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Assuming backend returns { output: string, success: boolean }
      // If the backend structure is different, this needs adjustment.
      return {
        command,
        output: data.output || "No output returned.",
        success: data.success ?? true
      };

    } catch (error) {
      console.error("Command execution failed:", error);
      // In case of error, we throw it so the UI can handle it
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
}

export const commandExecutor = new CommandExecutor();
