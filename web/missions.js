import {LANDMARKS,project} from './spatial.js';

export const HOME={...LANDMARKS[0],name:'Times Square Stable',place:'the stable'};
export const JOBS=[
  {name:'THE OAT JOB',place:'Grand Central',verb:'Steal the premium oats',haul:'Premium oats acquired.',reward:500,stars:2,lon:-73.97722,lat:40.75273},
  {name:'UNSTABLE CARGO',place:'Flatiron',verb:'Lift the imported hay',haul:'The hay has left the building.',reward:900,stars:3,lon:-73.98970,lat:40.74106},
  {name:'THE MANE EVENT',place:'Columbus Circle',verb:'Take the golden horseshoe',haul:'The house does not always win.',reward:1500,stars:4,lon:-73.98192,lat:40.76812}
].map((job,id)=>{const [x,z]=project([job.lon,job.lat]);return {...job,id,x,z}});

export function snapJobs(city){
  for(const job of JOBS){const road=city.safeRoad(job.x,job.z);if(!road)throw new Error('No street near '+job.place);job.x=road.x;job.z=road.z;job.a=road.a;job.b=road.b}
  const home=city.safeRoad(HOME.x,HOME.z);if(!home)throw new Error('No street near the stable');HOME.x=home.x;HOME.z=home.z;
}

export class Crime{
  constructor(){this.job=0;this.reset(true)}
  reset(full=false){
    this.stars=0;this.escape=0;this.health=100;this.hitCooldown=0;this.kickCooldown=0;
    if(full){this.job=0;this.money=0}
    this.stage=this.job<JOBS.length?'pickup':'free';
  }
  get current(){return JOBS[this.job]||null}
  target(){return this.stage==='pickup'?this.current:this.stage==='return'?HOME:null}
  distanceTo(player,point){return Math.hypot(player.x-point.x,player.z-point.z)}
  interact(player,city){
    if(this.kickCooldown>0)return null;this.kickCooldown=.45;
    const job=this.current,goal=this.target();
    if(this.stage==='pickup'&&job&&this.distanceTo(player,job)<12){
      this.stage='evade';this.stars=Math.max(this.stars,job.stars);this.escape=0;
      return {toast:job.haul+' Lose the law!',heat:true};
    }
    if(this.stage==='return'&&this.distanceTo(player,HOME)<14){
      if(this.stars>0)return {toast:'Lose the law before bringing them home.'};
      this.money+=job.reward;this.job++;this.stage=this.job<JOBS.length?'pickup':'free';this.health=100;player.stamina=100;player.exhausted=false;
      return {toast:`JOB COMPLETE · +$${job.reward.toLocaleString()}${this.job===JOBS.length?' · MAXIMUM HORSE.':''}`};
    }
    if(city.nearVehicle(player.x,player.z,6)){
      this.money+=25;this.stars=Math.min(5,this.stars+1);this.escape=0;
      return {toast:'PROPERTY DAMAGE · +$25 · The law noticed.',heat:true};
    }
    return {toast:'A threatening little kick.'};
  }
  prompt(player){
    const job=this.current,goal=this.target();
    if(this.stage==='pickup'&&goal&&this.distanceTo(player,goal)<12)return `<kbd>E</kbd> ${job.verb}`;
    if(this.stage==='return'&&this.distanceTo(player,HOME)<14)return `<kbd>E</kbd> Deliver the haul · $${job.reward.toLocaleString()}`;
    return '';
  }
  update(dt,player,cops,city,seen){
    this.hitCooldown=Math.max(0,this.hitCooldown-dt);this.kickCooldown=Math.max(0,this.kickCooldown-dt);
    const events=[];
    if(this.stars>0){
      for(const cop of cops){
        const dist=this.distanceTo(player,cop.rider);
        if(seen.has(cop)&&dist<4.7&&player.y<2&&this.hitCooldown<=0){
          this.health=Math.max(0,this.health-20);this.hitCooldown=1.3;player.speed*=.4;
          events.push({toast:'THE LAW IS ON YOUR TAIL'});
        }
      }
      this.escape=seen.size?0:Math.min(9,this.escape+dt);
      if(this.escape>=9){
        this.stars=0;this.escape=0;
        if(this.stage==='evade')this.stage='return';
        events.push({toast:'WANTED LEVEL CLEARED'+(this.stage==='return'?' · Return to the stable.':'')});
      }
    }
    if(this.stars===0&&this.distanceTo(player,HOME)<14)this.health=Math.min(100,this.health+15*dt);
    if(this.health<=0)events.push({busted:true});
    return events;
  }
}
