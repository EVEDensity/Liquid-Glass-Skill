/* Independent WebGL2 liquid glass: edge refraction, color pickup, and shape merging. MIT. */
const vertex = `#version 300 es
in vec2 a_position;
void main(){gl_Position=vec4(a_position,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
out vec4 color;
uniform vec2 u_size;
uniform vec2 u_sourceSize;
uniform sampler2D u_source;
uniform int u_count;
uniform vec4 u_shapes[12];
uniform float u_radii[12];
uniform float u_refraction,u_bezel,u_magnify,u_dispersion,u_edge,u_sizeScale;
uniform float u_blur,u_frost,u_vibrancy,u_brightness,u_dim,u_appearance;
uniform float u_pickup,u_tintAmount,u_specular,u_rimWidth,u_lightAngle,u_shadow,u_merge;
uniform float u_press[12];
uniform vec3 u_tint;

float roundedBox(vec2 p, vec2 halfSize, float radius){
  vec2 q=abs(p)-halfSize+radius;
  return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
}
vec2 coverUV(vec2 p){
  vec2 fitted=vec2(u_sourceSize.x/u_sourceSize.y*u_size.y,u_size.y);
  if(fitted.x<u_size.x)fitted=vec2(u_size.x,u_sourceSize.y/u_sourceSize.x*u_size.x);
  return clamp((p-u_size*.5)/fitted+.5,vec2(.001),vec2(.999));
}
vec3 sampleAt(vec2 p){return texture(u_source,coverUV(p)).rgb;}
float fieldAt(vec2 point){
  float field=1e5;
  for(int i=0;i<8;i++){
    if(i>=u_count)break;
    vec4 s=u_shapes[i];float candidate=roundedBox(point-s.xy,s.zw*.5,u_radii[i]);
    float k=max(u_merge,0.);float h=clamp(.5+.5*(field-candidate)/max(k,.001),0.,1.);
    field=mix(field,candidate,h)-k*h*(1.-h);
  }
  return field;
}
vec2 normalFor(vec2 q, vec2 halfSize, float radius){
  float e=.75;
  vec2 n=vec2(roundedBox(q+vec2(e,0),halfSize,radius)-roundedBox(q-vec2(e,0),halfSize,radius),roundedBox(q+vec2(0,e),halfSize,radius)-roundedBox(q-vec2(0,e),halfSize,radius));
  float lengthN=length(n);return lengthN<.0001?normalize(q+vec2(.0001)):n/lengthN;
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,u_size.y-gl_FragCoord.y);
  float field=fieldAt(p),nearest=1e5,scale=1.,press=0.;vec2 centre=vec2(0.),halfSize=vec2(1.);float radius=1.;
  for(int i=0;i<8;i++){
    if(i>=u_count)break;
    vec4 s=u_shapes[i];float candidate=roundedBox(p-s.xy,s.zw*.5,u_radii[i]);
    if(candidate<nearest){nearest=candidate;centre=s.xy;halfSize=s.zw*.5;radius=u_radii[i];scale=u_sizeScale>0.?clamp(min(s.z,s.w)/140.,.8,1.55):1.;press=u_press[i];}
  }
  vec2 gradient=vec2(dFdx(field),-dFdy(field));
  vec3 base=sampleAt(p);
  if(field>2.){float shadow=exp(-max(field,0.)/15.)*u_shadow*.5;color=vec4(base*(1.-shadow),1.);return;}
  vec2 q=p-centre,n=length(gradient)>.001?normalize(gradient):normalFor(q,halfSize,radius);
  float edge=1.-smoothstep(0.,max(u_bezel*scale*.55*(1.+press*.25),1.),max(-field,0.));
  float profile=u_edge>0.?edge*(1.-edge*edge):edge*edge;
  vec2 bend=n*u_refraction*scale*.75*(1.+press*.45)*profile;
  float zoom=max(u_magnify+press*.16,1.);
  vec2 centerPull=(p-centre)*(1.-1./zoom)*(1.-edge);
  vec2 at=p-bend-centerPull;
  vec2 split=bend*u_dispersion;
  vec3 lens=vec3(sampleAt(at-split).r,sampleAt(at).g,sampleAt(at+split).b);
  float blur=u_blur*scale;
  vec3 soft=(sampleAt(at+vec2(blur,0.))+sampleAt(at-vec2(blur,0.))+sampleAt(at+vec2(0.,blur))+sampleAt(at-vec2(0.,blur)))*.25;
  lens=mix(lens,soft,clamp(blur/6.,0.,.9));
  float luma=dot(lens,vec3(.2126,.7152,.0722));
  lens=mix(vec3(luma),lens,u_vibrancy);
  lens+=u_brightness;
  vec3 below=soft;
  vec3 picked=mix(vec3(luma),below,1.35);
  lens=mix(lens,picked,clamp(u_pickup,0.,1.));
  lens=mix(lens,u_tint,u_tintAmount);
  lens=mix(lens,vec3(luma),clamp(u_frost*.2,0.,.25));
  vec2 light=vec2(cos(radians(u_lightAngle)),sin(radians(u_lightAngle)));
  float facing=dot(n,light),rim=smoothstep(2.2,0.,abs(field));
  lens+=rim*u_specular*(.18+pow(max(facing,0.),1.5)*.85);
  lens+=press*.08;
  float dark=step(luma,.42),lightMode=step(luma,.58);
  float autoMode=mix(lightMode,dark,smoothstep(.3,.62,luma));
  float mode=u_appearance<.5?1.:u_appearance<1.5?0.:autoMode;
  lens=mix(lens,vec3(1.),mode*.12);
  lens=mix(lens,vec3(0.),(1.-mode)*.1);
  float mask=1.-smoothstep(-.8,.8,field);
  vec3 outside=base*(1.-u_dim*mask);
  color=vec4(mix(outside,clamp(lens,0.,1.),mask),1.);
}`;

