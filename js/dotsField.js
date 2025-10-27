
(() => {
  const cvs = document.getElementById('dots-field');
  if(!cvs) return;
  const ctx = cvs.getContext('2d');
  const DESKTOP = !matchMedia('(pointer:coarse)').matches;

  // === TWEAKS per punti più visibili ===
  const GRID_SIZE   = 22;     // 24 -> 22: griglia leggermente più fitta
  const BASE_RADIUS = 2.2;    // base 1.6 -> 2.2: punti più grandi
  const WAVE_AMP    = 0.50;   // influenza onda (0.35 -> 0.50)
  const REPEL_AMP   = 0.16;   // influenza repulsione (0.12 -> 0.16)
  const REPEL_RADIUS= 32;     // raggio repulsione (28 -> 32)
  const ALPHA       = 0.90;   // opacità puntini (0.85 -> 0.90)
  const SHADOW_BLUR = 6;      // glow discreto (0/4/6). Impostalo a 0 se vuoi disattivarlo.

  const DPI = Math.min(window.devicePixelRatio || 1, DESKTOP ? 1.7 : 1);
  let W=0, H=0, cols=0, rows=0, t=0, raf=0, visible=true;
  let mouse = {x:0.5, y:0.5};

  function resize(){
    const r = cvs.parentElement.getBoundingClientRect();
    W = Math.floor(r.width * DPI); H = Math.floor(r.height * DPI);
    cvs.width = W; cvs.height = H;
    cvs.style.width = r.width + 'px'; cvs.style.height = r.height + 'px';
    cols = Math.ceil(W / (GRID_SIZE*DPI));
    rows = Math.ceil(H / (GRID_SIZE*DPI));
    ctx.setTransform(DPI,0,0,DPI,0,0);
  }

  function draw(){
    ctx.clearRect(0,0,W/DPI,H/DPI);
    const gw = GRID_SIZE, gh = GRID_SIZE;
    const mx = mouse.x*(W/DPI), my = mouse.y*(H/DPI);

    // glow leggero e cheap
    ctx.shadowColor = 'rgba(120, 230, 255, 0.35)';
    ctx.shadowBlur  = SHADOW_BLUR;

    for(let y=0; y<=rows; y++){
      for(let x=0; x<=cols; x++){
        const px = x*gw, py = y*gh;

        const dx = px - mx, dy = py - my;
        const dist = Math.sqrt(dx*dx + dy*dy) + 1e-3;
        const wave = Math.sin((x*0.6 + y*0.6) + t*0.06) * 7; // 6 -> 7
        const repel = Math.max(0, REPEL_RADIUS - dist*0.08);

        // Raggio un po' più grande ma con clamp per non esagerare
        const radius = Math.max(1.1, (BASE_RADIUS + wave*WAVE_AMP + repel*REPEL_AMP) / 2);

        // palette teal con più contrasto
        const c = 190 + Math.floor(85*Math.sin((x+y)*0.08 + t*0.03));
        ctx.fillStyle = `rgba(${c-70}, ${c}, ${c+20}, ${ALPHA})`;

        ctx.beginPath();
        ctx.arc(px + dx/dist*repel*0.38, py + dy/dist*repel*0.38, radius, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // ripristina shadow per evitare side-effects altrove
    ctx.shadowBlur = 0;
  }

  const step = 1000/30;
  let last = 0;
  function loop(now){
    raf = requestAnimationFrame(loop);
    if (now - last < step) return;
    last = now; t += 1;
    draw();
  }

  function setMouse(clientX, clientY){
    const r = cvs.getBoundingClientRect();
    mouse.x = (clientX - r.left) / r.width;
    mouse.y = (clientY - r.top) / r.height;
  }
  cvs.addEventListener('mousemove', e => setMouse(e.clientX, e.clientY), {passive:true});
  cvs.addEventListener('touchmove', e => { if(!e.touches.length) return; const t=e.touches[0]; setMouse(t.clientX, t.clientY); }, {passive:true});

  new ResizeObserver(resize).observe(cvs.parentElement);
  resize();

  const io = new IntersectionObserver(([ent]) => {
    visible = !!ent?.isIntersecting;
    if (visible) { raf = requestAnimationFrame(loop); } else { cancelAnimationFrame(raf); }
  }, {threshold: .05});
  io.observe(cvs);

  raf = requestAnimationFrame(loop);
})();

