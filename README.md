<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TechSupport AI Agent

An advanced, dual-mode AI interface offering specialized technical support and a custom agent tutor mode powered by Google's Gemini API.

View your app in AI Studio: https://ai.studio/apps/drive/1hwNXlnXjNOUb5u3mhvcjgBmifH5XDnGg

## Features

- **Dual Modes**: 
  - **Support Mode**: Specialized in Docker, Kubernetes, Linux, and debugging.
  - **Agent Mode**: Customizable AI tutor for learning and system exploration.
- **Custom Prompts**: Create, save, and activate custom system prompts to change the AI's persona.
- **Local Persistence**: All chats, favorites, and settings are saved locally in your browser.
- **Command Execution**: Execute shell commands directly from the interface (requires backend).
- **Import/Export**: Backup your configuration and data to JSON.

## Run Locally

**Prerequisites:**  Node.js v18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Environment:
   - Create `.env` based on `.env.example` (optional, as API key can be set in UI).

3. Run the backend and frontend:
   ```bash
   npm run dev
   # In a separate terminal for the backend (if needed for command execution)
   node server.js
   ```

## Backup & Restore (Import/Export)

You can backup your prompts, favorites, history, and settings via the "Configurações" menu.

### Exporting
Click "Exportar Dados" to download a `techsupport-ai-backup-DATE.json` file containing all your local data.

### Importing
Click "Importar Dados" and select a valid JSON file. The system will validate and merge/replace your local data.

**JSON Structure for Manual Import:**
If you wish to construct an import file manually, ensure it follows this structure:

```json
{
  "version": 1,
  "apiKey": "YOUR_GEMINI_API_KEY", 
  "prompts": [
    {
      "id": "unique-uuid-v4",
      "title": "My Custom Persona",
      "content": "You are a Python expert..."
    }
  ],
  "favorites": [
    {
      "id": "cmd-1",
      "type": "command",
      "label": "List Files",
      "command": "ls -la"
    }
  ],
  "sessions": {
    "support": [],
    "help": []
  }
}
```

- **apiKey**: (Optional) String. Will overwrite the current key.
- **prompts**: Array of prompt objects.
- **favorites**: Array of command/folder objects.