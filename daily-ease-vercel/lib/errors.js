class AppError extends Error {
  constructor(key, status = 400) { super(key); this.key = key; this.status = status; }
}
module.exports = { AppError };
