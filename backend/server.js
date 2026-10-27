import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {handleApi} from './api.js';

const files = {'/':['index.html','text/html; charset=utf-8'], '/styles.css':['styles.css','text/css; charset=utf-8'], '/app.js':['app.js','text/javascript; charset=utf-8']};
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const response = await handleApi(new Request(url, {method:req.method}));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      return res.end(Buffer.from(await response.arrayBuffer()));
    }
    const file = files[url.pathname];
    if (!file || !['GET','HEAD'].includes(req.method)) {res.writeHead(404); return res.end('Not found');}
    const body = await readFile(new URL(`../frontend/${file[0]}`, import.meta.url));
    res.writeHead(200, {'Content-Type':file[1], 'X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {res.writeHead(500); res.end('Server error');}
});
const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => console.log(`Comeback Club: http://localhost:${port}`));
server.on('error', error => {console.error(error.code === 'EADDRINUSE' ? `포트 ${port}가 사용 중입니다. PORT 환경변수를 변경하세요.` : error.message); process.exitCode = 1;});
