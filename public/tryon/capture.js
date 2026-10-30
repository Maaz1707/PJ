import {imageRect} from './tracking.js';
export async function capturePhoto(video,renderer,mirrored){
 if(video.readyState<2||!renderer.model?.visible)throw Error('Hold your hand in view before taking a photo.');
 renderer.render();
 const canvas=document.createElement('canvas');const scale=Math.min(2,devicePixelRatio);
 canvas.width=Math.round(renderer.width*scale);canvas.height=Math.round(renderer.height*scale);
 const context=canvas.getContext('2d');context.scale(scale,scale);
 context.fillStyle='#152a23';context.fillRect(0,0,renderer.width,renderer.height);
 context.save();if(mirrored){context.translate(renderer.width,0);context.scale(-1,1)}
 const rect=imageRect(renderer.width,renderer.height,video.videoWidth,video.videoHeight);
 context.drawImage(video,rect.x,rect.y,rect.width,rect.height);
 context.drawImage(renderer.canvas,0,0,renderer.width,renderer.height);context.restore();
 context.fillStyle='#ffffffcc';context.fillRect(0,renderer.height-32,renderer.width,32);context.fillStyle='#193c2b';context.font='11px sans-serif';context.fillText('PARAG JEWELLERS · 3D shape study · approximate fit',12,renderer.height-12);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Photo capture failed. Please retry.')),'image/png'));
}
