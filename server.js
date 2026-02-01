import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = 8509;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'online' });
});

app.post('/api/execute', async (req, res) => {
  const { command, cwd } = req.body;

  if (!command) {
    return res.status(400).json({ success: false, output: 'No command provided' });
  }

  console.log(`Executing: ${command} in ${cwd || 'default dir'}`);

  try {
    // Executa o comando. Note que isso executa no host onde o node está rodando.
    // CUIDADO: Isso permite execução arbitrária de código.
    const { stdout, stderr } = await execAsync(command, { cwd: cwd || undefined });
    
    // Combina stdout e stderr para o output
    const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
    
    res.json({ success: true, output: output.trim() });
  } catch (error) {
    // Em caso de erro (exit code != 0), o exec lança exceção, mas ainda pode ter output
    const output = (error.stdout || '') + 
                   (error.stderr ? `\nSTDERR:\n${error.stderr}` : '') + 
                   `\nExit Code: ${error.code}`;
    
    res.json({ success: false, output: output.trim() });
  }
});

app.post('/api/select-directory', async (req, res) => {
  try {
    // Uses AppleScript to open a native folder picker on macOS
    // This will only work if the server is running on a mac (which is the case here)
    const { stdout } = await execAsync("osascript -e 'POSIX path of (choose folder)'");
    res.json({ success: true, path: stdout.trim() });
  } catch (error) {
    // Likely user cancelled the dialog
    console.log("Directory selection cancelled or failed");
    res.json({ success: false, path: null });
  }
});

app.listen(PORT, () => {
  const now = new Date();
  console.log(`[${now.toLocaleDateString()} ${now.toLocaleTimeString()}] Command server running on http://localhost:${PORT}`);
});

