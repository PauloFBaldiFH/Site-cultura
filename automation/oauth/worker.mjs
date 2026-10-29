// Serviço isolado de autenticação. Não hospeda o site e não acessa o Koha.
const repository = 'PauloFBaldiFH/Site-cultura';
const siteOrigin = 'https://cultura.palotina.org';
const cookieName = '__Host-cultura_oauth_state';
const cookie = value => `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${value ? 600 : 0}`;
const headers = { 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff' };
function random(){ return Array.from(crypto.getRandomValues(new Uint8Array(32)), b=>b.toString(16).padStart(2,'0')).join(''); }
export async function handle(request,env,fetcher=fetch){
  const url=new URL(request.url);
  if(request.method!=='GET')return new Response('Método não permitido',{status:405,headers});
  if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)return new Response('Autenticação ainda não configurada.',{status:503,headers});
  const callback=new URL('/callback',url.origin).href;
  if(url.pathname==='/auth'){
    if(url.searchParams.get('provider')!=='github')return new Response('Provedor inválido',{status:400,headers});
    const state=random(),target=new URL('https://github.com/login/oauth/authorize');
    for(const [k,v]of Object.entries({client_id:env.GITHUB_CLIENT_ID,redirect_uri:callback,scope:'public_repo',state}))target.searchParams.set(k,v);
    return new Response(null,{status:302,headers:{...headers,Location:target.href,'Set-Cookie':cookie(state)}});
  }
  if(url.pathname!=='/callback')return new Response('Não encontrado',{status:404,headers});
  const state=url.searchParams.get('state'),code=url.searchParams.get('code');
  const saved=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!state||!/^[a-f0-9]{64}$/.test(state)||state!==saved||!code||code.length>512)return new Response('Sessão inválida ou expirada. Entre novamente pelo painel.',{status:400,headers:{...headers,'Set-Cookie':cookie('')}});
  try{
    const response=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:callback})});
    const data=await response.json();
    if(!response.ok||typeof data.access_token!=='string'||!/^[A-Za-z0-9_]{20,300}$/.test(data.access_token))throw Error('Falha no login');
    const repo=await fetcher('https://api.github.com/repos/'+repository,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+data.access_token,Accept:'application/vnd.github+json','User-Agent':'cultura-cms-auth'}});
    if(!repo.ok||!(await repo.json()).permissions?.push)return new Response('Sua conta não possui permissão de edição neste repositório.',{status:403,headers:{...headers,'Set-Cookie':cookie('')}});
    const nonce=random();
    const payload=JSON.stringify('authorization:github:success:'+JSON.stringify({token:data.access_token,provider:'github'})).replace(/</g,'\\u003c');
    const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Login da Cultura</title><p>Login autorizado. Retorne ao editor.</p><script nonce="${nonce}">const origin=${JSON.stringify(siteOrigin)};function receive(event){if(event.origin!==origin||event.source!==window.opener)return;window.opener.postMessage(${payload},origin);window.removeEventListener('message',receive);window.close();}window.addEventListener('message',receive);if(window.opener)window.opener.postMessage('authorizing:github',origin);</script></html>`;
    return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Set-Cookie':cookie(''),'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});
  }catch{return new Response('Não foi possível concluir o login. Tente novamente pelo painel.',{status:502,headers:{...headers,'Set-Cookie':cookie('')}});}
}
export default {fetch:(request,env)=>handle(request,env)};
