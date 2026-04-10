'use client';
import React, { useEffect, useRef } from 'react';

function AnimatedGradientBG() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl) { console.warn('WebGL2 not available'); return; }

    // Compile shader helper
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vertSrc = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

    const fragSrc = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void main(){
  float t=iTime*uTimeSpeed;
  vec2 uv=gl_FragCoord.xy/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);
  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;
  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);
  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));
  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;
  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  fragColor=vec4(col,1.0);
}`;

    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Fullscreen triangle (covers -1..1 clip space, same as OGL Triangle)
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const u = {};
    ['iResolution','iTime','uTimeSpeed','uColorBalance','uWarpStrength','uWarpFrequency',
     'uWarpSpeed','uWarpAmplitude','uBlendAngle','uBlendSoftness','uRotationAmount',
     'uNoiseScale','uGrainAmount','uGrainScale','uGrainAnimated','uContrast','uGamma',
     'uSaturation','uCenterOffset','uZoom','uColor1','uColor2','uColor3'
    ].forEach(name => { u[name] = gl.getUniformLocation(prog, name); });

    // Set static uniforms — cyberpunk dark theme
    const hexToRgb = h => [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255];
    const c1 = hexToRgb('#1a0e2e'); // deep indigo-black
    const c2 = hexToRgb('#0a0612'); // near black cool
    const c3 = hexToRgb('#2d1b4e'); // muted plum
    gl.uniform3f(u.uColor1, c1[0], c1[1], c1[2]);
    gl.uniform3f(u.uColor2, c2[0], c2[1], c2[2]);
    gl.uniform3f(u.uColor3, c3[0], c3[1], c3[2]);
    gl.uniform1f(u.uTimeSpeed, 0.15);
    gl.uniform1f(u.uColorBalance, 0.0);
    gl.uniform1f(u.uWarpStrength, 0.6);
    gl.uniform1f(u.uWarpFrequency, 3.0);
    gl.uniform1f(u.uWarpSpeed, 1.0);
    gl.uniform1f(u.uWarpAmplitude, 80.0);
    gl.uniform1f(u.uBlendAngle, 0.0);
    gl.uniform1f(u.uBlendSoftness, 0.15);
    gl.uniform1f(u.uRotationAmount, 300.0);
    gl.uniform1f(u.uNoiseScale, 1.5);
    gl.uniform1f(u.uGrainAmount, 0.06);
    gl.uniform1f(u.uGrainScale, 2.0);
    gl.uniform1f(u.uGrainAnimated, 1.0);
    gl.uniform1f(u.uContrast, 1.2);
    gl.uniform1f(u.uGamma, 1.0);
    gl.uniform1f(u.uSaturation, 0.7);
    gl.uniform2f(u.uCenterOffset, 0.0, 0.0);
    gl.uniform1f(u.uZoom, 0.9);

    // Resize handler
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.iResolution, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // Animation loop
    let raf = 0;
    const t0 = performance.now();
    const loop = (t) => {
      gl.uniform1f(u.iTime, (t - t0) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      try { container.removeChild(canvas); } catch {}
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />;
}

export default AnimatedGradientBG;
