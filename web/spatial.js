export const ORIGIN={lon:-73.9855,lat:40.758};
export const MX=111320*Math.cos(ORIGIN.lat*Math.PI/180),MZ=111320;
export function project(p){return [(p[0]-ORIGIN.lon)*MX,-(p[1]-ORIGIN.lat)*MZ]}
export function unproject(x,z){return [x/MX+ORIGIN.lon,-z/MZ+ORIGIN.lat]}
export function inside(x,z,ring){let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;const t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;const px=a[0]+t*dx,pz=a[1]+t*dz;return {d:Math.hypot(x-px,z-pz),x:px,z:pz,t}}
export class SpatialGrid{constructor(size=100){this.size=size;this.cells=new Map()}key(x,z){return `${Math.floor(x/this.size)},${Math.floor(z/this.size)}`}add(item,bounds){const [x0,z0,x1,z1]=bounds;for(let x=Math.floor(x0/this.size);x<=Math.floor(x1/this.size);x++)for(let z=Math.floor(z0/this.size);z<=Math.floor(z1/this.size);z++){const k=`${x},${z}`;if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(item)}}near(x,z,r=1){const s=new Set;for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)for(const o of this.cells.get(this.key(x+a*this.size,z+b*this.size))||[])s.add(o);return [...s]}}
export function boundsOf(ring){return [Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))]}
export function random(seed){let n=Math.sin(seed*127.1+311.7)*43758.5453123;return n-Math.floor(n)}
export const LANDMARKS=[
{name:'Times Square',lon:-73.98513,lat:40.75802,district:'Theater District'},
{name:'Empire State Building',lon:-73.98566,lat:40.74844,district:'Herald Square'},
{name:'Grand Central Terminal',lon:-73.97722,lat:40.75273,district:'Midtown East'},
{name:'Bryant Park',lon:-73.98323,lat:40.75360,district:'Midtown'},
{name:'Rockefeller Center',lon:-73.97867,lat:40.75874,district:'Rockefeller Center'},
{name:'Columbus Circle',lon:-73.98192,lat:40.76812,district:'Central Park South'},
{name:'Flatiron Building',lon:-73.98970,lat:40.74106,district:'Flatiron District'},
{name:'Chrysler Building',lon:-73.97531,lat:40.75165,district:'Turtle Bay'}
].map((p,i)=>({...p,id:i,x:project([p.lon,p.lat])[0],z:project([p.lon,p.lat])[1]}));
