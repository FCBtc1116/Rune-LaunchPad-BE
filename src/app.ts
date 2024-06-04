import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import dotenv from "dotenv";
import logger from "./config/winston.config";
import cors from "cors";
import router from "./routes";
import bodyParser from "body-parser";
import { verifyAuth } from "./middlewares/verify-token";
import { verifyAdminAuth } from "./middlewares/verifyAdmin";
import { createServer } from "http";
import WebSocket from "ws";
import { validateApiKey } from "./middlewares/validateApiKey";
import multer from "multer";
import { init } from "./utils/init";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(cors());
app.use(express.json());

app.use("/utils", router.utilsRouter);
app.use("/token", router.tokenRouter);
app.use("/etching", router.etchRouter);

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error({
      label: "error",
      message: "something went wrong.",
      data: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Internal Server Error" });
  }
);

const server = createServer(app);

// const wss = new WebSocket.Server({ server });

// let clients: WebSocket[] = [];

// wss.on("connection", (ws: WebSocket) => {
//   clients.push(ws);

//   ws.on("message", (message: string) => {
//     // console.log(`Received message => ${message}`);
//   });

//   ws.send("Welcome! Connection was successful!");

//   ws.on("close", () => {
//     clients = clients.filter((client) => client !== ws);
//   });
// });

// export function sendToClients(data: string) {
//   clients.forEach((client: WebSocket) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(data);
//     }
//   });
// }

server.listen(PORT, () => {
  logger.debug(`Server is running at http://localhost:${PORT}`);
  init();
});

// After all your routes
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Check if the error is from multer
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // An unknown error occurred when uploading.
    return res
      .status(500)
      .json({ error: "An unknown error occurred when uploading." });
  }

  // If no errors, pass control to the next middleware function
  next();
});
