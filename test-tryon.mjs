import assert from 'node:assert/strict';
import {ringTransform,imageRect,TransformSmoother} from './public/tryon/tracking.js';
import {CameraSession} from './public/tryon/camera.js';
const points=Array.from({length:21},()=>({x:.5,y:.8,z:0}));
Object.assign(points[5],{x:.3,y:.6});Object.assign(points[9],{x:.4,y:.6});Object.assign(points[13],{x:.5,y:.6});Object.assign(points[14],{x:.51,y:.4});Object.assign(points[17],{x:.6,y:.65});
const rect=imageRect(800,600,1280,720);assert.equal(rect.width,800);assert.equal(rect.height,450);assert.equal(rect.y,75);
const a=ringTransform(points,rect);assert.ok(a.radius>3);assert.ok(a.y[1]>0);assert.equal(ringTransform([],rect),null);
const moved=points.map(p=>({...p,x:p.x+.1}));const b=ringTransform(moved,rect);assert.ok(Math.abs(b.position[0]-a.position[0]-80)<.001);
const larger=ringTransform(points,{width:1600,height:900});assert.ok(Math.abs(larger.radius/a.radius-2)<.001);
const sideways=structuredClone(points);sideways[14]={x:.7,y:.6,z:0};assert.ok(ringTransform(sideways,rect).y[0]>.9);
const smoother=new TransformSmoother();smoother.update(a,0);const blended=smoother.update(b,16);assert.ok(blended.position[0]>a.position[0]&&blended.position[0]<b.position[0]);smoother.reset();assert.deepEqual(smoother.update(b,1000),b);
// Permission resolves after close: every late media track must be stopped.
let resolve,stopped=0;const video={pause(){},srcObject:null};
globalThis.isSecureContext=true;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}}});
const camera=new CameraSession(video);const pending=camera.start();camera.stop();resolve({getTracks:()=>[{stop(){stopped++}}]});assert.equal(await pending,false);assert.equal(stopped,1);assert.equal(video.srcObject,null);
console.log('PASS landmark translation/rotation/scale, letterboxing, smoothing, invalid landmarks, camera permission-close race');
