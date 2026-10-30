export const METALS={
 'Yellow Gold':{color:0xe6bb61,metalness:1,roughness:.2},
 'White Gold':{color:0xdbe1e5,metalness:1,roughness:.18},
 'Rose Gold':{color:0xd99c85,metalness:1,roughness:.22}
};
export const DEMO_MODELS=[
 {id:'solitaire',name:'Solitaire study',modelUrl:'/tryon/models/solitaire.glb'},
 {id:'halo',name:'Halo study',modelUrl:'/tryon/models/halo.glb'},
 {id:'band',name:'Sculpted band study',modelUrl:'/tryon/models/band.glb'}
];
export function tryOnProduct(product,model=DEMO_MODELS[0]){
 if(!product||typeof product.id!=='string'||product.category!=='Rings')throw Error('Ring product required');
 return {id:product.id,name:product.name,category:'ring',description:'Demonstration 3D geometry, not a replica of this product.',price:product.price,images:[`/assets/${product.image}`],modelUrl:model.modelUrl,variants:Object.keys(METALS),availableSizes:['8','10','12','14','16','18','20'],availability:'preview',demo:true,trackingConfig:{finger:'ring',positionOffset:[0,0,0],scaleMultiplier:1,anchor:.31}};
}
