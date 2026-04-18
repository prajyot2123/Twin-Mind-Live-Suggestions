import { useState } from "react";

function normalizeMarkdownLine(line) {
  let text = String(line || "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (/\|/.test(text) && !/^\|.*\|$/.test(text)) {
    const cells = text
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length >= 2) {
      text = `${cells[0]}: ${cells.slice(1).join(" • ")}`;
    }
  }

  return text;
}

function parseTableCells(line) {
  return String(line || "")
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => normalizeMarkdownLine(cell));
}

function isTableDivider(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(String(line || "").trim());
}

function isLikelyTableLine(line) {
  const raw = String(line || "").trim();
  if (!raw.includes("|")) {
    return false;
  }
  const cells = parseTableCells(raw).filter((cell) => cell.length > 0);
  return cells.length >= 2;
}

function parseAssistantBlocks(content) {
  const lines = String(content || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .split("\n")
    .map((line) => line.trim());

  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw || /^[-=*]{3,}$/.test(raw)) {
      continue;
    }

    if (isLikelyTableLine(raw)) {
      const headerCells = parseTableCells(raw);
      let tableCursor = index + 1;

      if (tableCursor < lines.length && isTableDivider(lines[tableCursor])) {
        tableCursor += 1;
      }

      const rows = [];
      while (tableCursor < lines.length && isLikelyTableLine(lines[tableCursor])) {
        rows.push(parseTableCells(lines[tableCursor]));
        tableCursor += 1;
      }

      if (rows.length) {
        blocks.push({ type: "table", headers: headerCells, rows });
        index = tableCursor - 1;
        continue;
      }

      const flattened = headerCells.filter(Boolean);
      if (flattened.length >= 2) {
        blocks.push({ type: "paragraph", text: `${flattened[0]}: ${flattened.slice(1).join(" • ")}` });
        continue;
      }
    }

    const normalized = normalizeMarkdownLine(raw);
    if (!normalized) {
      continue;
    }

    const isBullet = /^([-*•]|\d+\.)\s+/.test(normalized);
    const isHeading = /:$/.test(normalized) && normalized.length <= 60;

    if (isHeading) {
      blocks.push({ type: "heading", text: normalized.replace(/:$/, "") });
      continue;
    }

    if (isBullet) {
      const bulletText = normalized.replace(/^([-*•]|\d+\.)\s+/, "");
      const cleanedBullet = /\|/.test(bulletText)
        ? bulletText
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)
            .join(" • ")
        : bulletText;

      blocks.push({ type: "bullet", text: cleanedBullet });
      continue;
    }

    blocks.push({ type: "paragraph", text: normalized });
  }

  return blocks.length ? blocks : [{ type: "paragraph", text: String(content || "") }];
}

function AssistantMessage({ content }) {
  const blocks = parseAssistantBlocks(content);

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <p key={`h-${index}`} className="rounded-md border border-[#33598f] bg-[#1a2a47] p-2.5 text-sm font-semibold text-[#eaf2ff]">
              {block.text}
            </p>
          );
        }

        if (block.type === "bullet") {
          return (
            <div key={`b-${index}`} className="rounded-md border border-[#33598f] bg-[#1a2a47] p-2.5">
              <div className="flex items-start gap-2 text-sm text-[#c6dafc]">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#6da9ff]" />
                <span>{block.text}</span>
              </div>
            </div>
          );
        }

        if (block.type === "table") {
          return (
            <div key={`t-${index}`} className="overflow-x-auto rounded-md border border-[#33598f] bg-[#1a2a47]">
              <table className="min-w-full border-collapse text-sm text-[#d4e4ff]">
                <thead>
                  <tr className="bg-[#22385f]">
                    {block.headers.map((header, headerIndex) => (
                      <th key={`th-${index}-${headerIndex}`} className="border-b border-[#33598f] px-3 py-2 text-left font-semibold text-[#eaf2ff]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`tr-${index}-${rowIndex}`} className="odd:bg-[#1a2a47] even:bg-[#16243d]">
                      {block.headers.map((_, cellIndex) => (
                        <td key={`td-${index}-${rowIndex}-${cellIndex}`} className="border-t border-[#2b4a77] px-3 py-2 align-top text-[#c6dafc]">
                          {row[cellIndex] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={`p-${index}`} className="rounded-md border border-[#33598f] bg-[#1a2a47] p-2.5 text-sm leading-relaxed text-[#d4e4ff]">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatPanel({ messages, onSendMessage, isThinking }) {
  const [input, setInput] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const value = input.trim();
    if (!value) {
      return;
    }
    setInput("");
    onSendMessage(value);
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[10px] border border-[#24344f] bg-[#0b1324]">
      <div className="flex items-center justify-between border-b border-[#1e2c44] px-3 py-2.5">
        <h2 className="text-sm uppercase tracking-wide text-[#8ca6cf]">3. Chat (Detailed Answers)</h2>
        <span className="text-xs uppercase tracking-wide text-[#8ca6cf]">Session-only</span>
      </div>

      <div className="px-3 py-3">
        <div className="rounded-md border border-[#2f4f80] bg-[#15243c] p-3 text-sm leading-relaxed text-[#d5e3fd]">
          Clicking a suggestion adds it to this chat and streams a detailed answer (separate prompt, more context).
          User can also type questions directly. One continuous chat per session.
        </div>
      </div>

      <div className="panel-scroll flex-1 space-y-2 overflow-y-auto px-3 pb-2">
        {!messages.length ? (
          <p className="pt-6 text-center text-[22px] text-[#273957]">Click a suggestion or type a question below.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-md p-2.5 text-sm ${
                message.role === "assistant"
                  ? "border border-[#2f4f80] bg-[#15243c] text-[#e5efff]"
                  : "border border-[#3877dd] bg-[#5ea2ff] text-[#0b1930]"
              }`}
            >
              {message.role === "assistant" ? (
                <AssistantMessage content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
              <p className={`mt-1 text-[11px] ${message.role === "assistant" ? "text-[#8ca6cf]" : "text-[#15345f]"}`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[#1e2c44] p-2.5">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 rounded-md border border-[#24344f] bg-[#121b2d] px-3 py-2 text-sm text-[#dbe7fb] outline-none placeholder:text-[#5f759e] focus:border-[#4d84de]"
            placeholder="Ask anything..."
          />
          <button
            type="submit"
            disabled={isThinking}
            className="rounded-md border border-[#3877dd] bg-[#5ea2ff] px-4 py-2 text-sm font-semibold text-[#0b1930] hover:bg-[#76b0ff] disabled:opacity-50"
          >
            {isThinking ? "..." : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
