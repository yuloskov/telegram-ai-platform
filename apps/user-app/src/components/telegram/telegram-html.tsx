import * as React from "react";
import { cn } from "~/lib/utils";

interface TelegramHtmlProps {
  content: string;
  className?: string;
}

/**
 * Safely renders Telegram HTML formatting.
 * Supports: <b>, <i>, <u>, <s>, <code>, <pre>, <a>, <blockquote>, <tg-spoiler>
 */
export function TelegramHtml({ content, className }: TelegramHtmlProps) {
  const elements = React.useMemo(() => parseTelegramHtml(content), [content]);

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {elements}
    </span>
  );
}

type ParsedNode = string | React.ReactElement;

function parseTelegramHtml(html: string): ParsedNode[] {
  if (!html) return [];

  const result: ParsedNode[] = [];
  let keyCounter = 0;

  // Regex to match Telegram-supported HTML tags
  const tagRegex =
    /<(b|strong|i|em|u|ins|s|strike|del|code|pre|a|blockquote|tg-spoiler)(\s[^>]*)?>|<\/(b|strong|i|em|u|ins|s|strike|del|code|pre|a|blockquote|tg-spoiler)>/gi;

  const tagStack: { tag: string; attrs: Record<string, string>; children: ParsedNode[] }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    // Add text before this tag
    if (match.index > lastIndex) {
      const text = decodeHtmlEntities(html.slice(lastIndex, match.index));
      if (tagStack.length > 0) {
        tagStack[tagStack.length - 1]!.children.push(text);
      } else {
        result.push(text);
      }
    }

    const fullMatch = match[0];
    const openTag = match[1];
    const tagAttrs = match[2] || "";
    const closeTag = match[3];

    if (openTag) {
      // Opening tag
      const attrs = parseAttributes(tagAttrs);
      tagStack.push({ tag: openTag.toLowerCase(), attrs, children: [] });
    } else if (closeTag) {
      // Closing tag - find matching open tag
      const closeTagLower = closeTag.toLowerCase();
      const openIndex = findMatchingOpenTag(tagStack, closeTagLower);

      if (openIndex !== -1) {
        // Pop all tags from openIndex to end and create elements
        const popped: typeof tagStack = [];
        while (tagStack.length > openIndex) {
          popped.unshift(tagStack.pop()!);
        }

        // Create element from the first popped item (the matching tag)
        let element = createElementFromTag(
          popped[0]!.tag,
          popped[0]!.attrs,
          popped[0]!.children,
          keyCounter++
        );

        // Wrap in any remaining unclosed tags
        for (let i = 1; i < popped.length; i++) {
          element = createElementFromTag(
            popped[i]!.tag,
            popped[i]!.attrs,
            [element],
            keyCounter++
          );
        }

        // Add element to parent or result
        if (tagStack.length > 0) {
          tagStack[tagStack.length - 1]!.children.push(element);
        } else {
          result.push(element);
        }
      }
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < html.length) {
    const text = decodeHtmlEntities(html.slice(lastIndex));
    if (tagStack.length > 0) {
      tagStack[tagStack.length - 1]!.children.push(text);
    } else {
      result.push(text);
    }
  }

  // Close any remaining open tags
  while (tagStack.length > 0) {
    const item = tagStack.pop()!;
    const element = createElementFromTag(item.tag, item.attrs, item.children, keyCounter++);
    if (tagStack.length > 0) {
      tagStack[tagStack.length - 1]!.children.push(element);
    } else {
      result.push(element);
    }
  }

  return result;
}

function findMatchingOpenTag(stack: { tag: string }[], closeTag: string): number {
  // Normalize tag names (handle aliases)
  const normalizedClose = normalizeTagName(closeTag);
  for (let i = stack.length - 1; i >= 0; i--) {
    if (normalizeTagName(stack[i]!.tag) === normalizedClose) {
      return i;
    }
  }
  return -1;
}

function normalizeTagName(tag: string): string {
  const aliases: Record<string, string> = {
    strong: "b",
    em: "i",
    ins: "u",
    strike: "s",
    del: "s",
  };
  return aliases[tag] || tag;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1]!] = match[2]!;
  }
  return attrs;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function createElementFromTag(
  tag: string,
  attrs: Record<string, string>,
  children: ParsedNode[],
  key: number
): React.ReactElement {
  const normalizedTag = normalizeTagName(tag);

  switch (normalizedTag) {
    case "b":
      return <strong key={key}>{children}</strong>;
    case "i":
      return <em key={key}>{children}</em>;
    case "u":
      return (
        <span key={key} className="underline">
          {children}
        </span>
      );
    case "s":
      return (
        <span key={key} className="line-through">
          {children}
        </span>
      );
    case "code":
      return (
        <code
          key={key}
          className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono text-[0.9em]"
        >
          {children}
        </code>
      );
    case "pre":
      return (
        <pre
          key={key}
          className="p-2 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] font-mono text-sm overflow-x-auto my-2"
        >
          {children}
        </pre>
      );
    case "a":
      return (
        <a
          key={key}
          href={attrs.href || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-primary)] hover:underline"
        >
          {children}
        </a>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-2 border-[var(--border-secondary)] pl-3 my-2 text-[var(--text-secondary)]"
        >
          {children}
        </blockquote>
      );
    case "tg-spoiler":
      return (
        <span
          key={key}
          className="bg-[var(--text-primary)] text-[var(--text-primary)] hover:bg-transparent hover:text-inherit transition-colors cursor-pointer rounded px-0.5"
          title="Spoiler"
        >
          {children}
        </span>
      );
    default:
      return <span key={key}>{children}</span>;
  }
}
