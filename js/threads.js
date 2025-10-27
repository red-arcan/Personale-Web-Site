(() => {
  const cvs = document.getElementById('threads-bg');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');

  // ===== Parametri (puoi ritoccarli) =====
  const DESKTOP = !matchMedia('(pointer:coarse)').matches;
  const DPR_CAP = DESKTOP ? 1.5 : 1;   // limite DPI per performance
  const FPS     = 30;                  // cap FPS
  const BANDS   = 4;                   // numero fasce
  const AMP_Y   = 60;                  // ampiezza onde verticali
  const AMP_X   = 30;                  // “sbandamento” orizzontale
  const SPEED   = 0.6;                 // velocità animazione
  const MOUSE_INFLUENCE = 0.12;        // quanto reagisce al mouse
  // palette teal → violet
  const COLORS = [
    ['rgba( 70, 220, 230, 0.45)','rgba( 20, 130, 255, 0.15)'],
    ['rgba( 60, 200, 255, 0.40)','rgba(150,  80, 255, 0.12)'],
    ['rgba(120, 240, 220, 0.35)','rgba(185, 120, 255, 0.10)'],
    ['rgba( 50, 160, 255, 0.30)','rgba(120,  90, 255, 0.10)'],
  ];
  // ======================================

  let W=0, H=0, DPR=1, raf=0, visible=true, t=0;
  const mouse = {x:0.5, y:0.5};

  function resize(){
    const r = cvs.parentElement.getBoundingClientRect();
    DPR = Math.min(DPR_CAP, window.devicePixelRatio || 1);
    cvs.width  = Math.max(1, Math.floor(r.width  * DPR));
    cvs.height = Math.max(1, Math.floor(r.height * DPR));
    cvs.style.width  = r.width + 'px';
    cvs.style.height = r.height + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    W = r.width; H = r.height;
  }
  new ResizeObserver(resize).observe(cvs.parentElement);
  resize();

  function bandPath(yBase, phase, freqX, freqY, offsetX){
    const points = 24;                   // pochi punti → super leggero
    const step = W / (points - 1);
    ctx.beginPath();
    for(let i=0;i<points;i++){
      const x = i*step;
      const y = yBase
        + Math.sin((i*freqX) + phase) * AMP_Y
        + Math.cos((i*freqY) + phase*0.7) * (AMP_Y*0.35);
      const xx = x + Math.sin(phase + i*0.2) * AMP_X + offsetX;
      (i===0) ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y);
    }
    // chiusura morbida verso il basso per riempimenti
    ctx.lineTo(W+50, H+50);
    ctx.lineTo(-50,  H+50);
    ctx.closePath();
  }

  function draw(now){
    ctx.clearRect(0,0,W,H);

    // leggero sfondo a vignetta
    const gBG = ctx.createRadialGradient(W*0.5, H*0.5, 10, W*0.5, H*0.5, Math.hypot(W,H)*0.6);
    gBG.addColorStop(0, 'rgba(0,0,0,0.15)');
    gBG.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = gBG; ctx.fillRect(0,0,W,H);

    const baseShiftX = (mouse.x - 0.5) * W * MOUSE_INFLUENCE;
    const baseShiftY = (mouse.y - 0.5) * H * MOUSE_INFLUENCE;

    for(let i=0;i<BANDS;i++){
      const yBase  = H*(0.25 + i*0.18) + baseShiftY*0.6*(i/(BANDS-1));
      const phase  = t*0.002 * SPEED + i*0.9;
      const freqX  = 0.35 + i*0.03;
      const freqY  = 0.22 + i*0.02;

      // gradiente della banda
      const g = ctx.createLinearGradient(0, yBase-AMP_Y-40, 0, yBase+AMP_Y+60);
      const c = COLORS[i % COLORS.length];
      g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);

      ctx.fillStyle = g;
      ctx.shadowBlur = 24;
      ctx.shadowColor = c[0].replace('0.45','0.65').replace('0.40','0.60').replace('0.35','0.55').replace('0.30','0.50');
      bandPath(yBase, phase, freqX, freqY, baseShiftX * (0.4 + i*0.15));
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  // mouse/touch
  function setMouse(eX,eY){
    const r = cvs.getBoundingClientRect();
    mouse.x = (eX - r.left) / r.width;
    mouse.y = (eY - r.top)  / r.height;
  }
  cvs.addEventListener('mousemove', e => setMouse(e.clientX, e.clientY), {passive:true});
  cvs.addEventListener('touchmove', e => { if(!e.touches.length) return; const t=e.touches[0]; setMouse(t.clientX, t.clientY); }, {passive:true});

  // loop con cap FPS e pausa off-screen
  const STEP = 1000 / FPS; let last = 0;
  function loop(now){
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    if (now - last < STEP) return;
    last = now; t = now; // usiamo il timestamp nativo
    draw(now);
  }

  const io = new IntersectionObserver(([ent])=>{
    visible = !!ent?.isIntersecting;
    if (visible){ last = performance.now(); raf = requestAnimationFrame(loop); }
    else { cancelAnimationFrame(raf); }
  }, {threshold: .05});
  io.observe(cvs);

  raf = requestAnimationFrame(loop);
})();