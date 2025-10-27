(() => {
  const { useRef, useEffect, useMemo } = React;

  const vertexShader = `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShader = `
    precision mediump float;
    varying vec2 vUv;

    uniform float iTime;
    uniform vec3  iResolution;
    uniform float uScale;

    uniform vec2  uGridMul;
    uniform float uDigitSize;
    uniform float uScanlineIntensity;
    uniform float uGlitchAmount;
    uniform float uFlickerAmount;
    uniform float uNoiseAmp;
    uniform float uChromaticAberration;
    uniform float uDither;
    uniform float uCurvature;
    uniform vec3  uTint;
    uniform vec2  uMouse;
    uniform float uMouseStrength;
    uniform float uUseMouse;
    uniform float uPageLoadProgress;
    uniform float uUsePageLoadAnimation;
    uniform float uBrightness;

    float time;

    float hash21(vec2 p){
      p = fract(p * 234.56);
      p += dot(p, p + 34.56);
      return fract(p.x * p.y);
    }
    float noise(vec2 p){
      return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
    }
    mat2 rotate(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
    float fbm(vec2 p){
      p *= 1.1;
      float f = 0.0;
      float amp = 0.5 * uNoiseAmp;
      mat2 m0 = rotate(time * 0.02); f += amp*noise(p); p = m0*p*2.0; amp *= 0.454545;
      mat2 m1 = rotate(time * 0.02); f += amp*noise(p); p = m1*p*2.0; amp *= 0.454545;
      mat2 m2 = rotate(time * 0.08); f += amp*noise(p);
      return f;
    }
    float pattern(vec2 p, out vec2 q, out vec2 r){
      vec2 o1=vec2(1.0), o0=vec2(0.0);
      mat2 r01=rotate(0.1 * time);
      mat2 r1 =rotate(0.1);
      q = vec2(fbm(p + o1), fbm(r01 * p + o1));
      r = vec2(fbm(r1 * q + o0), fbm(q + o0));
      return fbm(p + r);
    }
    float digit(vec2 p){
      vec2 grid = uGridMul * 15.0;
      vec2 s = floor(p * grid) / grid;
      p = p * grid;
      vec2 q, r;
      float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;

      if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;
        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
      }

      if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
      }

      p = fract(p);
      p *= uDigitSize;

      float px5 = p.x * 5.0;
      float py5 = (1.0 - p.y) * 5.0;
      float x = fract(px5);
      float y = fract(py5);

      float i = floor(py5) - 2.0;
      float j = floor(px5) - 2.0;
      float n = i*i + j*j;
      float f = n * 0.0625;

      float isOn = step(0.1, intensity - f);
      float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);

      return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
    }
    float onOff(float a, float b, float c){
      return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
    }
    float displace(vec2 look){
      float y = look.y - mod(iTime * 0.25, 1.0);
      float window = 1.0 / (1.0 + 50.0 * y * y);
      return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
    }
    vec3 getColor(vec2 p){
      float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
      bar *= uScanlineIntensity;

      float disp = displace(p);
      p.x += disp;
      if (uGlitchAmount != 1.0) {
        p.x += disp * (uGlitchAmount - 1.0);
      }

      float mid = digit(p);

      const float off = 0.002;
      float sum = digit(p+vec2(-off,-off)) + digit(p+vec2(0.,-off)) + digit(p+vec2(off,-off)) +
                  digit(p+vec2(-off,0.)) + digit(p) + digit(p+vec2(off,0.)) +
                  digit(p+vec2(-off,off)) + digit(p+vec2(0.,off)) + digit(p+vec2(off,off));

      vec3 base = vec3(0.9)*mid + sum*0.1*vec3(1.0)*bar;
      return base;
    }
    vec2 barrel(vec2 uv){
      vec2 c = uv*2.0 - 1.0;
      float r2 = dot(c,c);
      c *= 1.0 + uCurvature * r2;
      return c*0.5 + 0.5;
    }
    void main(){
      time = iTime * 0.333333;
      vec2 uv = vUv;
      if(uCurvature != 0.0) uv = barrel(uv);
      vec2 p = uv * uScale;
      vec3 col = getColor(p);

      if(uChromaticAberration != 0.0){
        vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
        col.r = getColor(p + ca).r;
        col.b = getColor(p - ca).b;
      }

      col *= uTint;
      col *= uBrightness;

      if(uDither > 0.0){
        float rnd = hash21(gl_FragCoord.xy);
        col += (rnd - 0.5) * (uDither * 0.003922);
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function FaultyTerminal({
    scale = 1,
    gridMul = [2, 1],
    digitSize = 1.5,
    timeScale = 0.3,
    pause = false,
    scanlineIntensity = 0.3,
    glitchAmount = 1,
    flickerAmount = 1,
    noiseAmp = 0,
    chromaticAberration = 0,
    dither = 0,
    curvature = 0.2,
    tint = '#ffffff',
    mouseReact = true,
    mouseStrength = 0.2,
    dprCap = Math.min(window.devicePixelRatio || 1, 2),
    pageLoadAnimation = true,
    brightness = 1,
    className = '',
  }){
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);

    const tintVec = useMemo(() => {
      let h = tint.replace('#','').trim();
      if (h.length === 3) h = h.split('').map(c=>c+c).join('');
      const n = parseInt(h,16);
      return [(n>>16 & 255)/255, (n>>8 & 255)/255, (n & 255)/255];
    }, [tint]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const parent = wrapRef.current;
      const gl = canvas.getContext('webgl', { antialias:false, depth:false, stencil:false, preserveDrawingBuffer:false });
      if(!gl) return;

      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
        return s;
      };
      const vs = sh(gl.VERTEX_SHADER, vertexShader);
      const fs = sh(gl.FRAGMENT_SHADER, fragmentShader);
      const prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
      gl.useProgram(prog);

      const data = new Float32Array([ -1,-1,0,0,  1,-1,1,0,  -1,1,0,1,  1,1,1,1 ]);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'position');
      const aUv  = gl.getAttribLocation(prog, 'uv');
      gl.enableVertexAttribArray(aPos);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(aUv , 2, gl.FLOAT, false, 16, 8);

      const U = (n) => gl.getUniformLocation(prog, n);
      gl.uniform1f(U('uScale'), scale);
      gl.uniform2f(U('uGridMul'), gridMul[0], gridMul[1]);
      gl.uniform1f(U('uDigitSize'), digitSize);
      gl.uniform1f(U('uScanlineIntensity'), scanlineIntensity);
      gl.uniform1f(U('uGlitchAmount'), glitchAmount);
      gl.uniform1f(U('uFlickerAmount'), flickerAmount);
      gl.uniform1f(U('uNoiseAmp'), noiseAmp);
      gl.uniform1f(U('uChromaticAberration'), chromaticAberration);
      gl.uniform1f(U('uDither'), (typeof dither === 'boolean') ? (dither ? 1 : 0) : dither);
      gl.uniform1f(U('uCurvature'), curvature);
      gl.uniform3f(U('uTint'), tintVec[0], tintVec[1], tintVec[2]);
      gl.uniform1f(U('uMouseStrength'), mouseStrength);
      gl.uniform1f(U('uUseMouse'), mouseReact ? 1.0 : 0.0);
      gl.uniform1f(U('uUsePageLoadAnimation'), pageLoadAnimation ? 1.0 : 0.0);
      gl.uniform1f(U('uBrightness'), brightness);

      const uTime = U('iTime');
      const uRes  = U('iResolution');
      const uMouse= U('uMouse');
      const uPLP  = U('uPageLoadProgress');

      const renderScale = 0.6;
      const resize = () => {
        const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
        const r = parent.getBoundingClientRect();
        const w = Math.max(1, Math.floor(r.width  * dpr * renderScale));
        const h = Math.max(1, Math.floor(r.height * dpr * renderScale));
        canvas.width = w; canvas.height = h;
        canvas.style.width  = r.width + 'px';
        canvas.style.height = r.height + 'px';
        gl.viewport(0,0,w,h);
        gl.uniform3f(uRes, w, h, w / Math.max(1.0, h));
      };
      const ro = new ResizeObserver(resize);
      ro.observe(parent); resize();

      const mouse = {x:0.5, y:0.5};
      const setMouse = (x,y) => {
        const r = parent.getBoundingClientRect();
        mouse.x = (x - r.left) / r.width;
        mouse.y = 1 - (y - r.top) / r.height;
      };
      if (mouseReact) {
        const onMove = (e)=>setMouse(e.clientX, e.clientY);
        const onTouch= (e)=>{ if(!e.touches.length) return; const t=e.touches[0]; setMouse(t.clientX,t.clientY); };
        parent.addEventListener('mousemove', onMove, {passive:true});
        parent.addEventListener('touchmove', onTouch, {passive:true});
      }

      const fpsCap = 30, step = 1000/fpsCap;
      let last=0, start=0, raf=0, visible=true;

      const io = new IntersectionObserver(([ent])=>{
        visible = !!ent?.isIntersecting;
        if (visible) { raf = requestAnimationFrame(loop); }
        else { cancelAnimationFrame(raf); }
      }, {threshold:0.05});
      io.observe(parent);

      const loop = (t) => {
        if(!start) start=t;
        if (!visible || (t-last)<step || pause) { raf = requestAnimationFrame(loop); return; }
        last=t;

        const elapsed = (t*0.001) * timeScale;
        gl.uniform1f(uTime, elapsed);
        gl.uniform1f(uPLP, pageLoadAnimation ? Math.min((t-start)/2000.0,1.0) : 1.0);
        gl.uniform2f(uMouse, mouse.x, mouse.y);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      };
    }, [scale, gridMul, digitSize, timeScale, pause, scanlineIntensity, glitchAmount, flickerAmount,
        noiseAmp, chromaticAberration, dither, curvature, tintVec, mouseReact, mouseStrength,
        dprCap, pageLoadAnimation, brightness]);

    return (
      <div ref={wrapRef} style={{position:'absolute', inset:0}}>
        <canvas ref={canvasRef} style={{display:'block', width:'100%', height:'100%'}} />
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('faulty-root'))
    .render(<FaultyTerminal />);
})();
