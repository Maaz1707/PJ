import {ASSET_REGISTRY} from './asset-registry.js';
export {ASSET_REGISTRY};
export const METALS={
 'Yellow Gold':{color:0xe6bb61,metalness:1,roughness:.2},
 'White Gold':{color:0xdbe1e5,metalness:1,roughness:.18},
 'Rose Gold':{color:0xd99c85,metalness:1,roughness:.22}
};
export function productAsset(id){
 const asset=ASSET_REGISTRY[id];
 if(!asset||asset.id!==id)throw Error('No asset record for product '+id);
 if(!['missing','prototype','verified'].includes(asset.model.status))throw Error('Invalid asset status');
 if(asset.model.status==='missing'&&asset.model.glb!==null)throw Error('Missing asset must not contain a fallback model');
 if(asset.model.glb&&!/^\/models\/jewellery\/[a-z0-9/_-]+\.glb$/.test(asset.model.glb))throw Error('Invalid GLB path');
 if(asset.model.status!=='missing'&&(!asset.model.glb||!asset.model.version))throw Error('Available model requires a URL and version');
 const render=asset.model.render,vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
 if(!Number.isFinite(render.innerRadius)||render.innerRadius<=0||!vector(render.origin)||!vector(render.rotation)||!vector(render.viewDirection)||!Math.hypot(...render.viewDirection))throw Error('Invalid model coordinate or camera configuration');
 if(!asset.gallery.some(image=>image.url))throw Error('Product reference image missing');
 for(const variant of Object.values(asset.variants)){if(!METALS[variant.material])throw Error('Unknown product finish');if(variant.modelUrl&&!/^\/models\/jewellery\/[a-z0-9/_-]+\.glb$/.test(variant.modelUrl))throw Error('Invalid variant GLB path')}
 return asset;
}
export const hasModel=asset=>asset.model.status!=='missing'&&!!asset.model.glb;
export function tryOnProduct(product){
 const asset=productAsset(product.id);
 return {...asset,price:product.price,modelUrl:asset.model.glb,trackingConfig:asset.model.tracking?structuredClone(asset.model.tracking):null,canTryOn:asset.category==='ring'&&hasModel(asset)};
}
