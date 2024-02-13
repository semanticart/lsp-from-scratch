import { DocumentUri, documents } from "../../documents";
import { NotificationMessage } from "../../server";

type TextDocumentItem = {
  uri: DocumentUri;
  languageId: string;
  version: number;
  text: string;
};

interface DidOpenTextDocumentParams {
  textDocument: TextDocumentItem;
}

export const didOpen = (message: NotificationMessage) => {
  const params = message.params as DidOpenTextDocumentParams;

  documents.set(params.textDocument.uri, params.textDocument.text);
};
