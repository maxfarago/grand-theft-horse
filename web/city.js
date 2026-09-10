import * as THREE from 'three';
import {project,inside,segmentDistance,SpatialGrid,boundsOf,random} from './spatial.js';

const clamp=THREE.MathUtils.clamp;
function buffer(){return {p:[],n:[],uv:[],c:[]}}
function vertex(b,p,n,uv,c){b.p.push(...p);b.n.push(...n);b.uv.push(...uv);b.c.push(c.r,c.g,c.b)}
function tri(b,a,d,c,n,uvs,col){vertex(b,a,n,uvs[0],col);vertex(b,d,n,uvs[1],col);vertex(b,c,n,uvs[2],col)}
function quad(b,a,d,c,e,n,uv,col){tri(b,a,d,c,n,[uv[0],uv[1],uv[2]],col);tri(b,a,c,e,n,[uv[0],uv[2],uv[3]],col)}
function geometry(b){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));g.computeBoundingSphere();return g}
const white=new THREE.Color(0xffffff);
function ribbon(b,a,c,width,y,color=white){const dx=c[0]-a[0],dz=c[1]-a[1],l=Math.hypot(dx,dz);if(l<.05)return;const nx=-dz/l*width/2,nz=dx/l*width/2;quad(b,[a[0]-nx,y,a[1]-nz],[a[0]+nx,y,a[1]+nz],[c[0]+nx,y,c[1]+nz],[c[0]-nx,y,c[1]-nz],[0,1,0],[[0,0],[width,0],[width,l],[0,l]],color)}
function disk(b,p,r,y,col=white){for(let i=0;i<12;i++){const a=i/12*Math.PI*2,c=(i+1)/12*Math.PI*2;tri(b,[p[0],y,p[1]],[p[0]+Math.cos(c)*r,y,p[1]+Math.sin(c)*r],[p[0]+Math.cos(a)*r,y,p[1]+Math.sin(a)*r],[0,1,0],[[0,0],[1,0],[0,1]],col)}}
function polygon(b,ring,holes,y,color){const r=ring.slice(0,-1).map(p=>new THREE.Vector2(...p));const hs=holes.map(h=>h.slice(0,-1).map(p=>new THREE.Vector2(...p)));const all=r.concat(...hs);for(const t of THREE.ShapeUtils.triangulateShape(r,hs)){let a=all[t[0]],c=all[t[1]],d=all[t[2]];tri(b,[a.x,y,a.y],[d.x,y,d.y],[c.x,y,c.y],[0,1,0],[[a.x,a.y],[d.x,d.y],[c.x,c.y]],color)}}
function facadeMaterial(style){
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.75,metalness:.05,side:THREE.DoubleSide});
  mat.onBeforeCompile=s=>{
    s.uniforms.uStyle={value:style};s.uniforms.uNight={value:0};mat.userData.shader=s;
    s.vertexShader='varying vec2 vFacadeUV; varying float vRoof;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFacadeUV=uv; vRoof=abs(normal.y);');
    s.fragmentShader='uniform float uStyle; uniform float uNight; varying vec2 vFacadeUV; varying float vRoof;\nfloat facadeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float floorH=uStyle>1.5?3.7:3.35;
      vec2 grid=vFacadeUV/vec2(uStyle>1.5?2.35:2.8,floorH);
      vec2 cell=fract(grid);float rnd=facadeHash(floor(grid));
      float glassStyle=step(1.5,uStyle);float wm=mix(.23,.07,glassStyle);
      float win=smoothstep(wm,wm+.035,cell.x)*(1.-smoothstep(1.-wm-.035,1.-wm,cell.x))*smoothstep(.18,.22,cell.y)*(1.-smoothstep(.81,.85,cell.y));
      win*=1.-step(.5,vRoof);
      vec3 stone=diffuseColor.rgb;
      float noise=facadeHash(floor(vFacadeUV*16.));stone*=.95+noise*.1;
      float ledge=smoothstep(.92,.94,cell.y)*(1.-smoothstep(.985,1.,cell.y));
      stone=mix(stone,stone*.69,ledge*(1.-vRoof));
      if(uStyle<.5){vec2 brick=fract(vFacadeUV*vec2(2.5,6.)+vec2(mod(floor(vFacadeUV.y*6.),2.)*.5,0.));float grout=step(.94,brick.x)+step(.89,brick.y);stone=mix(stone,stone*.73,min(grout,1.)*.6);}
      vec3 glass=mix(vec3(.095,.15,.19),vec3(.37,.48,.54),rnd*.55+.16);
      glass+=vec3(.055,.038,.005)*smoothstep(.2,1.,cell.y);
      float blind=step(.68,rnd)*step(.55,cell.y);glass=mix(glass,vec3(.3,.31,.28),blind*.55);
      float lit=step(.84,rnd)*uNight;
      glass=mix(glass,vec3(.94,.66,.28),lit);
      diffuseColor.rgb=mix(stone,glass,win);
      diffuseColor.rgb*=mix(.71,1.,smoothstep(0.,18.,vFacadeUV.y));
      float shop=1.-smoothstep(3.4,4.4,vFacadeUV.y);shop*=1.-vRoof;
      float shopWin=step(.12,fract(vFacadeUV.x/4.))*step(fract(vFacadeUV.x/4.),.88)*step(.45,vFacadeUV.y)*step(vFacadeUV.y,3.4)*shop;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.055,.09,.105),shopWin*.8);
      diffuseColor.rgb=mix(diffuseColor.rgb,stone*.71,step(.5,vRoof));`);
    s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.88,.28,win);');
    s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.62,.24)*lit*win*.55;');
  };mat.customProgramCacheKey=()=>`facade-${style}`;return mat;
}
function streetMaterial(){const mat=new THREE.MeshStandardMaterial({color:0x44494c,roughness:.96,side:THREE.DoubleSide});mat.onBeforeCompile=s=>{s.vertexShader='varying vec3 vStreet;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStreet=position;');s.fragmentShader='varying vec3 vStreet;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float grain=fract(sin(dot(floor(vStreet.xz*32.),vec2(12.9898,78.233)))*43758.5453);
diffuseColor.rgb*=.87+grain*.23;
float crack=step(.997,fract(sin(floor(vStreet.x*.23))*418.1+vStreet.z*.065));diffuseColor.rgb*=1.-crack*.35;`)};return mat}
export class City{
  constructor(scene,data){
    this.scene=scene;this.data=data;this.chunks=new Map();this.collision=new SpatialGrid(70);this.roadGrid=new SpatialGrid(100);this.roads=[];this.parks=[];this.water=[];this.buildings=[];this.pending=[];this.visibleRadius=920;this.lastX=Infinity;this.lastZ=Infinity;
    this.materials=[facadeMaterial(0),facadeMaterial(1),facadeMaterial(2),facadeMaterial(3)];
    const b=data.bounds;const tl=project([b.west,b.north]),br=project([b.east,b.south]);this.bounds=[tl[0]+20,tl[1]+20,br[0]-20,br[1]-20];
    for(const raw of data.buildings){if(raw.suppressOutline)continue;const r=raw.ring.map(project),holes=(raw.holes||[]).map(h=>h.map(project)),bounds=boundsOf(r);if(bounds.some(v=>!Number.isFinite(v)))continue;const seed=parseInt(raw.id.replace(/\D/g,''))||1;const style=raw.height>95?2+(seed%2):raw.height>45?1+(seed%3):seed%2;const item={...raw,r,holes,bounds,seed,style};this.buildings.push(item);if(raw.minHeight<2.5)this.collision.add(item,bounds);const x=(bounds[0]+bounds[2])/2,z=(bounds[1]+bounds[3])/2,key=`${Math.floor(x/180)},${Math.floor(z/180)}`;if(!this.chunks.has(key))this.chunks.set(key,{x:Math.floor(x/180)*180+90,z:Math.floor(z/180)*180+90,buildings:[],group:null});this.chunks.get(key).buildings.push(item)}
    const roadKinds=new Set(['motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','service','primary_link','secondary_link','tertiary_link']);
    for(const r of data.roads){const drive=roadKinds.has(r.kind);const p=r.points.map(project);if(p.length<2)continue;const name=r.name||'';const width=drive?clamp(r.width||((r.lanes||(/Avenue|Broadway/.test(name)?4:2))*3.05+3.4),7,32):r.kind==='pedestrian'?8:2.4;const item={...r,p,width,drive};this.roads.push(item);for(let i=1;i<p.length;i++){if(drive){const seg={a:p[i-1],b:p[i],road:item};this.roadGrid.add(seg,boundsOf([seg.a,seg.b]))}}}
    for(const raw of data.parks){this.parks.push({...raw,r:raw.ring.map(project),holes:(raw.holes||[]).map(h=>h.map(project))})}
    for(const raw of data.water){const item={...raw,r:raw.ring.map(project),holes:(raw.holes||[]).map(h=>h.map(project))};this.water.push(item)}
    this.buildGround();this.buildRoads();this.buildSkyline();this.buildProps();
  }
  addBuffer(b,mat,group=this.scene,shadow=false){if(!b.p.length)return;const mesh=new THREE.Mesh(geometry(b),mat);mesh.receiveShadow=true;mesh.castShadow=shadow;group.add(mesh);return mesh}
  buildGround(){
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(18000,18000),new THREE.MeshStandardMaterial({color:0x989893,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;this.scene.add(ground);
    const parks=buffer(),water=buffer();for(const p of this.parks)polygon(parks,p.r,p.holes,.015,new THREE.Color(0x687b49));for(const p of this.water)polygon(water,p.r,p.holes,.03,new THREE.Color(0x557a87));
    this.addBuffer(parks,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));this.addBuffer(water,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.2,metalness:.45,side:THREE.DoubleSide}));
  }
  buildRoads(){
    const road=buffer(),path=buffer(),yellow=buffer(),whiteLines=buffer(),curbs=buffer();const nodeSeen=new Set;const lineCol=new THREE.Color(0xe5d9b8);const curbCol=new THREE.Color(0xb7b7ac);
    for(const r of this.roads){let acc=0;for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.1)continue;const tx=dx/len,tz=dz/len,nx=-tz,nz=tx;
      ribbon(r.drive?road:path,a,b,r.width,r.drive?.06:.085);
      if(!r.drive)continue;
      for(const side of [-1,1]){const off=r.width/2+.08;ribbon(curbs,[a[0]+nx*off*side,a[1]+nz*off*side],[b[0]+nx*off*side,b[1]+nz*off*side],.2,.10,curbCol)}
      for(const p of [a,b]){const key=`${p[0].toFixed(1)},${p[1].toFixed(1)}`;if(!nodeSeen.has(key)){disk(road,p,r.width/2,.062);nodeSeen.add(key)}}
      if(r.width>10&&len>3){for(let t=(9-acc%9)%9;t<len-2;t+=9){const e=Math.min(t+3.8,len-1);const a2=[a[0]+tx*t,a[1]+tz*t],b2=[a[0]+tx*e,a[1]+tz*e];if(r.oneway==='yes'){ribbon(whiteLines,a2,b2,.14,.082,lineCol)}else{for(const off of [-.13,.13])ribbon(yellow,[a2[0]+nx*off,a2[1]+nz*off],[b2[0]+nx*off,b2[1]+nz*off],.10,.083)}}}
      acc+=len;
    }
    // Long ways terminate at intersections in OSM; place crossings back from their ends.
    if(r.drive&&r.p.length>1&&r.kind!=='service'){const total=r.p.reduce((s,p,i)=>i?s+Math.hypot(p[0]-r.p[i-1][0],p[1]-r.p[i-1][1]):0,0);if(total>45)for(const reverse of [false,true]){const pts=reverse?[...r.p].reverse():r.p;const a=pts[0];let dest=pts.find(p=>Math.hypot(p[0]-a[0],p[1]-a[1])>16);if(!dest)continue;const d=Math.hypot(dest[0]-a[0],dest[1]-a[1]),tx=(dest[0]-a[0])/d,tz=(dest[1]-a[1])/d;const center=[a[0]+tx*12,a[1]+tz*12];for(let s=-r.width/2+1;s<r.width/2-1;s+=1.7){const p=[center[0]-tz*s,center[1]+tx*s];ribbon(whiteLines,[p[0]-tx*1.7,p[1]-tz*1.7],[p[0]+tx*1.7,p[1]+tz*1.7],.8,.085,lineCol)}}}
    }
    this.addBuffer(road,streetMaterial());this.addBuffer(path,new THREE.MeshStandardMaterial({color:0xaaa89c,roughness:1,side:THREE.DoubleSide}));this.addBuffer(curbs,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));this.addBuffer(yellow,new THREE.MeshStandardMaterial({color:0xd4b557,roughness:.86,side:THREE.DoubleSide}));this.addBuffer(whiteLines,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,side:THREE.DoubleSide}));
  }
  buildingGeometry(b,out,low=false){
    const palettes=[['#795c4a','#8d7463','#685447','#967a68'],['#b8b1a0','#a7a79f','#c7beac','#908b7f'],['#829398','#6b7b83','#939b9b','#799095'],['#687a87','#546c7c','#7c8e99','#82918f']];
    const col=new THREE.Color(palettes[b.style][b.seed%4]);const base=Math.max(.12,b.minHeight),height=b.height;
    if(height<=base)return;
    const rings=[b.r,...b.holes];for(let ri=0;ri<rings.length;ri++){let ring=rings[ri];const signed=ring.reduce((s,p,i)=>i?s+ring[i-1][0]*p[1]-p[0]*ring[i-1][1]:s,0);if((signed>0)!==(ri===0))ring=[...ring].reverse();let u=0;
      for(let i=1;i<ring.length;i++){const a=ring[i-1],d=ring[i],dx=d[0]-a[0],dz=d[1]-a[1],len=Math.hypot(dx,dz);if(len<.015)continue;quad(out,[a[0],base,a[1]],[a[0],height,a[1]],[d[0],height,d[1]],[d[0],base,d[1]],[dz/len,0,-dx/len],[[u,base],[u,height],[u+len,height],[u+len,base]],col);u+=len}
    }
    if(!low)polygon(out,b.r,b.holes,height,col);
  }
  buildSkyline(){for(const chunk of this.chunks.values()){const buf=buffer();for(const b of chunk.buildings)if(b.height>110)this.buildingGeometry(b,buf,true);chunk.far=this.addBuffer(buf,this.materials[2])}}
  makeChunk(chunk){const group=new THREE.Group();const buffers=[buffer(),buffer(),buffer(),buffer()];for(const b of chunk.buildings)this.buildingGeometry(b,buffers[b.style]);buffers.forEach((b,i)=>this.addBuffer(b,this.materials[i],group,true));this.scene.add(group);chunk.group=group;if(chunk.far)chunk.far.visible=false}
  update(x,z,force=false){if(force||Math.hypot(x-this.lastX,z-this.lastZ)>60){this.lastX=x;this.lastZ=z;this.pending=[];for(const chunk of this.chunks.values()){const d=Math.hypot(x-chunk.x,z-chunk.z);if(chunk.group)chunk.group.visible=d<this.visibleRadius+220;if(chunk.far)chunk.far.visible=!chunk.group?.visible;if(d<this.visibleRadius&&!chunk.group)this.pending.push(chunk)}this.pending.sort((a,b)=>Math.hypot(x-a.x,z-a.z)-Math.hypot(x-b.x,z-b.z))}let built=0;while(this.pending.length&&built<(force?14:1)){this.makeChunk(this.pending.shift());built++}}
  blocked(x,z,radius=.9,skipVehicles=false){if(x<this.bounds[0]||x>this.bounds[2]||z<this.bounds[1]||z>this.bounds[3])return true;for(const b of this.collision.near(x,z,0)){if(inside(x,z,b.r)&&!b.holes.some(h=>inside(x,z,h)))return true;for(let i=1;i<b.r.length;i++)if(segmentDistance(x,z,b.r[i-1],b.r[i]).d<radius)return true}if(!skipVehicles&&this.vehicleGrid)for(const c of this.vehicleGrid.near(x,z,0)){const dx=x-c.x,dz=z-c.z,lx=dx*Math.cos(c.angle)-dz*Math.sin(c.angle),lz=dx*Math.sin(c.angle)+dz*Math.cos(c.angle);if(Math.abs(lx)<.96+radius&&Math.abs(lz)<2.26+radius)return true}for(const w of this.water)if(inside(x,z,w.r)&&!w.holes.some(h=>inside(x,z,h)))return true;return false}
  nearestRoad(x,z){let best=null;let list=this.roadGrid.near(x,z,1);if(!list.length)list=this.roadGrid.near(x,z,8);for(const s of list){const d=segmentDistance(x,z,s.a,s.b);if(!best||d.d<best.d)best={...d,...s}}return best}
  nearVehicle(x,z,radius=6){if(!this.vehicleGrid)return null;let best=null;for(const car of this.vehicleGrid.near(x,z,0)){const d=Math.hypot(x-car.x,z-car.z);if(d<radius&&(!best||d<best.d))best={...car,d}}return best}
  safeRoad(x,z){let best=null;for(const s of this.roadGrid.near(x,z,4)){for(const t of [.2,.5,.8]){const px=s.a[0]+(s.b[0]-s.a[0])*t,pz=s.a[1]+(s.b[1]-s.a[1])*t,d=Math.hypot(x-px,z-pz);if((!best||d<best.d)&&!this.blocked(px,pz,1.2))best={x:px,z:pz,d,a:s.a,b:s.b,road:s.road}}}return best||this.nearestRoad(x,z)}
  instances(geo,mat,items){if(!items.length)return;const mesh=new THREE.InstancedMesh(geo,mat,items.length);const o=new THREE.Object3D();items.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.rotation.set(p.rx||0,p.ry||0,p.rz||0);o.scale.set(p.sx||1,p.sy||1,p.sz||1);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);if(p.color)mesh.setColorAt(i,new THREE.Color(p.color))});mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);return mesh}
  buildProps(){
    const poles=[],arms=[],lamps=[],trunks=[],leaves=[],signals=[];this.carSeeds=[];const seen=new Set;let seed=1;
    for(const r of this.roads){if(!r.drive||r.kind==='service')continue;for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<12)continue;const tx=dx/len,tz=dz/len,nx=-tz,nz=tx;for(let t=15;t<len;t+=48){seed++;const side=seed%2?1:-1;const x=a[0]+tx*t+nx*(r.width/2+1.5)*side,z=a[1]+tz*t+nz*(r.width/2+1.5)*side;const key=`${Math.floor(x/15)},${Math.floor(z/15)}`;if(seen.has(key)||this.blocked(x,z,.2))continue;seen.add(key);poles.push({x,y:3.2,z,sx:.11,sy:6.4,sz:.11});arms.push({x:x-nx*side*.9,y:6.25,z:z-nz*side*.9,sx:.09,sy:.09,sz:1.9,ry:Math.atan2(nx,nz)});lamps.push({x:x-nx*side*1.7,y:6.2,z:z-nz*side*1.7,sx:.38,sy:.12,sz:.78,ry:Math.atan2(nx,nz)});
      if(random(seed)>.68){const px=x+tx*8,pz=z+tz*8;if(!this.blocked(px,pz,1.2)){trunks.push({x:px,y:2.3,z:pz,sx:.26,sy:4.6,sz:.26});for(let l=0;l<3;l++)leaves.push({x:px+Math.sin(l*2.3)*1.1,y:5.2+l*.65,z:pz+Math.cos(l*2.3)*1.1,sx:2.3,sy:2.5,sz:2.1,color:['#52653c','#647447','#748251'][seed%3]})}}
    }
    if(len>30&&random(seed+i)>.65){this.carSeeds.push({x:a[0]+dx*.5+nx*r.width*.21,z:a[1]+dz*.5+nz*r.width*.21,angle:Math.atan2(dx,dz),seed:seed+i})}
    }if(r.p.length>1&&random(seed++)>.83){const p=r.p[0],b=r.p[1],ang=Math.atan2(b[0]-p[0],b[1]-p[1]);signals.push({x:p[0]+Math.cos(ang)*(r.width/2+.5),y:4.5,z:p[1]-Math.sin(ang)*(r.width/2+.5),sx:.42,sy:1.1,sz:.38,ry:ang})}}
    // Seed trees throughout mapped park polygons, preserving paths and ponds.
    for(const p of this.parks){const bb=boundsOf(p.r);let count=0;for(let x=bb[0]+4;x<bb[2];x+=16)for(let z=bb[1]+4;z<bb[3];z+=16){seed++;const px=x+random(seed)*10,pz=z+random(seed+3)*10;if(++count>3200)break;if(!inside(px,pz,p.r)||p.holes.some(h=>inside(px,pz,h))||this.blocked(px,pz,1))continue;const near=this.nearestRoad(px,pz);if(near?.d<near.road.width/2+3)continue;const h=5+random(seed)*3;trunks.push({x:px,y:h/2,z:pz,sx:.3,sy:h,sz:.3});for(let l=0;l<3;l++)leaves.push({x:px+Math.sin(l*2.1)*1.4,y:h+l*.6,z:pz+Math.cos(l*2.1)*1.4,sx:2.8,sy:3,sz:2.6,color:['#4d613c','#667648','#758157'][seed%3]})}}
    const dark=new THREE.MeshStandardMaterial({color:0x354246,metalness:.65,roughness:.5});const box=new THREE.BoxGeometry(1,1,1);this.instances(new THREE.CylinderGeometry(1,1,1,7),dark,poles);this.instances(box,dark,arms);this.instances(box,new THREE.MeshStandardMaterial({color:0xe9dcb5,emissive:0xffdb99,emissiveIntensity:.3}),lamps);this.instances(new THREE.CylinderGeometry(.7,1,1,6),new THREE.MeshStandardMaterial({color:0x59483b,roughness:1}),trunks);this.instances(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),leaves);this.instances(box,new THREE.MeshStandardMaterial({color:0xbaa352,metalness:.2,roughness:.8}),signals);
    this.makeParkedCars();this.makeBillboards();
  }
  makeParkedCars(){const bodies=[],tops=[],wheels=[],lights=[],taxiSigns=[];const colors=['#e9b625','#d8ac25','#272d35','#a6b0b4','#ddd9cf','#263948'];for(const c of this.carSeeds.slice(0,800)){if(this.blocked(c.x,c.z,1))continue;const a=c.angle,color=colors[c.seed%colors.length];bodies.push({x:c.x,y:.65,z:c.z,sx:1.85,sy:.65,sz:4.5,ry:a,color});tops.push({x:c.x,y:1.22,z:c.z,sx:1.65,sy:.62,sz:2.3,ry:a,color});for(const sx of [-.91,.91])for(const sz of [-1.42,1.42])wheels.push({x:c.x+sx*Math.cos(a)+sz*Math.sin(a),y:.4,z:c.z-sx*Math.sin(a)+sz*Math.cos(a),rx:Math.PI/2,rz:Math.PI/2,ry:a,sx:.36,sy:.2,sz:.36});for(const side of [-.66,.66])lights.push({x:c.x+side*Math.cos(a)+2.25*Math.sin(a),y:.72,z:c.z-side*Math.sin(a)+2.25*Math.cos(a),sx:.38,sy:.17,sz:.05,ry:a});if(c.seed%6<2)taxiSigns.push({x:c.x,y:1.7,z:c.z,sx:.75,sy:.25,sz:.3,ry:a})}
    const box=new THREE.BoxGeometry(1,1,1);this.instances(box,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.32,metalness:.25}),bodies);this.instances(box,new THREE.MeshStandardMaterial({color:0x32444d,roughness:.18,metalness:.38}),tops);this.instances(new THREE.CylinderGeometry(1,1,1,10),new THREE.MeshStandardMaterial({color:0x1a1c1d,roughness:1}),wheels);this.instances(box,new THREE.MeshStandardMaterial({color:0xffecc0,emissive:0xffdda0,emissiveIntensity:.5}),lights);this.instances(box,new THREE.MeshStandardMaterial({color:0xeedda7}),taxiSigns);this.vehicleGrid=new SpatialGrid(70);for(const c of bodies){const item={x:c.x,z:c.z,angle:c.ry};this.vehicleGrid.add(item,[c.x-4,c.z-4,c.x+4,c.z+4])}
  }
  makeBillboards(){
    const entries=[[-73.98583,40.75789,'BROADWAY','THE CITY IS THE STAGE','#671b37'],[-73.98484,40.75832,'NEW YORK','A MILLION POSSIBILITIES','#183887'],[-73.98620,40.75742,'AFTER HOURS','LIVE TONIGHT','#17676b'],[-73.98440,40.75858,'THE BIG APPLE','MAKE SOME NOISE','#bc431c']];
    for(const [lon,lat,title,sub,bg] of entries){const [x,z]=project([lon,lat]);let best=null;for(const b of this.collision.near(x,z,1))for(let i=1;i<b.r.length;i++){const a=b.r[i-1],end=b.r[i],len=Math.hypot(end[0]-a[0],end[1]-a[1]);if(len<10||b.height<20)continue;const n=segmentDistance(x,z,a,end);if(!best||n.d<best.d)best={...n,a,end,len}}if(!best)continue;
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,768,512);ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;ctx.strokeRect(25,25,718,462);ctx.fillStyle='#fff7e9';ctx.textAlign='center';ctx.font='bold 78px Arial';const words=title.split(' ');if(words.length>1){ctx.fillText(words[0],384,205,680);ctx.fillText(words.slice(1).join(' '),384,295,680)}else ctx.fillText(title,384,265,680);ctx.font='21px Arial';ctx.fillText(sub,384,425,680);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(best.len*.78,20),13),new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.55,side:THREE.DoubleSide,roughness:.5}));const dx=best.end[0]-best.a[0],dz=best.end[1]-best.a[1],l=Math.hypot(dx,dz);mesh.rotation.y=Math.atan2(-dz,dx);const nx=-dz/l,nz=dx/l;const side=this.blocked(best.x+nx, best.z+nz,.1)?-1:1;mesh.position.set(best.x+nx*.25*side,17,best.z+nz*.25*side);this.scene.add(mesh);
    }
  }
  setNight(v){for(const m of this.materials)if(m.userData.shader)m.userData.shader.uniforms.uNight.value=v}
}
