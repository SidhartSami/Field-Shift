// Minimal static file server for dist/ — no Python required.
import {createServer} from 'node:http';
import {createReadStream,statSync} from 'node:fs';
import {extname,join,normalize,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(fileURLToPath(new URL('..',import.meta.url)),'dist');
const preferredPort=Number(process.env.PORT)||8080;
const types={
 '.html':'text/html; charset=utf-8',
 '.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8',
 '.json':'application/json; charset=utf-8',
 '.svg':'image/svg+xml',
 '.png':'image/png',
 '.jpg':'image/jpeg',
 '.jpeg':'image/jpeg',
 '.webp':'image/webp',
 '.gif':'image/gif',
 '.ico':'image/x-icon',
 '.wav':'audio/wav',
 '.woff':'font/woff',
 '.woff2':'font/woff2',
 '.ttf':'font/ttf',
 '.map':'application/json',
 '.txt':'text/plain; charset=utf-8',
 '.gz':'application/gzip',
 '.tar':'application/x-tar'
};

function handler(req,res){
 const url=new URL(req.url||'/',`http://localhost:${server.address()?.port||preferredPort}`);
 let pathname=decodeURIComponent(url.pathname);
 if(pathname.endsWith('/'))pathname+='index.html';
 const filePath=normalize(join(root,pathname));
 if(filePath!==root&&!filePath.startsWith(root+sep)){
  res.writeHead(403).end('Forbidden');
  return;
 }
 let target=filePath;
 try{
  const st=statSync(target);
  if(st.isDirectory())target=join(target,'index.html');
 }catch{
  res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');
  return;
 }
 try{
  const st=statSync(target);
  if(!st.isFile())throw Error('not a file');
  const type=types[extname(target).toLowerCase()]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Content-Length':st.size,'Cache-Control':'no-cache'});
  createReadStream(target).pipe(res);
 }catch{
  res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');
 }
}

const server=createServer(handler);
let port=preferredPort;
server.on('error',err=>{
 if(err.code==='EADDRINUSE'&&port<preferredPort+20){
  port+=1;
  server.listen(port);
  return;
 }
 console.error(err.message);
 process.exit(1);
});
server.listen(port,()=>{
 console.log(`FasalPath serving dist/ at http://localhost:${port}`);
});
