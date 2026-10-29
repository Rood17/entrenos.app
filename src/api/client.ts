const base=import.meta.env.VITE_API_URL||'http://localhost:8000/api/v1';
export async function api<T>(path:string,options:RequestInit={},accessToken?:string):Promise<T>{
 const response=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...(accessToken?{Authorization:'Bearer '+accessToken}:{}),...options.headers}});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.detail||'Ocurrió un error al conectar con EntreNos');}
 return response.json() as Promise<T>;
}
export type User={id:number;email:string;username:string;first_name:string};
export async function login(email:string,password:string){return api<{access:string;refresh:string}>('/auth/login/',{method:'POST',body:JSON.stringify({email,password})});}
export async function register(username:string,email:string,password:string){return api<User>('/auth/register/',{method:'POST',body:JSON.stringify({username,email,password})});}