export const PRESETS = {
  apple: { name: 'Apple Liquid Glass', refraction: 18, bezel: 20, magnify: 1, dispersion: 0.04, edge: 'convex', sizeScale: true, blur: 6, frost: 0.1, vibrancy: 1.35, brightness: 0.02, dim: 0, appearance: 'auto', pickup: 0.35, tintAmount: 0, tint: '#e8593c', specular: 0.7, rimWidth: 1.4, lightAngle: -135, shadow: 0.3, merge: 10, interactive: true },
  clear: { name: 'Apple clear', refraction: 18, bezel: 16, magnify: 1, dispersion: 0.05, edge: 'convex', sizeScale: true, blur: 0.5, frost: 0.02, vibrancy: 1.1, brightness: 0, dim: 0.35, appearance: 'light', pickup: 0.1, tintAmount: 0, tint: '#e8593c', specular: 0.65, rimWidth: 1.4, lightAngle: -135, shadow: 0.18, merge: 10, interactive: true },
  thick: { name: 'Thick lens', refraction: 46, bezel: 44, magnify: 1.28, dispersion: 0.12, edge: 'convex', sizeScale: false, blur: 0, frost: 0, vibrancy: 1.05, brightness: 0.02, dim: 0, appearance: 'light', pickup: 0, tintAmount: 0, tint: '#e8593c', specular: 0.8, rimWidth: 2.2, lightAngle: -135, shadow: 0.45, merge: 24, interactive: true },
  frosted: { name: 'Frosted', refraction: 8, bezel: 12, magnify: 1, dispersion: 0, edge: 'convex', sizeScale: true, blur: 22, frost: 0.3, vibrancy: 1.4, brightness: 0.04, dim: 0, appearance: 'auto', pickup: 0.6, tintAmount: 0, tint: '#e8593c', specular: 0.35, rimWidth: 1, lightAngle: -135, shadow: 0.25, merge: 14, interactive: true },
  plain: { name: 'Plain lens', refraction: 26, bezel: 22, magnify: 1.06, dispersion: 0, edge: 'convex', sizeScale: false, blur: 0, frost: 0, vibrancy: 1, brightness: 0, dim: 0, appearance: 'light', pickup: 0, tintAmount: 0, tint: '#e8593c', specular: 0.5, rimWidth: 1, lightAngle: -135, shadow: 0.15, merge: 14, interactive: true },
  prism: { name: 'Prism', refraction: 30, bezel: 30, magnify: 1.1, dispersion: 0.85, edge: 'convex', sizeScale: false, blur: 0, frost: 0, vibrancy: 1.2, brightness: 0.02, dim: 0, appearance: 'light', pickup: 0, tintAmount: 0, tint: '#e8593c', specular: 0.9, rimWidth: 1.6, lightAngle: -135, shadow: 0.25, merge: 20, interactive: true }
};
const numeric = ['refraction','bezel','magnify','dispersion','blur','frost','vibrancy','brightness','dim','pickup','tintAmount','specular','rimWidth','lightAngle','shadow','merge'];
const ranges = { refraction:[0,80],bezel:[1,80],magnify:[1,1.8],dispersion:[0,1],blur:[0,40],frost:[0,1],vibrancy:[0,2],brightness:[-.3,.3],dim:[0,.6],pickup:[0,1],tintAmount:[0,1],specular:[0,1.5],rimWidth:[.3,12],lightAngle:[-180,180],shadow:[0,1],merge:[0,60] };
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const hexToRgb=hex=>{const n=Number.parseInt(String(hex).replace('#',''),16);return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];};

