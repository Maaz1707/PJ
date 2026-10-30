export function cameraError(error){
 return ({NotAllowedError:'Camera permission was denied. Allow camera access in your browser settings, then try again.',NotFoundError:'No camera was found. Connect a camera and try again.',NotReadableError:'Your camera is busy or unavailable. Close other camera apps and retry.',OverconstrainedError:'This camera cannot use the requested settings. Try another camera.',SecurityError:'Camera access is blocked by the browser. Open this page securely in a supported browser.'})[error.name]||`Camera could not start: ${error.message||error.name}`;
}
export class CameraSession{
 constructor(video){this.video=video;this.generation=0;this.stream=null;this.facing='user'}
 async start(facing=this.facing){
  this.stop();const generation=this.generation;
  if(!globalThis.isSecureContext)throw new Error('Camera access requires HTTPS or localhost.');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Your browser does not support camera access. Try a current Safari, Chrome or Edge browser.');
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:960},height:{ideal:720}},audio:false});
  if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return false}
  this.stream=stream;this.facing=facing;this.video.srcObject=stream;
  try{await this.video.play()}catch(error){if(generation===this.generation)this.stop();throw error}
  if(generation!==this.generation)return false;
  this.facing=stream.getVideoTracks()[0].getSettings?.().facingMode||facing;
  return true;
 }
 stop(){this.generation++;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null}
}
