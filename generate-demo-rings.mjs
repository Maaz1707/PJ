import * as T from './public/tryon/vendor/three/three.module.js';
import {writeFileSync} from 'node:fs';
// Original demo geometry. Hole axis +Y, stone +Z, nominal inner radius 1.
function brilliant(radius){
 const vertices=[];const count=12;
 const v=(r,z,i)=>[Math.cos(i*2*Math.PI/count)*r,Math.sin(i*2*Math.PI/count)*r,z];
 const tri=(a,b,c)=>vertices.push(...a,...b,...c);
 for(let i=0;i<count;i++){
  const a=v(radius,0,i),b=v(radius,0,i+1),c=v(radius*.48,radius*.55,i),d=v(radius*.48,radius*.55,i+1);
  tri([0,0,-radius*.8],b,a);tri(a,b,c);tri(b,d,c);tri(c,d,[0,0,radius*.55]);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
for(const design of ['solitaire','halo','band']){
 const group=new T.Group();
 const mesh=(geometry,gem=false,position=[0,0,0])=>{const m=new T.Mesh(geometry);m.userData.gem=gem;m.position.set(...position);group.add(m);return m};
 mesh(new T.TorusGeometry(1.13,.13,16,96)).rotation.x=Math.PI/2;
 if(design!=='band'){
  mesh(brilliant(design==='halo'?.38:.46),true,[0,0,1.54]);
  mesh(new T.TorusGeometry(.32,.055,10,32),false,[0,0,1.31]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;mesh(new T.CylinderGeometry(.035,.045,.37,8),false,[Math.cos(a)*.29,Math.sin(a)*.29,1.4]).rotation.x=Math.PI/2}
  if(design==='halo')for(let i=0;i<12;i++){const a=i*Math.PI/6;mesh(new T.OctahedronGeometry(.105),true,[Math.cos(a)*.52,Math.sin(a)*.52,1.42])}
 }else{
  mesh(new T.TorusGeometry(1.13,.08,12,96),false,[0,.18,0]).rotation.x=Math.PI/2;
  mesh(new T.TorusGeometry(1.13,.08,12,96),false,[0,-.18,0]).rotation.x=Math.PI/2;
  for(let i=0;i<7;i++){const a=(i-3)*.18;mesh(new T.OctahedronGeometry(.105),true,[Math.sin(a)*1.19,0,Math.cos(a)*1.19])}
 }
 group.updateMatrixWorld(true);
 const chunks=[],bufferViews=[],accessors=[],meshes=[],nodes=[];let offset=0;
 function accessor(array,type,componentType,bounds){
  const padded=Buffer.alloc(Math.ceil(array.byteLength/4)*4);Buffer.from(array.buffer,array.byteOffset,array.byteLength).copy(padded);
  const view=bufferViews.push({buffer:0,byteOffset:offset,byteLength:array.byteLength})-1;chunks.push(padded);offset+=padded.length;
  return accessors.push({bufferView:view,componentType,count:array.length/(type==='VEC3'?3:1),type,...bounds})-1;
 }
 group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry.clone().applyMatrix4(m.matrixWorld);g.computeBoundingBox();
  const position=accessor(g.attributes.position.array,'VEC3',5126,{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()});
  const normal=accessor(g.attributes.normal.array,'VEC3',5126);
  const index=accessor(g.index?new Uint32Array(g.index.array):Uint32Array.from({length:g.attributes.position.count},(_,i)=>i),'SCALAR',5125);
  nodes.push({mesh:meshes.push({name:m.userData.gem?'gem':'metal',primitives:[{attributes:{POSITION:position,NORMAL:normal},indices:index,material:m.userData.gem?1:0}]})-1});g.dispose();
 });
 const data={asset:{version:'2.0',generator:'Parag Jewellers original procedural demonstration'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials:[{name:'metal',pbrMetallicRoughness:{baseColorFactor:[.85,.6,.2,1],metallicFactor:1,roughnessFactor:.2}},{name:'gem',pbrMetallicRoughness:{baseColorFactor:[.85,.95,1,1],metallicFactor:.1,roughnessFactor:.04}}],buffers:[{byteLength:offset}],bufferViews,accessors};
 let json=Buffer.from(JSON.stringify(data));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(chunks);
 const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+bin.length,8);
 const jh=Buffer.alloc(8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 writeFileSync(`public/tryon/models/${design}.glb`,Buffer.concat([header,jh,json,bh,bin]));console.log(design,bin.length,'bytes');
}
