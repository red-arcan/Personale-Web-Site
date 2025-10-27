(() => {
    const cvs = document.getElementById('neon-matrix');
    if(!cvs) return;
    const gl  = cvs.getContext('webgl', { antialias:false, depth:false, stencil:false });
    if(!gl) return;
  
    /* ===== Shader: “Neon Matrix Wave” ===== */
    const VS = `
      attribute vec2 aPos; attribute vec2 aUv; varying vec2 vUv;
      void main(){ vUv = aUv; gl_Position = vec4(aPos, 0.0, 1.0); }
    `;
  
    /* 
      Effetto: grande pattern di celle “digitali” che scorrono, con glow neon
      e sfumature teal → violet. Interazione leggera col mouse.
    */
    const FS = `
      precision mediump float;
      varying vec2 vUv;
  
      uniform vec2  uRes;
      uniform float uTime;
      uniform vec2  uMouse;
  
      // Parametri principali (puoi ritoccarli)
      const float SCALE      = 1.8;    // zoom globale (più alto = pattern più grande)
      const float SPEED      = 0.30;   // velocità
      const float INTENSITY  = 1.25;   // contrasto/glow
      const float GLOW       = 0.70;   // alone
      const float GRID_DENS  = 1.10;   // densità griglia
  
      // Tavolozza teal → violet
      vec3 palette(float t){
        vec3 a = vec3(0.06, 0.20, 0.22);
        vec3 b = vec3(0.30, 0.85, 0.98);
        vec3 c = vec3(0.65, 0.20, 0.85);
        // blend a → b → c
        return mix(mix(a, b, smoothstep(0.0, 0.6, t)), c, smoothstep(0.4, 1.0, t));
      }
  
      // hash/rumore veloce
      float hash21(vec2 p){ p = fract(p*vec2(123.34, 345.45)); p += dot(p, p+34.23); return fract(p.x*p.y); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0,0.0));
        float c = hash21(i + vec2(0.0,1.0));
        float d = hash21(i + vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a, b, u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
      }
  
      // cella digitale “accesa/spenta” con bordi morbidi
      float digitalCell(vec2 p){
        vec2 g = vec2(5.0);                 // risoluzione interno cella
        vec2 q = fract(p*g) - 0.5;
        vec2 r = 1.0 - smoothstep(0.36, 0.50, abs(q)); // “pixel” centrale
        float core = r.x * r.y;
  
        // plus/diamond opzionali per varietà
        float cross = smoothstep(0.46,0.40,abs(q.x)) * step(abs(q.y),0.08);
        float diamond = smoothstep(0.55,0.40,abs(q.x+q.y)) * smoothstep(0.55,0.40,abs(q.x-q.y));
        return max(core, max(cross*0.7, diamond*0.6));
      }
  
      void main(){
        // coordinate normalizzate con aspect
        vec2 R = uRes;
        vec2 uv = (vUv*R) / min(R.x, R.y);
  
        // movimento globale e “parallasse” con mouse
        vec2 m  = uMouse*2.0 - 1.0;
        float t = uTime*SPEED;
        uv *= SCALE;
        uv += vec2(t*0.8, t*0.6);
        uv += m*0.35;
  
        // deformazione lieve per dinamica
        uv.x += 0.06*sin(uv.y*1.8 + t*2.0);
        uv.y += 0.06*sin(uv.x*1.5 - t*1.6);
  
        // griglia “macro”
        vec2 grid = uv * GRID_DENS;
        vec2 cell = floor(grid);
        float n = noise(cell*0.73 + t*0.7);
        float on = step(0.35, n);                  // accensione stocastica della cella
        float mat = digitalCell(grid);             // “pixel” interno
  
        // modulazioni di luminosità
        float flick = 0.6 + 0.4*sin(t*6.0 + cell.x + cell.y);
        float val = on * mat * flick;
  
        // glow cheap (campioni offset)
        float off = 0.010;
        float sum = val;
        sum += 0.6 * (on * digitalCell(grid + vec2(off, 0.0)));
        sum += 0.6 * (on * digitalCell(grid + vec2(0.0, off)));
        sum += 0.6 * (on * digitalCell(grid + vec2(-off,-off)));
  
        float shade = clamp(pow(sum * INTENSITY, 1.0), 0.0, 1.0);
  
        // colore
        vec3 col = palette(shade);
        // glow additivo
        col += GLOW * shade * vec3(0.25, 0.9, 1.0);
  
        // vignettatura leggera
        vec2 c = vUv - 0.5;
        col *= 1.0 - 0.7 * dot(c,c);
  
        gl_FragColor = vec4(col, 1.0);
      }
    `;
  
    // ---- setup program
    function SH(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ console.error(gl.getShaderInfoLog(s)); return null; } return s; }
    const prog = gl.createProgram();
    gl.attachShader(prog, SH(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, SH(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ console.error(gl.getProgramInfoLog(prog)); }
  
    gl.useProgram(prog);
  
    // quad full-screen
    const data = new Float32Array([
      -1,-1, 0,0,
       1,-1, 1,0,
      -1, 1, 0,1,
       1, 1, 1,1
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    const aUv  = gl.getAttribLocation(prog, 'aUv');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aUv , 2, gl.FLOAT, false, 16, 8);
  
    // uniform
    const uRes  = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse= gl.getUniformLocation(prog, 'uMouse');
  
    // DPR cap + render scale per performance
    const DPR_CAP = (matchMedia('(pointer:coarse)').matches ? 1 : 1.5);
    const renderScale = (matchMedia('(pointer:coarse)').matches ? 0.8 : 0.95);
  
    function resize(){
      const r = cvs.parentElement.getBoundingClientRect();
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(r.width  * dpr * renderScale));
      const h = Math.max(1, Math.floor(r.height * dpr * renderScale));
      cvs.width = w; cvs.height = h;
      cvs.style.width = r.width + 'px';
      cvs.style.height= r.height + 'px';
      gl.viewport(0,0,w,h);
      gl.uniform2f(uRes, w, h);
    }
    new ResizeObserver(resize).observe(cvs.parentElement); resize();
  
    // input mouse/touch
    const mouse = {x:0.5, y:0.5};
    function setMouse(x,y){
      const r = cvs.getBoundingClientRect();
      mouse.x = (x - r.left) / r.width;
      mouse.y = (y - r.top)  / r.height;
    }
    cvs.addEventListener('mousemove', e=>setMouse(e.clientX,e.clientY), {passive:true});
    cvs.addEventListener('touchmove', e=>{ if(!e.touches.length) return; const t=e.touches[0]; setMouse(t.clientX,t.clientY); }, {passive:true});
  
    // loop con FPS cap e pausa fuori viewport
    const step = 1000/30; // 30fps
    let last=0, raf=0, visible=true, start=0;
    function frame(t){
      raf = requestAnimationFrame(frame);
      if(!start) start=t;
      if(!visible || (t-last)<step) return; last=t;
  
      gl.uniform1f(uTime, (t-start)*0.001);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  
    const io = new IntersectionObserver(([ent])=>{
      visible = !!ent?.isIntersecting;
      if(visible){ raf = requestAnimationFrame(frame); } else { cancelAnimationFrame(raf); }
    }, {threshold:.05});
    io.observe(cvs);
  
    raf = requestAnimationFrame(frame);
  })();