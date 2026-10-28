import {handleApi} from '../backend/api.js';

// One Vercel Function shares the existing API and its in-memory caches.
// The rewrite passes the pathname explicitly, independent of URL normalization.
export default {
  fetch(request){
    const url=new URL(request.url);
    const path=url.searchParams.get('__idollog_path');
    url.searchParams.delete('__idollog_path');
    if(path!==null)url.pathname='/api/'+path.replace(/^\/+/, '');
    return handleApi(new Request(url,{method:request.method,headers:request.headers}));
  }
};
