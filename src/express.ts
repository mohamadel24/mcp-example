import express, {type Express, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {randomUUID} from "node:crypto";
import {getMcpServer} from "./mcp.js";
import {isInitializeRequest} from "@modelcontextprotocol/sdk/types.js";

export const app = express();

app.use(express.json());

const transportsBySessionId = new Map<string, StreamableHTTPServerTransport>();

(function addStatefulRoutes(app: Express) {
    const statefulUrl = '/api/mcp/stateful';

    const handleSessionRequest = async (req: Request, res: Response)=>  {
        // Step 1: Validate session-id -> transport must already exist for it
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transportsBySessionId.has(sessionId)) {
            const error = {
                jsonrpc: "2.0",
                error: {
                    code: -32_000,
                    message: "Bad Request: No valid session ID provided",
                },
                id: null,
            };
            return res.status(400).json(error);
        }
        // Step 2: Handle the client request using existing transport
        await transportsBySessionId.get(sessionId)?.handleRequest(req, res, req.body);
    }

    app.post(statefulUrl, async (req, res) => {
        // Step 1: create transport object -> this essentially hooks up the http-connection to our mcp-server object
        if(isInitializeRequest(req.body)){
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sessionId) => {
                    transportsBySessionId.set(sessionId, transport);
                },
                onsessionclosed: (sessionId) => {
                    transportsBySessionId.delete(sessionId);
                },
            });
            // Step 2: Get mcp server instance with tools and resources registered
            const mcp = getMcpServer();
            // Step 3: Use transport to hook-up mcp to client -> 1:1 relationship between mcp-server and transport (and therefore client) is established
            await mcp.connect(transport);
            // Step 4: Handle the client request
            await transport.handleRequest(req, res, req.body);
        } else {
            // Client already initialized mcp-connection -> reuse transport
            await handleSessionRequest(req, res);
        }
    });

    // enables server-sent events (server-initiated notifications)
    app.get(statefulUrl, handleSessionRequest);

    // deletes transport and closes connection with mcp-session-id
    app.delete(statefulUrl,  handleSessionRequest);
})(app);

(function addStatelessRoutes(app: Express) {
    const statelessUrl = '/api/mcp/stateless';

    app.post(statelessUrl, async (req, res) => {
        // Undefined sessionIds, no need to handle onsessioninitialized onsessionclosed
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        // Just connect and handle request
        const mcp = getMcpServer();
        await mcp.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on("close", () => {
            transport.close();
            mcp.close();
        });
    });

    // in stateless mode, only POST is needed, GET and DELETE are considered invalid requests
    app.get(statelessUrl, async (req: Request, res: Response) => {
        res.status(405).json({
            jsonrpc: "2.0",
            error: {
                code: -32_600,
                message: "Method not allowed.",
            },
            id: null,
        });
    });

    app.delete("/stateless-mcp", async (req: Request, res: Response) => {
        res.status(405).json({
            jsonrpc: "2.0",
            error: {
                code: -32_600,
                message: "Method not allowed.",
            },
            id: null,
        });
    });
})(app)