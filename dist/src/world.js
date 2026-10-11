export const TAU = Math.PI * 2;
export const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const solid = (map, x, y) => map[Math.floor(y)]?.[Math.floor(x)] !== '.';
export function canOccupy(map, x, y, radius = .2) {
  return ![[x-radius,y-radius],[x+radius,y-radius],[x-radius,y+radius],[x+radius,y+radius]].some(([a,b])=>solid(map,a,b));
}
export function lineOfSight(map, x1, y1, x2, y2) {
  const d=Math.hypot(x2-x1,y2-y1), steps=Math.ceil(d*12);
  for(let i=1;i<=steps;i++)if(solid(map,x1+(x2-x1)*i/steps,y1+(y2-y1)*i/steps))return false;
  return true;
}
export function moveEntity(map, entity, dx, dy, radius=.2) {
  // Substeps keep lunges, low frame rates and sprinting from tunneling through a wall.
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));
  for(let i=0;i<n;i++){
    if(canOccupy(map,entity.x+dx/n,entity.y,radius))entity.x+=dx/n;
    if(canOccupy(map,entity.x,entity.y+dy/n,radius))entity.y+=dy/n;
  }
}

export function moveAirborne(map,entity,dt){
  if(!canOccupy(map,entity.x+entity.vx*dt,entity.y,.14))entity.vx*=-.65;
  if(!canOccupy(map,entity.x,entity.y+entity.vy*dt,.14))entity.vy*=-.65;
  moveEntity(map,entity,entity.vx*dt,entity.vy*dt,.14);
  entity.vz-=8*dt;entity.height=Math.max(0,entity.height+entity.vz*dt);
  if(entity.height===0)entity.vx=entity.vy=entity.vz=0;
}
