export class Rider{
  constructor(city){this.city=city;this.x=0;this.z=0;this.y=0;this.yVelocity=0;this.speed=0;this.angle=0;this.distance=0;this.lastSafe={x:0,z:0};this.bump=false;this.stamina=100;this.exhausted=false}
  place(x,z){const p=this.city.safeRoad(x,z);if(!p)throw new Error('No accessible street nearby');this.x=p.x;this.z=p.z;this.y=0;this.yVelocity=0;this.speed=0;this.angle=Math.atan2(p.b[0]-p.a[0],p.b[1]-p.a[1]);this.lastSafe={x:this.x,z:this.z};return p}
  step(dt,input){dt=Math.min(dt,.05);if(!input.unit){if(this.stamina<=0)this.exhausted=true;if(this.stamina>20)this.exhausted=false;const draining=input.fast&&input.forward&&!this.exhausted&&this.stamina>0;this.stamina=Math.max(0,Math.min(100,this.stamina+(draining?-19:12)*dt))}const sprint=input.fast&&(input.unit||(!this.exhausted&&this.stamina>0));const forward=input.forward?1:0,back=input.back?1:0;const target=forward?(sprint?20:10.5):back?-3:0;const accel=forward?5.3:back?10:3.5;this.speed+=Math.max(-accel*dt,Math.min(accel*dt,target-this.speed));if(Math.abs(this.speed)<.02)this.speed=0;const steer=(input.left?1:0)-(input.right?1:0);this.angle+=steer*(1.5-Math.min(Math.abs(this.speed)/30,.64))*dt*(this.speed<-.2?-1:1);if(input.jump&&this.y<=0&&this.yVelocity<=0)this.yVelocity=6.5;
    this.yVelocity-=15*dt;this.y+=this.yVelocity*dt;if(this.y<0){this.y=0;this.yVelocity=0}this.bump=false;
    const dx=Math.sin(this.angle)*this.speed*dt,dz=Math.cos(this.angle)*this.speed*dt;let moved=0;
    if(!this.city.blocked(this.x+dx,this.z+dz,.8,this.y>1.25)){this.x+=dx;this.z+=dz;moved=Math.hypot(dx,dz)}else{this.bump=true;if(!this.city.blocked(this.x+dx,this.z,.8,this.y>1.25)){this.x+=dx;moved+=Math.abs(dx)}if(!this.city.blocked(this.x,this.z+dz,.8,this.y>1.25)){this.z+=dz;moved+=Math.abs(dz)}this.speed*=Math.exp(-3.2*dt)}this.distance+=moved;
    const road=this.city.nearestRoad(this.x,this.z);if(road&&road.d<road.road.width*.5)this.lastSafe={x:this.x,z:this.z};return {moved,bump:this.bump};
  }
}
