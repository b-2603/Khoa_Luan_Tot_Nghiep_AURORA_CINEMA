import React from 'react';
import { 
  Sparkles, AlertTriangle, Lightbulb, CheckCircle2, 
  XCircle, Lock, ShieldAlert, ArrowRight, Table as TableIcon
} from 'lucide-react';

interface AiMessageRendererProps {
  content: string;
  isUser?: boolean;
}

/**
 * Format inline text: removes raw asterisks (**bold**, *italic*), pipes, backticks
 */
function renderInlineText(text: string): React.ReactNode[] {
  // Pattern matching:
  // 1. `code`
  // 2. **bold**
  // 3. *italic*
  // 4. [status] or (status)
  // 5. pipes ` | ` or `||`
  const parts: React.ReactNode[] = [];
  
  // Replace double pipes || with a clean separator
  const cleanPipes = text.replace(/\s*\|\|\s*/g, ' • ').replace(/\s*\|\s*/g, ' • ');

  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanPipes)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleanPipes.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      const code = token.slice(1, -1);
      parts.push(
        <code 
          key={`c-${match.index}`} 
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-950/80 text-cyan-300 border border-slate-700/80 font-mono text-[11px] inline-block shadow-2xs"
        >
          {code}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-amber-200">
          {boldText}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const italicText = token.slice(1, -1);
      parts.push(
        <span key={`i-${match.index}`} className="text-slate-300 italic font-medium">
          {italicText}
        </span>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < cleanPipes.length) {
    parts.push(cleanPipes.substring(lastIndex));
  }

  return parts;
}

/**
 * Parses markdown table blocks
 */
function renderMarkdownTable(lines: string[], keyPrefix: string): React.ReactNode {
  const tableRows = lines.map(line => {
    return line
      .split('|')
      .map(cell => cell.trim())
      .filter((cell, idx, arr) => !(idx === 0 && cell === '') && !(idx === arr.length - 1 && cell === ''));
  }).filter(row => row.length > 0);

  if (tableRows.length === 0) return null;

  // Filter out separator row e.g. |---|---|---|
  const header = tableRows[0];
  const bodyRows = tableRows.slice(1).filter(row => !row.every(cell => /^[-: ]+$/.test(cell)));

  return (
    <div key={keyPrefix} className="my-3 overflow-x-auto rounded-xl border border-slate-700/70 bg-slate-950/70 shadow-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-800/80 border-b border-slate-700/80 text-amber-300 font-semibold uppercase text-[10px] tracking-wider">
            {header.map((col, idx) => (
              <th key={idx} className="px-3 py-2 font-bold whitespace-nowrap">
                {renderInlineText(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 text-slate-200 font-mono text-[11px]">
                  {renderInlineText(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const AiMessageRenderer: React.FC<AiMessageRendererProps> = ({ content, isUser = false }) => {
  if (isUser) {
    return <div className="text-slate-950 font-medium whitespace-pre-wrap">{content}</div>;
  }

  // Pre-process raw text: normalize lines
  const rawLines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];

  const flushTable = (index: number) => {
    if (tableBuffer.length > 0) {
      elements.push(renderMarkdownTable(tableBuffer, `table-${index}`));
      tableBuffer = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // 1. Detect table line e.g. | col 1 | col 2 |
    if (line.startsWith('|') && line.endsWith('|')) {
      tableBuffer.push(line);
      continue;
    } else {
      flushTable(i);
    }

    if (!line) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // 2. Heading: # or ## or ### or lines like **TIÊU ĐỀ**
    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      const title = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      elements.push(
        <div key={`h-${i}`} className="mt-3 mb-1.5 flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
          <h4 className="font-black text-sm text-amber-300 tracking-tight flex items-center gap-1.5">
            {title}
          </h4>
        </div>
      );
      continue;
    }

    // 3. Main Topic Banner / Section Header: starts with emoji or standalone **TEXT**
    const sectionBannerMatch = line.match(/^([\p{Extended_Pictographic}\p{Emoji}]\s*)?\*\*([^*]+)\*\*:?$/u);
    if (sectionBannerMatch) {
      const icon = (sectionBannerMatch[1] || '📌').trim();
      const title = sectionBannerMatch[2];
      elements.push(
        <div key={`banner-${i}`} className="mt-3.5 mb-2 p-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-700/80 flex items-center gap-2.5 shadow-sm">
          <span className="text-base shrink-0">{icon}</span>
          <span className="font-black text-xs uppercase tracking-wider text-amber-300">{title}</span>
        </div>
      );
      continue;
    }

    // 4. Alert Callouts: lines starting with 💡, ⚠️, ❌, ✅, 🔒, ⛔
    if (line.startsWith('💡') || line.startsWith('⚠️') || line.startsWith('❌') || line.startsWith('✅') || line.startsWith('🔒') || line.startsWith('⛔')) {
      const iconChar = line.slice(0, 2);
      const textWithoutIcon = line.slice(2).trim();

      let borderStyle = 'border-indigo-500/30 bg-indigo-950/30 text-indigo-200';
      let iconElem = <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0" />;

      if (line.startsWith('⚠️')) {
        borderStyle = 'border-amber-500/40 bg-amber-950/30 text-amber-200';
        iconElem = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      } else if (line.startsWith('❌') || line.startsWith('⛔')) {
        borderStyle = 'border-rose-500/40 bg-rose-950/30 text-rose-200';
        iconElem = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      } else if (line.startsWith('✅')) {
        borderStyle = 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200';
        iconElem = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      } else if (line.startsWith('🔒')) {
        borderStyle = 'border-cyan-500/40 bg-cyan-950/30 text-cyan-200';
        iconElem = <Lock className="w-4 h-4 text-cyan-400 shrink-0" />;
      }

      elements.push(
        <div key={`callout-${i}`} className={`my-2 p-3 rounded-xl border flex items-start gap-2.5 text-xs ${borderStyle} shadow-inner`}>
          <div className="mt-0.5">{iconElem}</div>
          <div className="flex-1 leading-relaxed">
            {renderInlineText(textWithoutIcon)}
          </div>
        </div>
      );
      continue;
    }

    // 5. Numbered or Bullet list item: •, -, *, 1., 2., ➤
    const bulletMatch = line.match(/^(\s*)(•|-|\*|➤|\d+\.)\s*(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const bulletSymbol = bulletMatch[2];
      const itemContent = bulletMatch[3];

      const isSub = indent >= 2 || bulletSymbol === '➤';

      elements.push(
        <div 
          key={`li-${i}`} 
          className={`flex items-start gap-2 py-0.5 text-xs leading-relaxed ${isSub ? 'pl-4 text-slate-300' : 'pl-1 text-slate-200'}`}
        >
          {isSub ? (
            <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 mt-1" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shrink-0 mt-1.5" />
          )}
          <div className="flex-1">
            {renderInlineText(itemContent)}
          </div>
        </div>
      );
      continue;
    }

    // 6. Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-slate-200 py-0.5">
        {renderInlineText(line)}
      </p>
    );
  }

  // Flush remaining table lines if any
  flushTable(rawLines.length);

  return (
    <div className="space-y-0.5 text-xs">
      {elements}
    </div>
  );
};
