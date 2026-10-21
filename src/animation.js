// Animation clocks belong to entities; keep the gait across adjacent tiles.
export function updateAnimation(entity, dt, time) {
 const attacking=time<entity.attackUntil;
 const state=attacking?'attack':entity.moving?'walk':'idle';
 const direction=attacking?(entity.attackDirection||entity.direction):entity.direction;
 // Turning during a stride changes the view, not which foot takes the next step.
 if(entity.animationState!==state||(entity.animationDirection!==direction&&state!=='walk')){
  entity.animationTime=0;
 }else if(state!=='attack'){
  // A slower full four-pose stride for the redesigned player; NPC timing is unchanged.
  const tileDuration=entity.sprite==='hero'?240:210;
  entity.animationTime+=dt*(state==='walk'?tileDuration/(entity.step?.duration||tileDuration):1);
 }
 entity.animationState=state;entity.animationDirection=direction;
}
export function characterFrame(entity,time) {
 if(time<entity.attackUntil){
  const duration=Math.max(1,entity.attackUntil-entity.attackStarted);
  return 6+Math.min(3,Math.max(0,Math.floor((time-entity.attackStarted)/duration*4)));
 }
 const elapsed=entity.animationTime||0;
 const poseMs=entity.sprite==='hero'?180:105;
 return entity.moving?2+Math.floor(elapsed/poseMs)%4:Math.floor(elapsed/650)%2;
}
