// Edge-aware one-time sharpening for compact, painted pixel-art assets.
// The source atlas is 80px per building but the grid-aligned sprite is 160px.
// Never smooth the 2x upscale or invent new semi-transparent border pixels.
export function sharpenPixels(data,width,height,{strength=1.3,threshold=7}={}){
 const expected=width*height*4;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||data.length!==expected)
  throw new Error('Invalid sprite pixel buffer');
 const original=new Uint8ClampedArray(data);
 const neighbors=[[-1,0],[1,0],[0,-1],[0,1]];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=(y*width+x)*4,a=original[at+3];
  if(a<32)continue;
  // Use opaque neighbors only; averaging transparent RGB produces dirty halos.
  const nearby=[];
  for(const [dx,dy] of neighbors){
   const xx=x+dx,yy=y+dy;
   if(xx<0||yy<0||xx>=width||yy>=height)continue;
   const ni=(yy*width+xx)*4;
   if(original[ni+3]>=Math.min(a,128))nearby.push(ni);
  }
  if(nearby.length<2)continue;
  for(let channel=0;channel<3;channel++){
   const center=original[at+channel];
   const average=nearby.reduce((sum,ni)=>sum+original[ni+channel],0)/nearby.length;
   const contrast=center-average;
   if(Math.abs(contrast)<threshold)continue;
   data[at+channel]=Math.max(0,Math.min(255,Math.round(center+strength*contrast)));
  }
 }
 return data;
}
export function sharpenCanvas(canvas,{strength=1.3,threshold=7}={}){
 const c=canvas.getContext('2d');
 if(!c?.getImageData||!c?.putImageData)return false;
 const frame=c.getImageData(0,0,canvas.width,canvas.height);
 sharpenPixels(frame.data,canvas.width,canvas.height,{strength,threshold});
 c.putImageData(frame,0,0);
 return true;
}
