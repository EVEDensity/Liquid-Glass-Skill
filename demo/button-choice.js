import { PRESETS } from '../assets/liquid-glass-renderer.js';

export function buttonChoice({shape,preset}, {text,width,height,background}) {
  if (!['capsule','rounded','square','circle'].includes(shape) || !Object.hasOwn(PRESETS,preset)) {
    throw new Error('Unknown shape or material.');
  }
  const size = Math.min(width,height);
  if (shape==='circle' || shape==='square') width=height=size;
  const radius = shape==='square'?0:shape==='rounded'?Math.min(16,size/2):size/2;
  return {
    version:2,language:'zh',
    button:{text,shape,width,height,radius},
    material:{...PRESETS[preset],clearControls:true,presetOptics:preset!=='apple'},
    background
  };
}
