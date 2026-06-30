// Shared typed errors so the ingestion pipeline can catch and report failures without crashing a batch.

export class UnsupportedFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileTypeError";
  }
}

export class DocumentReadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DocumentReadError";
  }
}