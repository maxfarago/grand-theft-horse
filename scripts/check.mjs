import {readdir,readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const web=path.join(root,'web');
let count=0;
for(const dir of [web,path.join(web,'vendor'),path.join(root,'scripts')]){
  for(const file of await readdir(dir))if(/\.(m?js)$/.test(file)){
    const result=spawnSync(process.execPath,['--check',path.join(dir,file)],{encoding:'utf8'});
    if(result.status!==0)throw new Error(result.stderr||`Syntax failed: ${file}`);
    count++;
  }
}
for(const file of ['index.html','credits.html']){
  const text=await readFile(path.join(web,file),'utf8');
  for(const match of text.matchAll(/(?:src|href)="([^"]+)"/g)){
    const url=match[1];
    if(!/^(https?:|#|data:)/.test(url))await access(path.resolve(web,url));
  }
}
const data=JSON.parse(await readFile(path.join(web,'assets/manhattan.json'),'utf8'));
if(!data.buildings?.length||!data.roads?.length)throw new Error('Map is missing buildings or roads');
const horse=await readFile(path.join(web,'assets/horse.glb'));
if(horse.readUInt32LE(0)!==0x46546c67||horse.readUInt32LE(4)!==2||horse.readUInt32LE(8)!==horse.length)throw new Error('Invalid GLB model');
console.log(`Checked ${count} JavaScript modules, HTML asset references, map data, and horse GLB header.`);
