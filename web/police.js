import {Rider} from './simulation.js';
import {LANDMARKS} from './spatial.js';

export function lineOfSight(city,ax,az,bx,bz,range=90){
  const dist=Math.hypot(ax-bx,az-bz);if(dist>range)return false;
  const steps=Math.max(2,Math.ceil(dist/8));
  for(let i=1;i<steps;i++){const t=i/steps;if(city.blocked(ax+(bx-ax)*t,az+(bz-az)*t,.4,true))return false}
  return true;
}

export class Cop{
  constructor(city,horse,index){
    this.city=city;this.horse=horse;this.index=index;this.rider=new Rider(city);this.horse.userData.rider=this.rider;
    this.patrol=LANDMARKS[(index+1)%LANDMARKS.length];this.repath=0;
  }
  update(dt,player,stars,clock){
    const rider=this.rider;
    if(stars===0&&Math.hypot(rider.x-this.patrol.x,rider.z-this.patrol.z)<18)this.patrol=LANDMARKS[(this.index+Math.floor(clock)%LANDMARKS.length)%LANDMARKS.length];
    const dest=stars>0?player:this.patrol;
    const aim=Math.atan2(dest.x-rider.x,dest.z-rider.z);
    let delta=aim-rider.angle;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;
    rider.step(dt,{forward:true,fast:stars>=4,left:delta>.12,right:delta<-.12,unit:true});
    const moving=Math.abs(rider.speed)>.25;const data=this.horse.userData;
    if(data.action){data.action.paused=!moving;data.action.timeScale=Math.max(.3,Math.abs(rider.speed)/13);if(moving&&data.mixer)data.mixer.update(dt)}
    this.horse.position?.set?.(rider.x,rider.y,rider.z);if(this.horse.rotation)this.horse.rotation.y=rider.angle;
    const lights=data.lights;
    if(lights){lights.red.visible=stars>0&&Math.sin(clock*15+this.index)>0;lights.blue.visible=stars>0&&!lights.red.visible}
  }
}

export function reinforce(player,cops,stars){
  if(stars<=0||!cops.length)return;
  const nearby=cops.filter(cop=>Math.hypot(cop.rider.x-player.x,cop.rider.z-player.z)<150);
  if(nearby.length>=2)return;
  const farthest=cops.reduce((a,b)=>Math.hypot(b.rider.x-player.x,b.rider.z-player.z)>Math.hypot(a.rider.x-player.x,a.rider.z-player.z)?b:a);
  const behind={x:player.x-Math.sin(player.angle)*48,z:player.z-Math.cos(player.angle)*48};
  try{farthest.rider.place(behind.x,behind.z)}catch{}
}
