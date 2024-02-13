import { cwd } from "process";
import { beforeEach, afterEach, describe, expect, test } from "@jest/globals";

import type {
  CodeAction,
  CompletionList,
  FullDocumentDiagnosticReport,
  Hover,
} from "vscode-languageserver";

import { LanguageServerWrapper } from "./language-server-wrapper";

let languageServer: LanguageServerWrapper;

const defaultFile = "file:///home/user/project/file.txt";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const init = async () => {
  await languageServer.request("initialize", {
    rootUri: "file:///home/user/project",
    capabilities: {},
  });
};

const documentVersion = new Map<string, number>();

const didOpen = (text: string, uri: string = defaultFile) => {
  const version = documentVersion.get(uri) ?? 1;

  languageServer.notify("textDocument/didOpen", {
    textDocument: { uri, version, text },
  });

  documentVersion.set(uri, version + 1);
};

const didChange = (text: string, uri: string = defaultFile) => {
  const version = documentVersion.get(uri) ?? 1;

  languageServer.notify("textDocument/didChange", {
    textDocument: { uri, version },
    contentChanges: [{ text: text }],
  });

  documentVersion.set(uri, version + 1);
};

const completionRequest = async (
  position: { line: number; character: number },
  uri: string = defaultFile,
) => {
  return (await languageServer.request("textDocument/completion", {
    textDocument: { uri },
    position,
  })) as unknown as CompletionList;
};

describe("lsp-from-scratch", () => {
  beforeEach(() => {
    languageServer = new LanguageServerWrapper(
      "npx",
      ["ts-node", `${cwd()}/src/server.ts`],
      !!process.env.VERBOSE,
    );

    languageServer.start();
  });

  afterEach(() => {
    languageServer.stop();
  });

  test("can initialize and give completions", async () => {
    await init();
    didOpen("Hello, world! a");

    const completionResponse1 = await completionRequest({
      line: 0,
      character: 15,
    });

    expect(completionResponse1.isIncomplete).toBe(true);
    expect(completionResponse1.items.slice(0, 5)).toStrictEqual([
      { label: "a" },
      { label: "aa" },
      { label: "aal" },
      { label: "aalii" },
      { label: "aam" },
    ]);

    didChange("Hello, world! aa");

    const completionResponse2 = await completionRequest({
      line: 0,
      character: 16,
    });

    expect(completionResponse2.isIncomplete).toBe(false);
    expect(completionResponse2.items).toStrictEqual([
      { label: "aa" },
      { label: "aal" },
      { label: "aalii" },
      { label: "aam" },
      { label: "aardvark" },
      { label: "aardwolf" },
    ]);
  });

  test("can shutdown and exit", async () => {
    await init();

    const response = await languageServer.request("shutdown", {});
    expect(response).toBeNull();
    await wait(20);
    expect(languageServer.process?.exitCode).toBeNull();

    languageServer.notify("exit", {});
    await wait(20);
    expect(languageServer.process?.exitCode).toBe(0);
  });

  test("spelling suggestions", async () => {
    await init();

    didOpen("helllo there, sallly");

    const diagnostics = (await languageServer.request(
      "textDocument/diagnostic",
      {
        textDocument: { uri: defaultFile },
      },
    )) as FullDocumentDiagnosticReport;

    expect(diagnostics).toStrictEqual({
      kind: "full",
      items: [
        {
          source: "LSP From Scratch",
          severity: 1,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 6 },
          },
          message:
            "helllo isn't in our dictionary. Did you mean: hello, hell, he'll, Heller, halloo, hell lo, hell-lo, hellos, jello, hallow, hollow, hellion, Hall, Hill, Hull, hall, halo, heal, heel, hill, hull, cello, Holly, hilly, holly, hell's, Halley, Hallie, Holley, Hollie, healer, holler, huller, hello's",
          data: {
            wordSuggestions: [
              "hello",
              "hell",
              "he'll",
              "Heller",
              "halloo",
              "hell lo",
              "hell-lo",
              "hellos",
              "jello",
              "hallow",
              "hollow",
              "hellion",
              "Hall",
              "Hill",
              "Hull",
              "hall",
              "halo",
              "heal",
              "heel",
              "hill",
              "hull",
              "cello",
              "Holly",
              "hilly",
              "holly",
              "hell's",
              "Halley",
              "Hallie",
              "Holley",
              "Hollie",
              "healer",
              "holler",
              "huller",
              "hello's",
            ],
            type: "spelling-suggestion",
          },
        },
        {
          source: "LSP From Scratch",
          severity: 1,
          range: {
            start: { line: 0, character: 14 },
            end: { line: 0, character: 20 },
          },
          message:
            "sallly isn't in our dictionary. Did you mean: Sally, sally, silly, sully, Sallie, sallow, slay, Sal, dally, sly, ally, Saul, sail, sale, sell, sill, sadly, salty, slyly, allay, alley, alloy, bally, pally, rally, tally, wally, Sulla, surly, safely, sagely, salary, sanely, sawfly, smelly, solely, Sally's, sally's",
          data: {
            wordSuggestions: [
              "Sally",
              "sally",
              "silly",
              "sully",
              "Sallie",
              "sallow",
              "slay",
              "Sal",
              "dally",
              "sly",
              "ally",
              "Saul",
              "sail",
              "sale",
              "sell",
              "sill",
              "sadly",
              "salty",
              "slyly",
              "allay",
              "alley",
              "alloy",
              "bally",
              "pally",
              "rally",
              "tally",
              "wally",
              "Sulla",
              "surly",
              "safely",
              "sagely",
              "salary",
              "sanely",
              "sawfly",
              "smelly",
              "solely",
              "Sally's",
              "sally's",
            ],
            type: "spelling-suggestion",
          },
        },
      ],
    });

    const diagnosticUnderCursor = diagnostics.items[1];

    const codeActionResponse = (await languageServer.request(
      "textDocument/codeAction",
      {
        textDocument: { uri: defaultFile },
        range: diagnosticUnderCursor.range,
        context: {
          diagnostics: [diagnosticUnderCursor],
        },
      },
    )) as CodeAction[];

    expect(codeActionResponse.slice(0, 2)).toStrictEqual([
      {
        title: "Replace with Sally",
        kind: "quickfix",
        edit: {
          changes: {
            [defaultFile]: [
              {
                range: {
                  start: { line: 0, character: 14 },
                  end: { line: 0, character: 20 },
                },
                newText: "Sally",
              },
            ],
          },
        },
      },
      {
        title: "Replace with sally",
        kind: "quickfix",
        edit: {
          changes: {
            [defaultFile]: [
              {
                range: {
                  start: { line: 0, character: 14 },
                  end: { line: 0, character: 20 },
                },
                newText: "sally",
              },
            ],
          },
        },
      },
    ]);
  });

  test("hover definitions", async () => {
    await init();

    didOpen("Functional programming is a thing.");

    const definitionResponse = await languageServer.request(
      "textDocument/hover",
      {
        textDocument: { uri: defaultFile },
        position: { line: 0, character: 14 },
      },
    );

    const expectedDefinitionBody = `
programming
-----------

n 1: setting an order and time for planned events [syn:
     {scheduling}, {programming}, {programing}]

2: creating a sequence of instructions to enable the computer to
   do something [syn: {programming}, {programing}, {computer
   programming}, {computer programing}]
    `.trim();

    const expectedHover: Hover = {
      contents: {
        kind: "markdown",
        value: expectedDefinitionBody,
      },
      range: {
        start: { line: 0, character: 11 },
        end: { line: 0, character: 22 },
      },
    };

    expect(definitionResponse).toStrictEqual(expectedHover);
  });
});
