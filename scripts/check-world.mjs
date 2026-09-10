import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../web/vendor/three.module.js';
import {City} from '../web/city.js';
import {Rider} from '../web/simulation.js';
import {project,unproject,LANDMARKS,inside} from '../web/spatial.js';
import {Crime,HOME,JOBS,snapJobs} from '../web/missions.js';
import {Cop,lineOfSight} from '../web/police.js';
globalThis.document={createElement(){return {width:1,height:1,getContext(){return {fillRect(){},strokeRect(){},fillText(){}}}}}};
const start=performance.now();const data=JSON.parse(fs.readFileSync(new URL('../web/assets/manhattan.json',import.meta.url)));const scene=new THREE.Scene();const city=new City(scene,data);const rider=new Rider(city);
assert(inside(1,1,[[0,0],[2,0],[2,2],[0,2],[0,0]]));assert(!inside(3,1,[[0,0],[2,0],[2,2],[0,2],[0,0]]));
for(const p of LANDMARKS){const xy=project([p.lon,p.lat]);const ll=unproject(...xy);assert(Math.abs(ll[0]-p.lon)<1e-9);assert(Math.abs(ll[1]-p.lat)<1e-9);const road=rider.place(p.x,p.z);assert(!city.blocked(rider.x,rider.z,.8),p.name+' safe spawn');city.update(rider.x,rider.z,true);for(let i=0;i<240;i++)rider.step(1/60,{forward:true,fast:true,left:i>120});assert(Number.isFinite(rider.x)&&Number.isFinite(rider.z));assert(!city.blocked(rider.x,rider.z,.7));console.log(p.name,Math.round(road.d)+' m from landmark; movement and collision valid')}
rider.place(LANDMARKS[0].x,LANDMARKS[0].z);rider.step(.016,{jump:true});assert(rider.y>0);for(let i=0;i<200;i++)rider.step(.016,{});assert.equal(rider.y,0);assert.equal(rider.speed,0);
snapJobs(city);assert.equal(JOBS.length,3);for(const job of JOBS){assert(!city.blocked(job.x,job.z,.8),job.place+' job drop');assert(Number.isFinite(job.x)&&Number.isFinite(job.z))}assert(!city.blocked(HOME.x,HOME.z,.8),'stable drop');
const crime=new Crime();rider.place(JOBS[0].x,JOBS[0].z);const steal=crime.interact(rider,city);assert.match(steal.toast,/Premium oats/);assert.equal(crime.stage,'evade');assert.equal(crime.stars,2);
const cop=new Cop(city,{userData:{},position:{set(){}},rotation:{}},0);cop.rider.place(LANDMARKS[1].x,LANDMARKS[1].z);for(let i=0;i<120;i++)cop.update(1/60,rider,2,i/60);assert(Number.isFinite(cop.rider.x)&&Number.isFinite(cop.rider.z));assert.equal(lineOfSight(city,HOME.x,HOME.z,HOME.x,HOME.z),true);assert.equal(lineOfSight(city,HOME.x,HOME.z,HOME.x+4000,HOME.z,80),false);
let meshes=0,vertices=0,instances=0;scene.traverse(m=>{if(!m.isMesh)return;meshes++;if(m.isInstancedMesh)instances+=m.count;const pos=m.geometry.attributes.position;if(pos){vertices+=pos.count;assert(pos.array.every(Number.isFinite),'finite geometry');assert(m.position.toArray().every(Number.isFinite),'finite placement')}});
console.log(JSON.stringify({seconds:(performance.now()-start)/1000,buildings:city.buildings.length,chunks:city.chunks.size,meshes,vertices,instances,heapMB:process.memoryUsage().heapUsed/1e6}));
