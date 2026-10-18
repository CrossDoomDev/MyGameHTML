export function sceneryPlacement(object,sprite){
 return {x:Math.round(object.px-sprite.width/2),y:Math.round(object.py-sprite.height+(object.offset||0)),width:sprite.width,height:sprite.height,depth:object.py};
}
export function buildingPlacement(building,sprite,tile=32){
 const bottom=(building.y+building.h)*tile;
 return {x:Math.round((building.x+building.w/2)*tile-sprite.width/2),y:bottom-sprite.height,width:sprite.width,height:sprite.height,depth:bottom-4};
}
// Match the visible body, excluding the large transparent margins of hero cells.
export function actorBounds(actor){
 const height=actor.kind==='herb'?21:actor.sprite==='hero3d'?54:36;
 return {left:actor.px-11,right:actor.px+11,top:actor.py-height,bottom:actor.py-2};
}
export function coversActor(placement,actor,mask){
 if(placement.depth<=actor.py)return false;
 const body=actorBounds(actor);
 const left=Math.max(0,Math.floor(body.left-placement.x)),right=Math.min(placement.width,Math.ceil(body.right-placement.x));
 const top=Math.max(0,Math.floor(body.top-placement.y)),bottom=Math.min(placement.height,Math.ceil(body.bottom-placement.y));
 if(left>=right||top>=bottom)return false;
 if(!mask)return true;
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(mask[y*placement.width+x])return true;
 return false;
}
