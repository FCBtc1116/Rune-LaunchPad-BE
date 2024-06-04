import express from "express";

export function validateApiKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Regular API Key
  let apiKey = req.headers["x-api-key"] as string | undefined;
  if (Array.isArray(apiKey)) {
    apiKey = apiKey[0];
  }

  // Hidden API Key
  let hiddenApiKey = req.headers["content-version"] as string | undefined;
  if (Array.isArray(hiddenApiKey)) {
    hiddenApiKey = hiddenApiKey[0];
  }

  // Provide fallback empty strings to avoid runtime errors if environment variables are undefined
  const validApiKeys = (process.env.VALID_API_KEYS ?? "").split(",");
  const validHiddenApiKey = process.env.VALID_HIDDEN_API_KEY ?? "";

  // Check that both API keys are provided
  if (!apiKey || !hiddenApiKey) {
    return res.sendStatus(403); // Sends a 401 Unauthorized status with default status message
  }

  // Validate that both API keys are correct
  if (!validApiKeys.includes(apiKey) || hiddenApiKey !== validHiddenApiKey) {
    return res.sendStatus(403); // Sends a 403 Forbidden status with default status message
  }

  next(); // Both API keys are valid, proceed to the route handler
}
