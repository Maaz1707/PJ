import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {ASSET_REGISTRY,productAsset,hasModel} from './public/tryon/products.js';
const catalog=vm.runInNewContext(readFileSync('public/catalog.js','utf8')+';CATALOG'),hashes=new Set(),urls=new Set();
assert.equal(Object.keys(ASSET_REGISTRY).length,catalog.length);
for(const p of catalog){
 const asset=productAsset(p.id);assert.equal(asset.id,p.id);assert.equal(asset.sku,p.sku);assert.equal(asset.gallery[0].url,'/assets/'+p.image);
 for(const image of asset.gallery.filter(g=>g.url))assert.ok(existsSync('public'+image.url));
 if(!hasModel(asset)){assert.equal(asset.model.glb,null);continue}
 assert.equal(asset.model.status,'prototype');assert.ok(!urls.has(asset.model.glb));urls.add(asset.model.glb);
 const buffer=readFileSync('public'+asset.model.glb),hash=createHash('sha256').update(buffer).digest('hex');assert.ok(!hashes.has(hash));hashes.add(hash);assert.equal(hash.slice(0,16),asset.model.version);
 assert.equal(buffer.readUInt32LE(0),0x46546c67);assert.equal(buffer.readUInt32LE(8),buffer.length);
 const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());assert.ok(json.meshes.length>1);assert.match(json.asset.generator,/PROTOTYPE/);
}
assert.equal(hashes.size,3);assert.throws(()=>productAsset('unknown'));
console.log('PASS all 46 IDs and image paths, three distinct prototype GLBs and hashes, 43 explicit missing records; zero exact product CAD assets');
