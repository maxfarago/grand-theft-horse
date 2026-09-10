import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream';

const root=fileURLToPath(new URL('../web/',import.meta.url));
const arg=process.argv.findIndex(value=>value==='--port');
const port=Number(arg>=0?process.argv[arg+1]:(process.env.PORT||4173));
if(!Number.isInteger(port)||port<0||port>65535){console.error('Choose a port between 0 and 65535.');process.exit(1)}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8','.png':'image/png'};

const server=http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end('Method not allowed');return}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end('Bad request');return}
  if(pathname.endsWith('/'))pathname+='index.html';
  const target=path.resolve(root,'.'+pathname);
  const relative=path.relative(root,target);
  if(relative.startsWith('..')||path.isAbsolute(relative)||target.includes('\0')){res.writeHead(403);res.end('Forbidden');return}
  try{
    const info=await stat(target);
    if(!info.isFile())throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD'){res.end();return}
    pipeline(createReadStream(target),res,()=>{});
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found')}
});
server.on('error',error=>{
  if(error.code==='EADDRINUSE')console.error(`Port ${port} is already in use. Try: npm run dev -- --port 4174`);
  else console.error(error.message);
  process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>console.log(`Grand Theft Horse: http://127.0.0.1:${server.address().port}\nEdit web/ and refresh the page. Press Ctrl+C to stop.`));
