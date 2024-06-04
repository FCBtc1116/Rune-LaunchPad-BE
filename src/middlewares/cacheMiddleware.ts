import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import NodeCache from "node-cache";

const routeCache = new NodeCache({ stdTTL: 120 }); // TTL in seconds (2 minutes)

const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const key = `${req.originalUrl}`; // Unique cache key based on request URL
  const cachedResponse = routeCache.get<string | Buffer>(key);

  if (cachedResponse) {
    res.setHeader("Cache-Control", "public, max-age=120"); // 120 seconds cache duration
    res.send(cachedResponse); // Serve response from cache
    return;
  }

  // Temporarily hold data to send
  let originalSend = res.send;
  res.send = function (data): Response {
    // Cache data before sending
    routeCache.set(key, data);
    res.setHeader("Cache-Control", "public, max-age=120"); // Set cache-control header for each response
    // Restore original send and send the response
    res.send = originalSend;
    return originalSend.apply(res, arguments as any);
  };

  next(); // Proceed to route handler
};

export default cacheMiddleware;
