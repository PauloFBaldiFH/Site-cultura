import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const STATE=path.resolve(process.env.CULTURA_STATE_DIR||path.join(ROOT,'automation/state'));
export async function readJSON(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
export async function writeJSON(file,data){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+`.${process.pid}.tmp`;await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n',{mode:0o600});await fs.rename(temp,file);}
export async function locked(work){await fs.mkdir(STATE,{recursive:true,mode:0o700});const lock=path.join(STATE,'lock');try{await fs.mkdir(lock);}catch(e){if(e.code==='EEXIST')throw Error('Outra execução está ativa (ou restou um lock após falha). Consulte a documentação antes de remover o lock.');throw e;}try{return await work();}finally{await fs.rmdir(lock);}}
