import { RequestMessage } from "../../server";
import { Range } from "../../types";

import log from "../../log";

import { TextDocumentIdentifier, documents } from "../../documents";
import { spellingSuggestions } from "../../spellingSuggestions";

interface DocumentDiagnosticParams {
  textDocument: TextDocumentIdentifier;
}

namespace DiagnosticSeverity {
  export const Error: 1 = 1;
  export const Warning: 2 = 2;
  export const Information: 3 = 3;
  export const Hint: 4 = 4;
}

type DiagnosticSeverity = 1 | 2 | 3 | 4;

interface SpellingSuggestionData {
  wordSuggestions: string[];
  type: "spelling-suggestion";
}

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  source: "LSP From Scratch";
  message: string;
  data: SpellingSuggestionData;
}

interface FullDocumentDiagnosticReport {
  kind: "full";
  items: Diagnostic[];
}

export const diagnostic = (
  message: RequestMessage
): FullDocumentDiagnosticReport | null => {
  const params = message.params as DocumentDiagnosticParams;
  const content = documents.get(params.textDocument.uri);

  if (!content) {
    return null;
  }

  const invalidWordsAndSuggestions: Record<string, string[]> =
    spellingSuggestions(content);

  log.write({ spellingSuggestions: invalidWordsAndSuggestions });

  const items: Diagnostic[] = [];

  const contentLines = content.split("\n");

  Object.keys(invalidWordsAndSuggestions).forEach((invalidWord) => {
    const regex = new RegExp(`\\b${invalidWord}\\b`, "g");
    const wordSuggestions = invalidWordsAndSuggestions[invalidWord];

    const message = wordSuggestions.length
      ? `${invalidWord} isn't in our dictionary. Did you mean: ${wordSuggestions.join(
          ", "
        )}`
      : `${invalidWord} isn't in our dictionary.`;

    contentLines.forEach((line, lineNumber) => {
      let match;

      while ((match = regex.exec(line)) !== null) {
        items.push({
          source: "LSP From Scratch",
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: lineNumber, character: match.index },
            end: {
              line: lineNumber,
              character: match.index + invalidWord.length,
            },
          },
          message,
          data: {
            wordSuggestions,
            type: "spelling-suggestion",
          },
        });
      }
    });
  });

  return {
    kind: "full",
    items,
  };
};
