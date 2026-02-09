# MCP ETF Reports Demo

This project demos mcp functionality, particularly resources and listChanged functionality for them, 
by exposing a tool that can add new generated resources. 

It demonstrates how server-initiated notifications (such as resource list changed) only work in stateful MCP servers.

## To run:

`npm install`

`npm run build` to transpile from typescript

`npm start` to run the express server

## To connect:

http://localhost:8000/api/mcp/stateful 

or

http://localhost:8000/api/mcp/stateless

or to connect with stdio (mcp-server runs as a subprocess of the client application):

```
"demo-stdio": {
    "command": "node",
    "args": ["*path-to-project*/dist/index.js"]
},
```