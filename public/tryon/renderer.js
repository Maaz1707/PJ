import * as T from 'three';
import {OrbitControls} from './vendor/three/controls/OrbitControls.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
import {RoomEnvironment} from './vendor/three/environments/RoomEnvironment.js';
import {METALS,hasModel} from './products.js';
export class JewelleryRenderer{
 constructor(container){
  this.container=container;this.disposed=false;this.loadId=0;this.metal='Yellow Gold';this.cache=new Map();
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(0,0);
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.canvas=this.renderer.domElement;this.canvas.className='vto-canvas';container.append(this.canvas);
  this.scene=new T.Scene();
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
  this.scene.add(new T.HemisphereLight(0xffffff,0x495a43,2));
  const key=new T.DirectionalLight(0xffefd5,3);key.position.set(3,5,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0002;this.scene.add(key);
  this.floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.ShadowMaterial({opacity:.08}));this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-.8;this.floor.receiveShadow=true;this.scene.add(this.floor);
  const fill=new T.DirectionalLight(0xffffff,2);fill.position.set(-5,-1,4);this.scene.add(fill);
  this.perspective=new T.PerspectiveCamera(35,1,.01,100);this.perspective.position.set(0,2.8,6);
  this.ortho=new T.OrthographicCamera(-1,1,1,-1,-2000,2000);this.ortho.position.z=1000;
  this.controls=new OrbitControls(this.perspective,this.canvas);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=2.7;this.controls.maxDistance=14;this.controls.target.set(0,0,.25);this.controls.update();this.controls.saveState();
  // Depth-only cylinder approximates the finger inside the band. Camera pixels remain untouched.
  this.occluder=new T.Mesh(new T.CylinderGeometry(.98,.98,3.2,24),new T.MeshBasicMaterial({colorWrite:false,depthWrite:true}));
  this.occluder.renderOrder=-1;this.occluder.visible=false;this.scene.add(this.occluder);
  this.mode='viewer';this.camera=this.perspective;this.resize=new ResizeObserver(()=>this.size());this.resize.observe(container);this.size();
 }
 size(){const {width,height}=this.container.getBoundingClientRect(),previousAspect=this.perspective.aspect;this.width=Math.max(1,width);this.height=Math.max(1,height);this.renderer.setSize(this.width,this.height,false);this.perspective.aspect=this.width/this.height;this.perspective.updateProjectionMatrix();this.ortho.left=-this.width/2;this.ortho.right=this.width/2;this.ortho.top=this.height/2;this.ortho.bottom=-this.height/2;this.ortho.updateProjectionMatrix();if(this.model&&this.mode==='viewer'&&Math.abs(previousAspect-this.perspective.aspect)>.01)this.fitCamera()}
 clear(){this.loadId++;this.request?.abort();this.request=null;this.disposeModel(this.model);this.model=null;this.asset=null;this.occluder.visible=false;this.floor.visible=false}
 async load(asset,onProgress=()=>{}){
  this.clear();const id=this.loadId;if(!hasModel(asset))return false;
  const url=asset.model.glb,key=`${asset.id}|${asset.model.version}|${url}`,controller=this.request=new AbortController();
  try{
   let buffer=this.cache.get(key);
   if(!buffer){
    const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error(`Model HTTP ${response.status}`);
    const total=Number(response.headers.get('content-length'))||0;
    if(response.body){const reader=response.body.getReader(),parts=[];let loaded=0;for(;;){const {done,value}=await reader.read();if(done)break;parts.push(value);loaded+=value.byteLength;onProgress({loaded,total})}const data=new Uint8Array(loaded);let cursor=0;for(const part of parts){data.set(part,cursor);cursor+=part.byteLength}buffer=data.buffer}
    else buffer=await response.arrayBuffer();
    if(id!==this.loadId||this.disposed)return false;
    if(buffer.byteLength<12||new DataView(buffer).getUint32(0,true)!==0x46546c67)throw Error('Expected a binary GLB model');
    this.cache.set(key,buffer);if(this.cache.size>4)this.cache.delete(this.cache.keys().next().value);
   }else onProgress({loaded:buffer.byteLength,total:buffer.byteLength,cached:true});
   const gltf=await new GLTFLoader().parseAsync(buffer,new URL('.',new URL(url,location.origin)).href);
   if(this.disposed||id!==this.loadId){this.disposeModel(gltf.scene);return false}
   this.asset=asset;this.model=new T.Group();const source=gltf.scene,config=asset.model.render;
   source.position.fromArray(config.origin||[0,0,0]).multiplyScalar(-1/(config.innerRadius||1));source.scale.setScalar(1/(config.innerRadius||1));this.model.add(source);
   this.model.userData={productId:asset.id,asset:url,assetKey:key};source.traverse(o=>{if(o.isMesh)o.castShadow=true});
   const bounds=new T.Box3().setFromObject(this.model),extent=bounds.getSize(new T.Vector3()).length();if(bounds.isEmpty()||!Number.isFinite(extent)||extent<.000001)throw Error('Model contains no renderable geometry');
   this.scene.add(this.model);this.renderer.toneMappingExposure=config.exposure||1.12;this.material(this.metal);this.setMode(this.mode);return true;
  }catch(error){if(id!==this.loadId||this.disposed)return false;this.cache.delete(key);this.clear();throw error}
 }
 material(name){this.metal=name;if(!this.model)return;
  const slots=this.asset.materialSlots,variant=this.asset.variants[name];if(!variant)throw Error('Finish unavailable for this product');
  this.model.traverse(o=>{if(!o.isMesh)return;const originals=Array.isArray(o.material)?o.material:[o.material];const next=originals.map(old=>{
   if(slots.gem.includes(old.name)){const mat=old.isMeshPhysicalMaterial?old.clone():new T.MeshPhysicalMaterial({name:old.name,map:old.map,normalMap:old.normalMap,roughnessMap:old.roughnessMap,vertexColors:old.vertexColors});mat.color.set(this.asset.model.render.gemColor);mat.metalness=.06;mat.roughness=.08;mat.clearcoat=1;mat.ior=2.4;mat.envMapIntensity=2.2;old.dispose();return mat}
   if(slots.metal.includes(old.name)){const mat=old.clone();mat.color.set(METALS[variant.material].color);mat.metalness=1;mat.roughness=METALS[variant.material].roughness;mat.envMapIntensity=1.7;Object.assign(mat,variant.parameters||{});old.dispose();return mat}
   return old;
  });o.material=Array.isArray(o.material)?next:next[0]});
 }
 fitCamera(){if(!this.model)return;const bounds=new T.Box3().setFromObject(this.model),sphere=bounds.getBoundingSphere(new T.Sphere()),config=this.asset.model.render;
  const direction=new T.Vector3(...config.viewDirection).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
  const vertical=Math.tan(T.MathUtils.degToRad(this.perspective.fov/2)),horizontal=vertical*this.perspective.aspect;
  let distance=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).sub(sphere.center);distance=Math.max(distance,p.dot(direction)+Math.max(Math.abs(p.dot(right))/horizontal,Math.abs(p.dot(up))/vertical))}
  distance*=config.padding||1.3;this.controls.target.copy(sphere.center);this.perspective.position.copy(sphere.center).add(direction.multiplyScalar(distance));this.perspective.near=Math.max(.001,sphere.radius/100);this.perspective.far=distance*20;this.perspective.updateProjectionMatrix();this.controls.minDistance=sphere.radius*1.3;this.controls.maxDistance=distance*3;this.controls.update();this.controls.saveState();this.floor.position.y=bounds.min.y-.15;
 }
 setMode(mode){this.mode=mode;this.camera=mode==='camera'?this.ortho:this.perspective;this.controls.enabled=mode==='viewer';this.occluder.visible=false;this.floor.visible=mode==='viewer'&&!!this.model;this.renderer.shadowMap.enabled=mode==='viewer';if(this.model){this.model.position.set(0,0,0);this.model.quaternion.identity();this.model.scale.setScalar(1);this.model.visible=mode==='viewer';if(mode==='viewer'){this.model.rotation.fromArray(this.asset.model.render.rotation);this.fitCamera()}}this.size()}
 transform(value){if(!this.model)return;if(!value){this.model.visible=false;this.occluder.visible=false;return}this.model.visible=true;this.model.position.set(value.position[0],value.position[1],0);this.model.scale.setScalar(value.radius);
  // Re-orthogonalize smoothed axes to avoid shearing.
  const y=new T.Vector3(...value.y).normalize(),x=new T.Vector3(...value.x);x.addScaledVector(y,-x.dot(y)).normalize();const z=new T.Vector3().crossVectors(x,y).normalize();
  this.model.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  this.occluder.visible=true;this.occluder.position.copy(this.model.position);this.occluder.quaternion.copy(this.model.quaternion);this.occluder.scale.copy(this.model.scale);
 }
 render(){if(this.disposed)return;this.controls.update();this.renderer.render(this.scene,this.camera)}
 reset(){this.controls.reset()}
 zoom(factor){this.perspective.position.sub(this.controls.target).multiplyScalar(factor).clampLength(this.controls.minDistance,this.controls.maxDistance).add(this.controls.target);this.controls.update()}
 disposeModel(model){if(!model)return;model.removeFromParent();const resources=new Set();model.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const mat of (Array.isArray(o.material)?o.material:[o.material])){if(!mat)continue;resources.add(mat);for(const value of Object.values(mat))if(value?.isTexture)resources.add(value)}});resources.forEach(r=>r.dispose())}
 dispose(){this.disposed=true;this.clear();this.cache.clear();this.resize.disconnect();this.controls.dispose();this.disposeModel(this.floor);this.disposeModel(this.occluder);this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove()}
}
