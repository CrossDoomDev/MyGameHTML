// Animation clocks belong to entities; keep the gait across adjacent tiles.
export function updateAnimation(entity, dt, time) {
 const attacking=time<entity.attackUntil;
 const state=attacking?'attack':entity.moving?'walk':'idle';
 const direction=attacking?(entity.attackDirection||entity.direction):entity.direction;
 if(entity.animationState!==state||entity.animationDirection!==direction){
  entity.animationState=state;entity.animationDirection=direction;entity.animationTime=0;
 }else if(state!=='attack'){
  entity.animationTime+=dt*(state==='walk'?210/(entity.step?.duration||210):1);
 }
}
export function characterFrame(entity,time) {
 if(time<entity.attackUntil){
  const duration=Math.max(1,entity.attackUntil-entity.attackStarted);
  return 6+Math.min(3,Math.max(0,Math.floor((time-entity.attackStarted)/duration*4)));
 }
 const elapsed=entity.animationTime||0;
 return entity.moving?2+Math.floor(elapsed/105)%4:Math.floor(elapsed/650)%2;
}
