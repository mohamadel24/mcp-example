import {app} from "./express.js";
import {getMcpServer} from "./mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";

app.listen(8000, () => console.log("Server is Listening"));

await getMcpServer().connect(new StdioServerTransport());