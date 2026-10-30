// Pure geometry, independent of MediaPipe and WebGL; units are CSS pixels.
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const length=a=>Math.hypot(...a);
const unit=a=>mul(a,1/(length(a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const FINGERS={index:[5,6,9],middle:[9,10,13],ring:[13,14,9],little:[17,18,13]};
export function imageRect(width,height,videoWidth,videoHeight){
 const scale=Math.min(width/videoWidth,height/videoHeight);
 return {width:videoWidth*scale,height:videoHeight*scale,x:(width-videoWidth*scale)/2,y:(height-videoHeight*scale)/2};
}
export function ringTransform(landmarks,rect,config={}){
 if(!Array.isArray(landmarks)||landmarks.length!==21||landmarks.some(p=>!Number.isFinite(p.x+p.y+p.z)))return null;
 const [base,joint,neighbor]=FINGERS[config.finger||'ring']||FINGERS.ring;
 const point=i=>[(landmarks[i].x-.5)*rect.width,-(landmarks[i].y-.5)*rect.height,-landmarks[i].z*rect.width];
 const a=point(base),b=point(joint),segment=sub(b,a),segmentLength=length(segment);
 if(segmentLength<5||landmarks[base].x<0||landmarks[base].x>1||landmarks[base].y<0||landmarks[base].y>1)return null;
 const y=unit(segment);
 let side=sub(point(5),point(17));side=sub(side,mul(y,dot(side,y)));
 if(length(side)<2)return null;
 let x=unit(side),z=unit(cross(x,y));
 // Approximation: keep the setting on the visible side of the finger.
 if(z[2]<0){x=mul(x,-1);z=mul(z,-1)}
 const spacing=length(sub(a,point(neighbor)));
 const radius=Math.max(3,Math.min(80,spacing*.32,segmentLength*.34))*(config.scaleMultiplier||1);
 const position=add(a,mul(segment,config.anchor??.31));
 const offset=config.positionOffset||[0,0,0];
 return {position:add(position,mul(offset,radius)),x,y,z,radius};
}
export class TransformSmoother{
 constructor(tau=75){this.tau=tau;this.value=null;this.last=0}
 reset(){this.value=null;this.last=0}
 update(next,time){
  if(!next)return null;
  if(!this.value||time-this.last>350){this.value=structuredClone(next);this.last=time;return this.value}
  const alpha=1-Math.exp(-Math.max(1,time-this.last)/this.tau);this.last=time;
  const blend=(a,b)=>a.map((v,i)=>v+(b[i]-v)*alpha);
  this.value={position:blend(this.value.position,next.position),x:unit(blend(this.value.x,next.x)),y:unit(blend(this.value.y,next.y)),z:unit(blend(this.value.z,next.z)),radius:this.value.radius+(next.radius-this.value.radius)*alpha};
  return this.value;
 }
}
