// Inference is isolated from rendering. Worker first; throttled main-thread fallback.
export class HandTracker{
 constructor(onResult){this.onResult=onResult;this.closed=false;this.busy=false;this.last=0;this.frameTime=-1;this.inferenceMs=0}
 async init(){
  try{await this.initWorker();this.engine='worker'}catch(error){
   if(this.closed)throw error;
   this.worker?.terminate();this.worker=null;console.warn('Hand tracking worker unavailable; using local main-thread inference.',error);
   const {HandLandmarker,FilesetResolver}=await import('./vendor/vision/vision_bundle.mjs');
   const files=await FilesetResolver.forVisionTasks(new URL('./vendor/vision/wasm',import.meta.url).href);
   this.task=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./models/hand_landmarker.task',import.meta.url).href,delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
   if(this.closed){this.task.close();throw Error('Tracking cancelled')}
   this.engine='main';
  }
 }
 initWorker(){return new Promise((resolve,reject)=>{
  const worker=this.worker=new Worker(new URL('./hand-worker.js',import.meta.url));
  let ready=false;const timer=setTimeout(()=>reject(Error('Tracking worker initialization timed out')),25000);
  this.cancelInit=()=>{clearTimeout(timer);reject(Error('Tracking cancelled'))};
  worker.onerror=e=>{clearTimeout(timer);if(!ready)reject(Error(e.message));else this.fail(e.message)};
  worker.onmessage=({data})=>{
   if(this.closed)return;
   if(data.type==='ready'){ready=true;clearTimeout(timer);this.cancelInit=null;resolve()}
   if(data.type==='error'){clearTimeout(timer);if(!ready)reject(Error(data.message));else this.fail(data.message)}
   if(data.type==='result'){this.busy=false;this.inferenceMs=data.inferenceMs;this.onResult(data.landmarks,data.inferenceMs)}
  };worker.postMessage({type:'init'});
 })}
 fail(message){this.busy=false;this.onError?.(Error(message))}
 async frame(video,now){
  if(this.closed||this.busy||video.readyState<2||video.currentTime===this.frameTime||now-this.last<Math.max(50,this.inferenceMs*1.15))return;
  this.last=now;this.frameTime=video.currentTime;this.busy=true;
  try{
   if(this.worker){const bitmap=await createImageBitmap(video,{resizeWidth:640,resizeHeight:Math.round(640*video.videoHeight/video.videoWidth)});if(this.closed){bitmap.close();return}this.worker.postMessage({type:'frame',bitmap,timestamp:now},[bitmap])}
   else{const start=performance.now(),result=this.task.detectForVideo(video,now);this.inferenceMs=performance.now()-start;this.busy=false;this.onResult(result.landmarks[0]||null,this.inferenceMs)}
  }catch(error){this.busy=false;if(!this.closed)this.fail(error.message)}
 }
 close(){this.closed=true;this.cancelInit?.();this.worker?.terminate();this.task?.close();this.worker=null;this.task=null}
}
