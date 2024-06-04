import express from "express";

import jwt from "jsonwebtoken";

const SECRET = process.env.TOKEN_SECRET!;

export const verifyAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  let token = req.header("Authorization");
  const address = req.header("address");

  if (!token || !address) {
    return res.status(400).send("Missing token or address");
  }

  // If the token includes 'Bearer', strip it out
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length).trimLeft();
  }

  try {
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;

    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).send("JWT token expired");
    }

    // Check if the user_id in the token matches the provided address
    if (decoded.user_id !== address) {
      return res.status(401).send("Token does not match address");
    }

    // If everything checks out, proceed with the request
    next();
  } catch (error) {
    return res.status(401).send("Invalid JWT token");
  }
};
