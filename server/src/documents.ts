import { Position, Range } from "./types";

export type DocumentUri = string;
type DocumentBody = string;

export interface TextDocumentIdentifier {
  uri: DocumentUri;
}

export interface VersionedTextDocumentIdentifier
  extends TextDocumentIdentifier {
  version: number;
}

export interface TextDocumentContentChangeEvent {
  text: string;
}

export const documents = new Map<DocumentUri, DocumentBody>();

type WordUnderCursor = {
  text: string;
  range: Range;
};

export const wordUnderCursor = (
  uri: DocumentUri,
  position: Position,
): WordUnderCursor | null => {
  const document = documents.get(uri);

  if (!document) {
    return null;
  }

  const lines = document.split("\n");
  const line = lines[position.line];

  const start = line.lastIndexOf(" ", position.character) + 1;
  const end = line.indexOf(" ", position.character);

  if (end === -1) {
    return {
      text: line.slice(start),
      range: {
        start: { line: position.line, character: start },
        end: { line: position.line, character: line.length },
      },
    };
  }

  return {
    text: line.slice(start, end),
    range: {
      start: { line: position.line, character: start },
      end: { line: position.line, character: end },
    },
  };
};
