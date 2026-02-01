import React, { useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  className?: string;
}

const detectLanguage = (code: string): string => {
    const trimmed = code.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return 'json';
    }
    // Simple heuristic for logs or timestamps
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}/) || trimmed.match(/\[.*?\]/)) {
        return 'text'; 
    }
    return 'bash'; // Default to bash for terminal-like highlighting
};

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, language, className }) => {
   const lang = language || detectLanguage(code);

   const highlightedCode = useMemo(() => {
    const grammar = Prism.languages[lang] || Prism.languages.text || Prism.languages.javascript;
    if (!grammar) return code;
    return Prism.highlight(code, grammar, lang);
  }, [code, lang]);

  return (
      <code 
        className={`${className || ''} language-${lang}`}
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
  );
};
