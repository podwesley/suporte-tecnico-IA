# TechSupport AI Agent

Uma interface de IA avançada com modo duplo, oferecendo suporte técnico especializado e um modo tutor personalizado, alimentado pela API Gemini do Google.

## 🚀 Funcionalidades

- **Modos Duplos**: 
  - **Modo Suporte**: Especialista de Elite focado em eficiência, diagnóstico de ambiente e resolução passo a passo de problemas técnicos (Docker, Kubernetes, Linux, etc).
  - **Modo Tutor**: Mentor técnico focado em ensino, explicações detalhadas e metodologia socrática para aprendizado.
- **Prompts Personalizados**: Crie, salve e ative seus próprios prompts de sistema para mudar a persona da IA.
- **Seleção de Sistema Operacional**: Otimize os comandos e diagnósticos escolhendo entre macOS, Windows ou Linux.
- **Execução de Comandos**: Execute comandos shell diretamente da interface com suporte a fila de comandos e verificação de status do backend.
- **Persistência Local**: Todo o histórico de conversas, favoritos (incluindo outputs de comandos) e configurações são salvos localmente no seu navegador.
- **Importação/Exportação**: Sistema de backup e restauração via JSON para seus dados e configurações.
- **Interface Moderna**: Desenvolvido com React 19, Tailwind CSS 4 e Framer Motion para uma experiência fluida.
- **Renderização de Markdown**: Suporte completo a Markdown e realce de sintaxe para blocos de código.

## 🛠️ Tecnologias

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Lucide React.
- **Backend**: Node.js, Express (para execução de comandos locais).
- **IA**: Google Gemini API (@google/genai).

## 💻 Como Rodar Localmente

**Pré-requisitos:** Node.js v18+

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o Ambiente:**
   - Crie um arquivo `.env` baseado no `.env.example`.
   - Obtenha uma chave da API Gemini no [Google AI Studio](https://aistudio.google.com/).
   - Você também pode configurar a chave diretamente pela interface do usuário.

3. **Inicie o Frontend e o Backend:**
   ```bash
   # Inicie o servidor de desenvolvimento (Vite)
   npm run dev

   # Em um terminal separado, inicie o servidor de comandos (opcional)
   npm run server
   ```

## 💾 Backup & Restauração (Importar/Exportar)

Você pode fazer o backup de seus prompts, favoritos, histórico e configurações através do menu de configurações na interface.

### Exportando
Clique em "Exportar Dados" para baixar um arquivo `techsupport-ai-backup-DATA.json` contendo todos os seus dados locais.

### Importando
Clique em "Importar Dados" e selecione um arquivo JSON válido. O sistema validará e mesclará/substituirá seus dados locais.

**Estrutura do JSON para Importação Manual:**

```json
{
  "version": 1,
  "apiKey": "SUA_CHAVE_API_GEMINI", 
  "prompts": [
    {
      "id": "uuid-unico-v4",
      "title": "Minha Persona Customizada",
      "content": "Você é um especialista em Python..."
    }
  ],
  "favorites": [
    {
      "id": "cmd-1",
      "type": "command",
      "label": "Listar Arquivos",
      "command": "ls -la"
    }
  ],
  "sessions": {
    "support": [],
    "help": []
  }
}
```

- **apiKey**: (Opcional) Substituirá a chave atual no navegador.
- **prompts**: Array de objetos de prompt.
- **favorites**: Array de comandos ou pastas favoritas.