export class GlassScene {
  constructor(canvas, options = {}) {
    this.canvas=canvas; this.shapes=[]; this.material={...PRESETS.apple}; this.available=false; this.destroyed=false; this.source=null;
    this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false}); if(!this.gl)return; const gl=this.gl, shaders=[];
    try {
      for(const [type,code] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));}
      this.program=gl.createProgram();shaders.forEach(shader=>gl.attachShader(this.program,shader));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(this.program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);
      const names=['size','sourceSize','source','count','shapes[0]','radii[0]','press[0]','refraction','bezel','magnify','dispersion','edge','sizeScale','blur','frost','vibrancy','brightness','dim','appearance','pickup','tintAmount','tint','specular','rimWidth','lightAngle','shadow','merge'];
      this.uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(this.program,`u_${name}`)]));
      this.available=true;this.setMaterial(options);
      this.observer=new ResizeObserver(()=>this.render());this.observer.observe(canvas);
      this.contextLost=event=>{event.preventDefault();this.available=false;canvas.dispatchEvent(new Event('glassfallback'));};canvas.addEventListener('webglcontextlost',this.contextLost);
    } catch(error){this.error=error.message;this.destroy();} finally {shaders.forEach(shader=>gl.deleteShader(shader));}
  }
  setShapes(shapes){this.shapes=shapes.slice(0,12).map(s=>{const width=Math.max(1,Number(s.width)||1),height=Math.max(1,Number(s.height)||1);return{x:Number(s.x)||0,y:Number(s.y)||0,width,height,radius:clamp(Number(s.radius)||0,0,Math.min(width,height)/2),press:clamp(Number(s.press)||0,0,1)};});}
  setMaterial(values={}){
    for(const key of numeric)if(Number.isFinite(values[key]))this.material[key]=clamp(values[key],...ranges[key]);
    if(values.edge==='lip'||values.edge==='convex')this.material.edge=values.edge;
    if(['auto','light','dark'].includes(values.appearance))this.material.appearance=values.appearance;
    if(typeof values.sizeScale==='boolean')this.material.sizeScale=values.sizeScale;
    if(typeof values.interactive==='boolean')this.material.interactive=values.interactive;
    if(typeof values.tint==='string'&&/^#[0-9a-f]{6}$/i.test(values.tint))this.material.tint=values.tint;
  }
  setSource(source){
    if(!this.available||this.destroyed)return false;const gl=this.gl;const width=source.videoWidth||source.naturalWidth||source.width,height=source.videoHeight||source.naturalHeight||source.height;if(!width||!height)throw new Error('Load the glass source before setSource().');
    gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);this.sourceSize=[width,height];this.source=source;return true;
  }
  render(){
    if(!this.available||this.destroyed||!this.source)return;const gl=this.gl,box=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    const scale=Math.min(dpr,.6);const width=Math.max(1,Math.round(box.width*scale)),height=Math.max(1,Math.round(box.height*scale));if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}gl.viewport(0,0,width,height);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.uniform1i(this.uniforms.source,0);gl.uniform2f(this.uniforms.size,width,height);gl.uniform2fv(this.uniforms.sourceSize,this.sourceSize);gl.uniform1i(this.uniforms.count,this.shapes.length);
    const shapes=new Float32Array(48),radii=new Float32Array(12),press=new Float32Array(12);const pixelScale=width/Math.max(1,box.width);this.shapes.forEach((s,i)=>{shapes.set([s.x*pixelScale,s.y*pixelScale,s.width*pixelScale,s.height*pixelScale],i*4);radii[i]=s.radius*pixelScale;press[i]=s.press;});gl.uniform4fv(this.uniforms['shapes[0]'],shapes);gl.uniform1fv(this.uniforms['radii[0]'],radii);gl.uniform1fv(this.uniforms['press[0]'],press);
    const m=this.material;for(const key of ['refraction','bezel','blur','rimWidth','merge'])gl.uniform1f(this.uniforms[key],m[key]*dpr);for(const key of numeric.filter(key=>!['refraction','bezel','blur','rimWidth','merge'].includes(key)))gl.uniform1f(this.uniforms[key],m[key]);
    gl.uniform1f(this.uniforms.edge,m.edge==='lip'?1:0);gl.uniform1f(this.uniforms.sizeScale,m.sizeScale?1:0);gl.uniform1f(this.uniforms.appearance,m.appearance==='light'?0:m.appearance==='dark'?1:2);gl.uniform3fv(this.uniforms.tint,hexToRgb(m.tint));gl.drawArrays(gl.TRIANGLES,0,6);
  }
  destroy(){this.observer?.disconnect();if(this.contextLost)this.canvas.removeEventListener('webglcontextlost',this.contextLost);if(this.gl){if(this.texture)this.gl.deleteTexture(this.texture);if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.program)this.gl.deleteProgram(this.program);}this.available=false;this.destroyed=true;}
}
