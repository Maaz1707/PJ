import * as T from 'three';
import {OrbitControls} from './vendor/three/controls/OrbitControls.js';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
import {RoomEnvironment} from './vendor/three/environments/RoomEnvironment.js';
import {METALS} from './products.js';
export class JewelleryRenderer{
 constructor(container){
  this.container=container;this.disposed=false;this.loadId=0;this.metal='Yellow Gold';
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(0,0);
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.canvas=this.renderer.domElement;this.canvas.className='vto-canvas';container.append(this.canvas);
  this.scene=new T.Scene();
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
  this.scene.add(new T.HemisphereLight(0xffffff,0x495a43,2));
  const key=new T.DirectionalLight(0xffefd5,3);key.position.set(3,5,7);this.scene.add(key);
  const fill=new T.DirectionalLight(0xffffff,2);fill.position.set(-5,-1,4);this.scene.add(fill);
  this.perspective=new T.PerspectiveCamera(35,1,.01,100);this.perspective.position.set(0,2.8,6);
  this.ortho=new T.OrthographicCamera(-1,1,1,-1,-2000,2000);this.ortho.position.z=1000;
  this.controls=new OrbitControls(this.perspective,this.canvas);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=2.7;this.controls.maxDistance=14;this.controls.target.set(0,0,.25);this.controls.update();this.controls.saveState();
  // Depth-only cylinder approximates the finger inside the band. Camera pixels remain untouched.
  this.occluder=new T.Mesh(new T.CylinderGeometry(.98,.98,3.2,24),new T.MeshBasicMaterial({colorWrite:false,depthWrite:true}));
  this.occluder.renderOrder=-1;this.occluder.visible=false;this.scene.add(this.occluder);
  this.mode='viewer';this.camera=this.perspective;this.resize=new ResizeObserver(()=>this.size());this.resize.observe(container);this.size();
 }
 size(){const {width,height}=this.container.getBoundingClientRect();this.width=Math.max(1,width);this.height=Math.max(1,height);this.renderer.setSize(this.width,this.height,false);this.perspective.aspect=this.width/this.height;this.perspective.updateProjectionMatrix();this.ortho.left=-this.width/2;this.ortho.right=this.width/2;this.ortho.top=this.height/2;this.ortho.bottom=-this.height/2;this.ortho.updateProjectionMatrix()}
 async load(url){
  const id=++this.loadId;const gltf=await new GLTFLoader().loadAsync(url);
  if(this.disposed||id!==this.loadId){this.disposeModel(gltf.scene);return false}
  this.disposeModel(this.model);this.model=gltf.scene;this.model.userData.asset=url;this.scene.add(this.model);this.material(this.metal);this.setMode(this.mode);return true;
 }
 material(name){this.metal=name;if(!this.model)return;
  this.model.traverse(o=>{if(!o.isMesh)return;const gem=o.material?.name==='gem'||o.userData.gem;o.userData.gem=gem;const old=o.material;
   o.material=gem?new T.MeshPhysicalMaterial({name:'gem',color:0xe8f5ff,metalness:.05,roughness:.04,clearcoat:1,ior:2.4,envMapIntensity:2.8}):new T.MeshStandardMaterial({name:'metal',...METALS[name],envMapIntensity:1.7});
   if(Array.isArray(old))old.forEach(m=>m.dispose());else old?.dispose();
  });
 }
 setMode(mode){this.mode=mode;this.camera=mode==='camera'?this.ortho:this.perspective;this.controls.enabled=mode==='viewer';this.occluder.visible=false;if(this.model){this.model.position.set(0,0,0);this.model.quaternion.identity();this.model.scale.setScalar(1);this.model.visible=mode==='viewer'}this.size()}
 transform(value){if(!this.model)return;if(!value){this.model.visible=false;this.occluder.visible=false;return}this.model.visible=true;this.model.position.set(value.position[0],value.position[1],0);this.model.scale.setScalar(value.radius);
  // Re-orthogonalize smoothed axes to avoid shearing.
  const y=new T.Vector3(...value.y).normalize(),x=new T.Vector3(...value.x);x.addScaledVector(y,-x.dot(y)).normalize();const z=new T.Vector3().crossVectors(x,y).normalize();
  this.model.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  this.occluder.visible=true;this.occluder.position.copy(this.model.position);this.occluder.quaternion.copy(this.model.quaternion);this.occluder.scale.copy(this.model.scale);
 }
 render(){if(this.disposed)return;this.controls.update();this.renderer.render(this.scene,this.camera)}
 reset(){this.controls.reset()}
 zoom(factor){this.perspective.position.sub(this.controls.target).multiplyScalar(factor).clampLength(2.7,14).add(this.controls.target);this.controls.update()}
 disposeModel(model){if(!model)return;model.removeFromParent();model.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()})}
 dispose(){this.disposed=true;this.loadId++;this.resize.disconnect();this.controls.dispose();this.disposeModel(this.model);this.disposeModel(this.occluder);this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove()}
}
