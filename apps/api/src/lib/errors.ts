// Errors that are safe to show to the candidate. Anything else becomes a generic 500 with no internal details.
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message = 'Not found.') => new HttpError(404, message);
export const unauthorized = (message = 'Please sign in to continue.') => new HttpError(401, message);
export const conflict = (message: string) => new HttpError(409, message);
export const unprocessable = (message: string) => new HttpError(422, message);
