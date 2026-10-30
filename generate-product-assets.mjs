import * as T from './public/tryon/vendor/three/three.module.js';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const root='public';
const catalog=vm.runInNewContext(readFileSync(`${root}/catalog.js`,'utf8')+';CATALOG');
const specs={
 p33:{slug:'circular-gleam-prototype',anchor:.29,scale:1,rotation:[.05,0,-.15],description:'Photo-inspired spiral motif and stone arc. Simplified prototype; not CAD-verified.'},
 p35:{slug:'horizon-prototype',anchor:.34,scale:1.05,rotation:[.12,0,.18],description:'Photo-inspired offset open frames with gold beads. Simplified prototype; not CAD-verified.'},
 p40:{slug:'orbit-prototype',anchor:.3,scale:.98,rotation:[0,.1,.3],description:'Photo-inspired open circular motif and stone bar. Simplified prototype; not CAD-verified.'}
};
function exportGLB(group,id){
 group.updateMatrixWorld(true);const chunks=[],bufferViews=[],accessors=[],meshes=[],nodes=[];let offset=0;
 function attribute(array,type,componentType,bounds={}){const padded=Buffer.alloc(Math.ceil(array.byteLength/4)*4);Buffer.from(array.buffer,array.byteOffset,array.byteLength).copy(padded);const bufferView=bufferViews.push({buffer:0,byteOffset:offset,byteLength:array.byteLength})-1;chunks.push(padded);offset+=padded.length;return accessors.push({bufferView,componentType,count:array.length/(type==='VEC3'?3:1),type,...bounds})-1}
 group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry.clone().applyMatrix4(m.matrixWorld);g.computeBoundingBox();
  const position=attribute(g.attributes.position.array,'VEC3',5126,{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}),normal=attribute(g.attributes.normal.array,'VEC3',5126),indices=attribute(g.index?new Uint32Array(g.index.array):Uint32Array.from({length:g.attributes.position.count},(_,i)=>i),'SCALAR',5125);
  nodes.push({mesh:meshes.push({name:m.userData.gem?'gem':'metal',primitives:[{attributes:{POSITION:position,NORMAL:normal},indices,material:m.userData.gem?1:0}]})-1});g.dispose();
 });
 const data={asset:{version:'2.0',generator:`Parag ${id} photo-inspired PROTOTYPE, not product CAD`},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials:[{name:'metal',pbrMetallicRoughness:{baseColorFactor:[.85,.6,.2,1],metallicFactor:1,roughnessFactor:.2}},{name:'gem',pbrMetallicRoughness:{baseColorFactor:[.85,.95,1,1],metallicFactor:.05,roughnessFactor:.06}}],buffers:[{byteLength:offset}],bufferViews,accessors};
 let json=Buffer.from(JSON.stringify(data));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([header,jh,json,bh,bin]);
}
for(const [id,spec] of Object.entries(specs)){
 const group=new T.Group();const mesh=(geometry,gem=false,position=[0,0,0])=>{const m=new T.Mesh(geometry);m.userData.gem=gem;m.position.set(...position);group.add(m);return m};
 const tube=(points,r=.05)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),80,r,10,false));
 mesh(new T.TorusGeometry(1.12,id==='p35'?.105:.075,14,100)).rotation.x=Math.PI/2;
 if(id==='p33'){
  const spiral=Array.from({length:90},(_,i)=>{const t=i/89,a=-Math.PI*.25+t*Math.PI*3.3,r=.5*(1-t)+.05;return [Math.cos(a)*r,Math.sin(a)*r,1.28]});tube(spiral,.055);
  for(let i=0;i<12;i++){const a=Math.PI*(1+i/12);mesh(new T.OctahedronGeometry(.055),true,[Math.cos(a)*.47,Math.sin(a)*.47,1.34])}
  tube([[-1.05,0,.34],[-.65,.15,1.02],[-.22,.48,1.27]],.06);
 }else if(id==='p35'){
  for(const sign of [-1,1]){
   tube([[-.75,sign*.08,1.05],[-.63,sign*.32,1.2],[.6,sign*.32,1.2],[.78,sign*.08,1.05]],.055);
   for(let i=0;i<5;i++)mesh(new T.SphereGeometry(.085,12,8),false,[-.52+i*.26,sign*.17,1.22]);
  }
  tube([[-.95,-.08,.6],[0,0,1.34],[.95,.08,.6]],.075);
 }else{
  mesh(new T.TorusGeometry(.46,.047,12,72),false,[0,0,1.3]);tube([[-.5,-.12,1.35],[.5,.12,1.35]],.07);
  for(let i=0;i<11;i++)mesh(new T.OctahedronGeometry(.052),true,[-.4+i*.08,-.096+i*.0192,1.43]);
 }
 const bytes=exportGLB(group,id),path=`/models/jewellery/rings/${spec.slug}.glb`;mkdirSync(`${root}/models/jewellery/rings`,{recursive:true});writeFileSync(root+path,bytes);spec.path=path;spec.version=createHash('sha256').update(bytes).digest('hex').slice(0,16);console.log(id,spec.version,bytes.length);
}
const registry=Object.fromEntries(catalog.map(p=>{
 const spec=specs[p.id],category=({Rings:'ring',Earrings:'earring',Necklaces:'necklace',Bracelets:'bracelet'})[p.category]||'other';
 const gallery=[{view:'reference',url:`/assets/${p.image}`,alt:p.name+' — catalogue reference',verifiedInventory:false},...['front','side','top','detail','lifestyle'].map(view=>({view,url:null,reason:'Not supplied'}))];
 if(!existsSync(root+gallery[0].url))throw Error('Missing image for '+p.id);
 return [p.id,{id:p.id,sku:p.sku,name:p.name,category,gallery,model:{status:spec?'prototype':'missing',glb:spec?.path||null,version:spec?.version||null,thumbnail:gallery[0].url,description:spec?.description||'No product-specific 3D asset has been supplied.',render:{innerRadius:1,origin:[0,0,0],rotation:spec?.rotation||[0,0,0],viewDirection:[0,2.8,6],padding:1.3,exposure:1.12,gemColor:0xe5f0ff},tracking:category==='ring'?{finger:'ring',anchor:spec?.anchor||.31,scaleMultiplier:spec?.scale||1,positionOffset:[0,0,0]}:null},variants:Object.fromEntries(['Yellow Gold','White Gold','Rose Gold'].map(name=>[name,{material:name,modelUrl:null,visualOnly:true}])),materialSlots:{metal:['metal'],gem:['gem']}}];
}));
writeFileSync(`${root}/tryon/asset-registry.js`,'// Generated by generate-product-assets.mjs. Product IDs are the source of truth.\nexport const ASSET_REGISTRY = '+JSON.stringify(registry,null,2)+';\n');
const report=catalog.map(p=>({id:p.id,sku:p.sku,name:p.name,category:p.category,assetStatus:registry[p.id].model.status,exactCAD:'missing',prototypeUrl:registry[p.id].model.glb,missingGalleryViews:registry[p.id].gallery.filter(g=>!g.url).map(g=>g.view)}));
writeFileSync('PRODUCT-ASSET-INVENTORY.json',JSON.stringify(report,null,2)+'\n');
