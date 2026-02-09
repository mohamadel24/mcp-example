import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {createPdf, extractFullEtfReportText, extractFullGeneratedResourceText} from "./pdf-util.js";
import {getGeneratedFileNames} from "./files.js";

export function getMcpServer(): McpServer {
    return registerToolsAndResources(new McpServer({
        name: "mcp-example",
        version: "0.0.1"
    },{
        capabilities: {
            tools: {},
            resources: { listChanged: true }
        }
    }));
}

function registerToolsAndResources(mcp: McpServer): McpServer {
   registerResources(mcp);
   registerTools(mcp);
   return mcp;
}

function registerResources(mcp: McpServer) {
    const registerByQuarter = (mcp: McpServer, quarter: 1 | 2 | 3 | 4) =>
        mcp.registerResource(`2025_QUARTER_${quarter}_ETF_PERSPECTIVES`, `file:///resources/etf_perspectives_2025_q${quarter}.pdf`, {
        description: `Retrieves the PDF Report of Vanguard's ETF Perspective for 2025 Quarter ${quarter}.`,
        mimeType: "application/pdf"
    }, async() => {
        return {
            contents : [{
                uri: `file:///resources/etf_perspectives_2025_q${quarter}.pdf`,
                text: await extractFullEtfReportText(quarter)
            }]
        }
    });
    ([1, 2, 3, 4] as const).forEach(quarter => registerByQuarter(mcp, quarter));
    registerPreviouslyGeneratedResources(mcp);
}


function registerTools(mcp: McpServer) {
    mcp.registerTool("add-generated-resource", {
        description: "Adds a generated resource - such as a summary or analysis requested by the user - to the MCP server. " +
            "This enables saving generated results for later use, made accessible as new MCP resources." +
            "The tool will take care of formatting the text in a generated PDF.",
        inputSchema: {
            contents: z.string().describe("The raw text contents of the generated resource."),
            title: z.string().describe("The title of the generated resource."),
            description: z.string().nullish().describe("An optional description of the generated resource."),
            name: z.string().max(80).describe("The file-name of the generated resource, without an extension."),
        },
        outputSchema: z.object({
            success: z.boolean().describe("Whether resource is successfully saved"),
        })
    }, async (args) => {
        try {
            const { name, title, contents, description } = args;
            await createPdf(name, title, contents, description ?? undefined);
            registerGeneratedResource(name, mcp, false);
            return {
                content: [
                    {
                        type: "text",
                        text: "successful",
                    },
                ],
                structuredContent: { success: true },
                isError: false,
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: "unsuccessful",
                    },
                ],
                structuredContent: { success: false },
                isError: true,
            }
        }

    })
}

function registerGeneratedResource(name: string, mcp: McpServer, isInitialSetup = true) {
    mcp.registerResource(`GENERATED_${name.toUpperCase()}`, `file:///generated/${name}.pdf`, {
        description: `Generated PDF Report ${name}.`,
        mimeType: "application/pdf"
    }, async() => {
        return {
            contents : [{
                uri: `file:///generated/${name}.pdf`,
                text: await extractFullGeneratedResourceText(name)
            }]
        }
    });
    // server-initiated notification -> has no effect in stateless mode!
    if(!isInitialSetup) {
        mcp.sendResourceListChanged();
    }
}

function registerPreviouslyGeneratedResources(mcp: McpServer) {
    const generatedFiles = getGeneratedFileNames();
    generatedFiles.forEach((fileName) => registerGeneratedResource(fileName, mcp))
}