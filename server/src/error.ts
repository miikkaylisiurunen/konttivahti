type HttpErrorDetails = Record<string, unknown>;

export interface ErrorResponse {
  error: string;
  name: string;
  details?: HttpErrorDetails;
}

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: HttpErrorDetails,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
