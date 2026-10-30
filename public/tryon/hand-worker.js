// MediaPipe's WASM loader uses importScripts to initialize its module factory.
// A classic worker is required; module workers cannot run importScripts.
importScripts('./vendor/vision/vision_bundle.js');
const {HandLandmarker,FilesetResolver}=Vision;
let tracker;
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){
   const files=await FilesetResolver.forVisionTasks(new URL('./vendor/vision/wasm',self.location.href).href);
   tracker=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./models/hand_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
   self.postMessage({type:'ready'});
  }else if(data.type==='frame'){
   const started=performance.now();
   try{const result=tracker.detectForVideo(data.bitmap,data.timestamp);self.postMessage({type:'result',landmarks:result.landmarks[0]||null,inferenceMs:performance.now()-started})}finally{data.bitmap.close()}
  }
 }catch(error){self.postMessage({type:'error',message:error.message||String(error)})}
};
