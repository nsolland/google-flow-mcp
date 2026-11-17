import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
test('Hermes discovers Flow MCP and rejects unauthenticated credit spending',async()=>{
 const client=new Client({name:'hermes-flow-regression',version:'1.0.0'},{capabilities:{}});
 await client.connect(new StdioClientTransport({command:process.execPath,args:['src/index.js'],cwd:process.cwd(),env:process.env}));
 try {
  const {tools}=await client.listTools();
  assert.equal(tools.length,17);
  assert.equal(tools.find(tool=>tool.name==='flow_generate_video').inputSchema.properties.auto_confirm.default,false);
  const status=await client.callTool({name:'flow_status',arguments:{}});
  assert.equal(status.isError,undefined);
  const response=await client.callTool({name:'flow_generate_video',arguments:{prompt:'test only: no generation',auto_confirm:true}});
  assert.equal(response.isError,true);
  assert.match(response.content[0].text,/Browser not connected|FLOW_ACCOUNT_UNVERIFIED/);
 } finally { await client.close() }
});
