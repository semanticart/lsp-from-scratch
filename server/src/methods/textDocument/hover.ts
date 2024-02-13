import { spawnSync } from "child_process";
import { DocumentUri, documents, wordUnderCursor } from "../../documents";
import { RequestMessage } from "../../server";
import { Position, Range } from "../../types";

type HoverParams = {
  textDocument: { uri: DocumentUri };
  position: Position;
};

type Hover = {
  contents: {
    kind: "markdown";
    value: string;
  };
  range: Range;
};

export const hover = (message: RequestMessage): Hover | null => {
  const params = message.params as HoverParams;

  const currentWord = wordUnderCursor(params.textDocument.uri, params.position);

  if (!currentWord) {
    return null;
  }

  const rawDefinition = spawnSync("dict", [currentWord.text, "-d", "wn"], {
    encoding: "utf-8",
  })
    .stdout.trim()
    .split("\n");

  const value =
    `${currentWord.text}\n${"-".repeat(currentWord.text.length)}\n\n` +
    rawDefinition
      .splice(5)
      .map((line) => line.replace("      ", ""))
      .map((line) => (line.startsWith(" ") ? line : "\n" + line))
      .join("\n")
      .trim();

  return {
    contents: {
      kind: "markdown",
      value,
    },
    range: currentWord.range,
  };
};
