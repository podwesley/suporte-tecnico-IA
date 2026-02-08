import express from 'express';
import cors from 'cors';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const app = express();
const PORT = 8509;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'online' });
});

app.get('/api/execute-stream', (req, res) => {
  const { command, cwd } = req.query;

  if (!command) {
    return res.status(400).json({ error: 'No command provided' });
  }

  const effectiveCwd = cwd || os.homedir();
  
  // SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Explicit for SSE
  res.flushHeaders();

  // Send initial keep-alive comment to open the stream immediately
  res.write(': keep-alive\n\n');

  console.log(`[Stream] # ${effectiveCwd} > ${command}`);

  let finalCommand = command;
  if (process.platform === 'win32') {
    // Force UTF-8 encoding for Windows output
    finalCommand = `chcp 65001 >nul && ${command}`;
  }

  const child = spawn(finalCommand, { 
    cwd: effectiveCwd,
    shell: true 
  });

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  child.stdout.on('data', (data) => {
    sendEvent('output', { text: data.toString() });
  });

  child.stderr.on('data', (data) => {
    sendEvent('output', { text: data.toString(), isError: true });
  });

  child.on('error', (error) => {
    sendEvent('error', { text: error.message });
    res.end();
  });

  child.on('close', (code) => {
    sendEvent('done', { exitCode: code });
    res.end();
  });

  // If client closes connection, kill child process
  req.on('close', () => {
    child.kill();
  });
});

app.post('/api/execute', async (req, res) => {
  const { command, cwd } = req.body;

  if (!command) {
    return res.status(400).json({ success: false, output: 'No command provided' });
  }

  const effectiveCwd = cwd || os.homedir();
  console.log(`# ${effectiveCwd}${command}`);

  let finalCommand = command;
  if (process.platform === 'win32') {
    // Force UTF-8 encoding for Windows output
    finalCommand = `chcp 65001 >nul && ${command}`;
  }

  try {
    // Executa o comando. Note que isso executa no host onde o node está rodando.
    // CUIDADO: Isso permite execução arbitrária de código.
    const { stdout, stderr } = await execAsync(finalCommand, { cwd: effectiveCwd });
    
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
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS: AppleScript folder picker
      const { stdout } = await execAsync(`osascript -e 'POSIX path of (choose folder)'`);
      return res.json({ success: true, path: stdout.trim() });
    }

    if (platform === 'win32') {
      // Windows: PowerShell folder picker (requires STA)
      // Returns a filesystem path like C:\Users\...
      const psCommand =
          '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ' +
          'Add-Type -AssemblyName System.Windows.Forms; ' +
          '$f = New-Object System.Windows.Forms.FolderBrowserDialog; ' +
          '$f.Description = \'Selecione uma pasta\'; ' +
          '$f.ShowNewFolderButton = $true; ' +
          'if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $f.SelectedPath }';

      // Try different ways to invoke PowerShell
      const sysRoot = process.env.SystemRoot || 'C:\\Windows';
      const winPS = `${sysRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
      
      const commandsToTry = [
          'powershell.exe',
          'pwsh.exe',
          winPS
      ];

      let stdout = '';
      let lastError = null;

      for (const psExe of commandsToTry) {
          try {
              const result = await execAsync(
                  `chcp 65001 >nul && "${psExe}" -NoProfile -NonInteractive -STA -Command "${psCommand}"`,
                  { windowsHide: true }
              );
              stdout = result.stdout;
              lastError = null;
              break; // Success!
          } catch (e) {
              lastError = e;
              // Continue to next option
          }
      }

      if (lastError) {
          console.error('All PowerShell attempts failed:', lastError.message);
          return res.json({ success: false, path: null });
      }

      const selected = (stdout || '').trim();
      if (!selected) return res.json({ success: false, path: null });
      return res.json({ success: true, path: selected });
    }

    // Linux/others: try zenity (GNOME). If missing, this will fail and we return success:false.
    const { stdout } = await execAsync(`sh -lc 'zenity --file-selection --directory 2>/dev/null || true'`);
    const selected = stdout.trim();
    if (!selected) return res.json({ success: false, path: null });
    return res.json({ success: true, path: selected });
  } catch (error) {
    console.log('Directory selection cancelled or failed', error?.message || error);
    res.json({ success: false, path: null });
  }
});

app.listen(PORT, () => {
  console.log(`Command server running on http://localhost:${PORT}`);
});

