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
uniform float u_surface[12];
uniform vec2 u_stretch[12],u_contact[12];
uniform vec4 u_switchBase,u_segmentBase; // center, width, height
uniform float u_switchOn;
uniform vec4 u_sliderTrack; // left, center Y, width, height
uniform float u_clearControls;
uniform float u_sliderFill; // filled track end X
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
float trackMask(vec2 p, float from, float to, float radius, float feather){
  vec2 q=p-vec2(clamp(p.x,from,to),u_sliderTrack.y);
  return 1.-smoothstep(radius-feather,radius+feather,length(q));
}
float baseMask(vec2 p,vec4 box,float feather){
  if(box.w<=0.)return 0.;
  float d=roundedBox(p-box.xy,box.zw*.5,box.w*.5);
  return 1.-smoothstep(-feather,feather,d);
}
vec3 sampleSoft(vec2 p,float blur){
  float feather=max(.5,blur*1.45);
  vec3 base=textureLod(u_source,coverUV(p),log2(1.+blur*3.6)).rgb;
  float switchMask=baseMask(p,u_switchBase,feather);
  vec3 switchColor=mix(vec3(.36,.43,.39),vec3(.91,.33,.22),u_switchOn);
  base=mix(base,switchColor,switchMask*.96);
  base=mix(base,vec3(.10,.13,.12),baseMask(p,u_segmentBase,feather)*.69);
  if(u_sliderTrack.w<=0.)return base;
  float r=u_sliderTrack.w*.5;
  float start=u_sliderTrack.x+r;
  float end=u_sliderTrack.x+u_sliderTrack.z-r;
  float rail=trackMask(p,start,end,r,feather);
  if(rail<=0.)return base;
  float fill=trackMask(p,start,clamp(u_sliderFill,start,end),r,feather);
  vec3 inactive=mix(base,vec3(.35,.39,.38),rail*.43);
  return mix(inactive,mix(base,vec3(.97,.96,.93),.96),fill);
}
vec3 sampleAt(vec2 p){return sampleSoft(p,0.);}
vec3 sliderLens(vec2 p,vec2 normal,float field,float press,bool clear){
  // Resting porcelain gives way to an edge lens with a clear center.
  float depth=max(-field,0.);
  float strength=clear?mix(.85,1.,press):press;
  float t=clamp(depth/mix(7.,14.,strength),0.,1.);
  float bend=sin(t*3.141593)*mix(2.,6.4,strength)*(u_refraction/18.);
  vec2 at=p-normal*bend;
  float softness=mix(1.55,1.65,press);
  vec3 lens=sampleAt(at)*.48;
  lens+=(sampleAt(at+vec2(softness,0.))+sampleAt(at-vec2(softness,0.))+
         sampleAt(at+vec2(0.,softness))+sampleAt(at-vec2(0.,softness)))*.10;
  vec2 diagonal=vec2(softness*.7);
  lens+=(sampleAt(at+diagonal)+sampleAt(at-diagonal)+
         sampleAt(at+vec2(diagonal.x,-diagonal.y))+sampleAt(at+vec2(-diagonal.x,diagonal.y)))*.03;
  lens=mix(lens,vec3(.985,.99,.98),clear?mix(.10,.06,press):mix(.90,.08,press));
  vec2 light=vec2(cos(radians(u_lightAngle)),sin(radians(u_lightAngle)));
  float facing=dot(normal,light);
  float direction=.32+.68*pow(abs(facing),1.6);
  float rim=1.-smoothstep(0.,max(u_rimWidth,.5)*2.5,depth);
  float sheen=rim*mix(.73+.27*direction,direction,strength)*u_specular*mix(1.35,1.08,press);
  return mix(lens,vec3(1.),clamp(sheen,0.,1.));
}
float shapeDistance(vec2 p,int i){
  vec4 s=u_shapes[i];
  vec2 q=p-s.xy;
  float stretch=length(u_stretch[i]);
  if(stretch>.001){
    vec2 direction=u_stretch[i]/stretch;
    float halfSpan=dot(abs(direction),s.zw*.5);
    float axis=dot(q,direction);
    // Deform the trailing half more than the leading face.
    float back=1.-smoothstep(-halfSpan*.6,halfSpan*.55,axis);
    float extension=stretch*mix(.13,.87,back);
    q-=direction*axis*extension/(halfSpan+extension);
  }
  return roundedBox(q,s.zw*.5,u_radii[i]);
}
vec4 fieldAt(vec2 p,out vec4 dynamics,out vec2 contact,out float sliderPress){
  vec4 field=vec4(1e5,0.,0.,0.);
  dynamics=vec4(0.,0.,1.,0.);
  contact=vec2(0.);
  sliderPress=0.;
  for(int i=0;i<8;i++){
    if(i>=u_count)break;
    vec4 shape=u_shapes[i];
    float candidate=shapeDistance(p,i);
    float press=u_press[i];
    float scale=u_sizeScale>0.?clamp(min(shape.z,shape.w)/140.,.8,1.55):1.;
    vec4 motion=vec4(shape.xy,scale,press);
    vec3 material=vec3(float(u_surface[i]==1.),float(u_surface[i]==2.),float(u_surface[i]==3.));
    if(u_surface[i]==1.)sliderPress=press;
    float k=max(u_merge,0.)*(1.+.65*max(dynamics.w,press));
    if(k<=.001){
      if(candidate<field.x){field=vec4(candidate,material);dynamics=motion;contact=u_contact[i];}
      continue;
    }
    float h=clamp(.5+.5*(field.x-candidate)/k,0.,1.);
    float blend=clamp(.5+.5*(field.x-candidate)/(k*1.65),0.,1.);
    field.yzw=mix(field.yzw,material,blend);
    field.x=mix(field.x,candidate,h)-k*h*(1.-h);
    dynamics=mix(dynamics,motion,blend);
    contact=mix(contact,u_contact[i],blend);
  }
  return field;
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,u_size.y-gl_FragCoord.y);
  vec4 dynamics;
  vec2 contact;
  float sliderPress;
  vec4 merged=fieldAt(p,dynamics,contact,sliderPress);
  float field=merged.x,scale=dynamics.z,press=dynamics.w;
  vec2 centre=dynamics.xy;
  float contactRadius=max(30.,scale*62.);
  vec2 gradient=vec2(dFdx(field),-dFdy(field));
  vec3 base=sampleAt(p);
  float shadow=exp(-max(field,0.)/8.)*u_shadow*.22*(1.-merged.y);
  if(field>1.){color=vec4(base*(1.-shadow),1.);return;}
  vec2 n=length(gradient)>.001?normalize(gradient):normalize(p-centre+vec2(.0001));
  float mask=1.-smoothstep(-.8,.8,field);
  if(u_clearControls>.5){
    color=vec4(mix(base,sliderLens(p,n,field,press,true),mask),1.);
    return;
  }
  if(merged.y>.999){
    color=vec4(mix(base,sliderLens(p,n,field,sliderPress,false),mask),1.);
    return;
  }
  float edge=1.-smoothstep(0.,max(u_bezel*scale*.55*(1.+press*.25),1.),max(-field,0.));
  float profile=u_edge>0.?edge*(1.-edge*edge):edge*edge;
  vec2 bend=n*u_refraction*scale*.75*(1.+press*.45)*profile;
  float zoom=max(u_magnify+press*.16,1.);
  vec2 centerPull=(p-centre)*(1.-1./zoom)*(1.-edge);
  vec2 at=p-bend-centerPull;
  vec2 split=bend*u_dispersion;
  float blur=u_blur*scale*(1.-press*.15);
  vec3 soft=sampleSoft(at,blur);
  vec3 lens=soft;
  if(u_dispersion>0.)lens=vec3(sampleSoft(at-split,blur).r,soft.g,sampleSoft(at+split,blur).b);
  float luma=dot(lens,vec3(.2126,.7152,.0722));
  lens=mix(vec3(luma),lens,u_vibrancy);
  lens+=u_brightness;
  lens=mix(lens,mix(vec3(luma),soft,1.35),clamp(u_pickup,0.,1.));
  lens=mix(lens,u_tint,u_tintAmount);
  lens=mix(lens,vec3(luma),clamp(u_frost*.2,0.,.25));
  vec2 light=vec2(cos(radians(u_lightAngle)),sin(radians(u_lightAngle)));
  float facing=dot(n,light);
  float rim=1.-smoothstep(0.,max(u_rimWidth,.35)*2.25,abs(field));
  float shine=rim*u_specular*(.30+1.05*pow(max(facing,0.),1.65)+.92*pow(max(-facing,0.),2.));
  lens=mix(lens,vec3(1.),clamp(shine,0.,.85));
  vec2 delta=(p-contact)/contactRadius;
  float touch=exp(-dot(delta,delta))*press;
  lens+=press*.04+touch*.17;
  float autoMode=1.-smoothstep(.33,.68,luma);
  float mode=u_appearance<.5?1.:u_appearance<1.5?0.:autoMode;
  lens=mix(lens,vec3(1.),mode*.12);
  lens=mix(lens,vec3(0.),(1.-mode)*.05);
  lens=mix(lens,vec3(1.),.045 + press*.055);
  if(merged.z>.001){
    vec3 knob=mix(sampleSoft(at,2.),vec3(.99),.88-press*.47);
    lens=mix(lens,mix(knob,vec3(1.),rim*.57),merged.z);
  }
  if(merged.w>.001){
    vec3 selection=mix(sampleSoft(at,3.),vec3(.91,.93,.92),.58-press*.24);
    lens=mix(lens,mix(selection,vec3(1.),rim*(.22+shine*.67)),merged.w);
  }
  if(merged.y>.001)lens=mix(lens,sliderLens(p,n,field,sliderPress,false),merged.y);
  vec3 outside=base*(1.-max(shadow,u_dim*mask));
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
    this.canvas=canvas; this.shapes=[]; this.sliderTrack=null; this.controlBases={}; this.material={...PRESETS.apple}; this.available=false; this.destroyed=false; this.source=null;
    this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false}); if(!this.gl)return; const gl=this.gl, shaders=[];
    try {
      for(const [type,code] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));}
      this.program=gl.createProgram();shaders.forEach(shader=>gl.attachShader(this.program,shader));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(this.program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);
      const names=['size','sourceSize','source','count','shapes[0]','radii[0]','press[0]','surface[0]','stretch[0]','contact[0]','sliderTrack','sliderFill','clearControls','switchBase','segmentBase','switchOn','refraction','bezel','magnify','dispersion','edge','sizeScale','blur','frost','vibrancy','brightness','dim','appearance','pickup','tintAmount','tint','specular','rimWidth','lightAngle','shadow','merge'];
      this.uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(this.program,`u_${name}`)]));
      this.available=true;this.setMaterial(options);
      this.observer=new ResizeObserver(()=>this.render());this.observer.observe(canvas);
      this.contextLost=event=>{event.preventDefault();this.available=false;canvas.dispatchEvent(new Event('glassfallback'));};canvas.addEventListener('webglcontextlost',this.contextLost);
    } catch(error){this.error=error.message;this.destroy();} finally {shaders.forEach(shader=>gl.deleteShader(shader));}
  }
  setShapes(shapes){this.shapes=shapes.slice(0,8).map(s=>{const width=Math.max(1,Number(s.width)||1),height=Math.max(1,Number(s.height)||1);return{x:Number(s.x)||0,y:Number(s.y)||0,width,height,radius:clamp(Number(s.radius)||0,0,Math.min(width,height)/2),press:clamp(Number(s.press)||0,0,1),slider:s.slider===true,surface:s.surface,contactX:Number.isFinite(s.contactX)?s.contactX:Number(s.x)||0,contactY:Number.isFinite(s.contactY)?s.contactY:Number(s.y)||0,stretchX:clamp(Number(s.stretchX)||0,-48,48),stretchY:clamp(Number(s.stretchY)||0,-48,48)};});}
  setSliderTrack(track){
    this.sliderTrack=track && [track.x,track.y,track.width,track.height,track.fillX].every(Number.isFinite)
      && track.width>0 && track.height>0 ? {...track,height:Math.min(track.height,track.width)} : null;
  }
  setControlBases({ toggle, segment } = {}){
    const copy = box => box && [box.x,box.y,box.width,box.height].every(Number.isFinite)
      && box.width>0 && box.height>0 ? {...box} : null;
    this.controlBases={toggle:copy(toggle),segment:copy(segment)};
  }
  setMaterial(values={}){
    if(typeof values.clearControls==='boolean')this.material.clearControls=values.clearControls;
    for(const key of numeric)if(Number.isFinite(values[key]))this.material[key]=clamp(values[key],...ranges[key]);
    if(values.edge==='lip'||values.edge==='convex')this.material.edge=values.edge;
    if(['auto','light','dark'].includes(values.appearance))this.material.appearance=values.appearance;
    if(typeof values.sizeScale==='boolean')this.material.sizeScale=values.sizeScale;
    if(typeof values.interactive==='boolean')this.material.interactive=values.interactive;
    if(typeof values.tint==='string'&&/^#[0-9a-f]{6}$/i.test(values.tint))this.material.tint=values.tint;
  }
  setSource(source){
    if(!this.available||this.destroyed)return false;const gl=this.gl;const width=source.videoWidth||source.naturalWidth||source.width,height=source.videoHeight||source.naturalHeight||source.height;if(!width||!height)throw new Error('Load the glass source before setSource().');
    gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.generateMipmap(gl.TEXTURE_2D);this.sourceSize=[width,height];this.source=source;return true;
  }
  render(){
    if(!this.available||this.destroyed||!this.source)return;const gl=this.gl,box=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    const scale=Math.min(dpr,1);const width=Math.max(1,Math.round(box.width*scale)),height=Math.max(1,Math.round(box.height*scale));if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}gl.viewport(0,0,width,height);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.uniform1i(this.uniforms.source,0);gl.uniform2f(this.uniforms.size,width,height);gl.uniform2fv(this.uniforms.sourceSize,this.sourceSize);gl.uniform1i(this.uniforms.count,this.shapes.length);
    const shapes=new Float32Array(48),radii=new Float32Array(12),press=new Float32Array(12),surfaces=new Float32Array(12),stretch=new Float32Array(24),contacts=new Float32Array(24);const pixelScale=width/Math.max(1,box.width);this.shapes.forEach((s,i)=>{shapes.set([s.x*pixelScale,s.y*pixelScale,s.width*pixelScale,s.height*pixelScale],i*4);radii[i]=s.radius*pixelScale;press[i]=s.press;surfaces[i]=s.slider?1:s.surface==='switch'?2:s.surface==='selection'?3:0;stretch.set([s.stretchX*pixelScale,s.stretchY*pixelScale],i*2);contacts.set([s.contactX*pixelScale,s.contactY*pixelScale],i*2);});gl.uniform4fv(this.uniforms['shapes[0]'],shapes);gl.uniform1fv(this.uniforms['radii[0]'],radii);gl.uniform1fv(this.uniforms['press[0]'],press);gl.uniform1fv(this.uniforms['surface[0]'],surfaces);gl.uniform2fv(this.uniforms['stretch[0]'],stretch);gl.uniform2fv(this.uniforms['contact[0]'],contacts);
    const {toggle,segment}=this.controlBases;
    const base=(key,b)=>gl.uniform4f(this.uniforms[key],(b?.x??0)*pixelScale,(b?.y??0)*pixelScale,(b?.width??0)*pixelScale,(b?.height??0)*pixelScale);
    base('switchBase',toggle);base('segmentBase',segment);gl.uniform1f(this.uniforms.switchOn,toggle?.on?1:0);
    const track=this.sliderTrack;
    gl.uniform4f(this.uniforms.sliderTrack,(track?.x??0)*pixelScale,(track?.y??0)*pixelScale,(track?.width??0)*pixelScale,(track?.height??0)*pixelScale);
    gl.uniform1f(this.uniforms.clearControls,this.material.clearControls?1:0);
    gl.uniform1f(this.uniforms.sliderFill,(track?.fillX??0)*pixelScale);
    const m=this.material;for(const key of ['refraction','bezel','blur','rimWidth','merge'])gl.uniform1f(this.uniforms[key],m[key]*pixelScale);for(const key of numeric.filter(key=>!['refraction','bezel','blur','rimWidth','merge'].includes(key)))gl.uniform1f(this.uniforms[key],m[key]);
    gl.uniform1f(this.uniforms.edge,m.edge==='lip'?1:0);gl.uniform1f(this.uniforms.sizeScale,m.sizeScale?1:0);gl.uniform1f(this.uniforms.appearance,m.appearance==='light'?0:m.appearance==='dark'?1:2);gl.uniform3fv(this.uniforms.tint,hexToRgb(m.tint));gl.drawArrays(gl.TRIANGLES,0,6);
  }
  destroy(){this.observer?.disconnect();if(this.contextLost)this.canvas.removeEventListener('webglcontextlost',this.contextLost);if(this.gl){if(this.texture)this.gl.deleteTexture(this.texture);if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.program)this.gl.deleteProgram(this.program);}this.available=false;this.destroyed=true;}
}
