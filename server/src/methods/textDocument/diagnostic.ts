import { RequestMessage } from "../../server";
import { Range } from "../../types";

import log from "../../log";
import * as fs from "fs";
import { TextDocumentIdentifier, documents } from "../../documents";
const dictionaryWords = fs
  .readFileSync("/usr/share/dict/words")
  .toString()
  .split("\n");

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

interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  source: "LSP From Scratch";
  message: string;
  data?: unknown;
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

  const wordsInDocument = content.split(/\W/);

  const invalidWords = new Set(
    wordsInDocument.filter((word) => !dictionaryWords.includes(word))
  );

  const items: Diagnostic[] = [];
  const lines = content.split("\n");

  invalidWords.forEach((invalidWord) => {
    const regex = new RegExp(`\\b${invalidWord}\\b`, "g");

    lines.forEach((line, lineNumber) => {
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
          message: `${invalidWord} is not in our dictionary.`,
        });
      }
    });
  });

  return {
    kind: "full",
    items,
  };
};
