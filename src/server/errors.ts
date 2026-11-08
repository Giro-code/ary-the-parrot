export class AppError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400, message = code) { super(message); this.code = code; this.status = status; }
}
