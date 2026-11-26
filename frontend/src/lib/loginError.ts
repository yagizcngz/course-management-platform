// Login message when the API sends none (the rate limiter's 429 has an empty body); kept free of i18n so Node tests can load it.
export const loginFailureKey = (status: number) =>
  status === 401
    ? "login.invalidCredentials"
    : status === 429
      ? "login.tooManyRequests"
      : "backendErrors.unexpected";
