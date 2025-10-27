const { useRef, useEffect } = React;

function Threads({
  lines = 12,
  amplitude = 40,
  speed = 0.6,
  thickness = 1.5,
  colors = ['#61dca3','#61b3dc','#2b4539'],
  mouseInfluence = 0.2,
  dprCap = 2
}){
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const mouse = useRef({x:0.5, y:0.5});

  useEffect(()=>{
    const canvas = canvasRef.current;
    const parent = wrapRef.current;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    let W=0,H=0,dpr=1, t=0, visible=true;

    const resize=()=>{
      dpr = Math.min(window.devicePixelRatio||1, dprCap);
      const r = parent.getBoundingClientRect();
      W = Math.max(1, Math.floor(r.width * dpr));
      H = Math.max(1, Math.floor(r.height * dpr));
      canvas.width = W; canvas.height = H;
      canvas.style.width = r.width + 'px';
      canvas.style.height= r.height + 'px';
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(dpr,dpr);
    };
    const ro = new ResizeObserver(resize); ro.observe(parent); resize();

    const setMouse=(cx,cy)=>{
      const r = parent.getBoundingClientRect();
      mouse.current.x = (cx - r.left)/Math.max(1,r.width);
      mouse.current.y = (cy - r.top)/Math.max(1,r.height);
    };
    const onMove = e=>setMouse(e.clientX,e.clientY);
    const onTouch= e=>{ if(!e.touches?.length) return; const p=e.touches[0]; setMouse(p.clientX,p.clientY); };
    parent.addEventListener('mousemove', onMove, {passive:true});
    parent.addEventListener('touchmove', onTouch, {passive:true});

    const io = new IntersectionObserver(([ent])=>{
      visible = !!ent?.isIntersecting;
      if(visible){ rafRef.current=requestAnimationFrame(loop); }
      else { cancelAnimationFrame(rafRef.current); }
    }, {threshold:.05});
    io.observe(parent);

    const rand = (i)=> (Math.sin(i*12.9898+78.233)*43758.5453)%1;
    const colorsCycle = (i)=> colors[i % colors.length];

    function draw(){
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0,0,w,h);
      ctx.globalCompositeOperation = 'lighter';

      const mx = (mouse.current.x-0.5), my=(mouse.current.y-0.5);
      const amp = amplitude * (0.7 + 0.6*Math.sin(t*0.001));
      const baseGap = h/(lines+1);

      for(let i=0;i<lines;i++){
        const y = baseGap*(i+1);
        const phase = t*0.002*speed + i*0.35;
        const offsetY = Math.sin(phase)*amp*0.15 + my*amp*mouseInfluence;
        const offsetX = mx*amp*0.6;
        const k = 0.002 + 0.0008*i; // curvature factor

        ctx.lineWidth = thickness + (i%3===0?0.3:0);
        ctx.strokeStyle = colorsCycle(i);
        ctx.beginPath();

        const steps = 24;
        for(let s=0;s<=steps;s++){
          const p = s/steps;
          const x = p*w;
          const sway = Math.sin(phase + p*6 + i*0.7) * amp * (0.35 + 0.2*Math.sin(i+phase*0.7));
          const curve = (p-0.5)*(p-0.5)*-k*w; // subtle centripetal curve
          const yPos = y + offsetY + sway + curve;
          if(s===0) ctx.moveTo(x+offsetX, yPos);
          else ctx.lineTo(x+offsetX, yPos);
        }
        ctx.stroke();
      }

      // soft vignetting
      const grd = ctx.createRadialGradient(w*0.5,h*0.5,0,w*0.5,h*0.5,Math.max(w,h)*0.7);
      grd.addColorStop(0,'rgba(0,0,0,0)');
      grd.addColorStop(1,'rgba(0,0,0,0.35)');
      ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation = 'source-over';
    }

    const step=1000/30; let last=0;
    function loop(now){
      rafRef.current=requestAnimationFrame(loop);
      if(!visible || (now-last)<step) return; last=now; t+=16;
      draw();
    }
    rafRef.current=requestAnimationFrame(loop);

    return ()=>{
      cancelAnimationFrame(rafRef.current);
      ro.disconnect(); io.disconnect();
      parent.removeEventListener('mousemove', onMove);
      parent.removeEventListener('touchmove', onTouch);
    };
  },[lines, amplitude, speed, thickness, colors, mouseInfluence, dprCap]);

  return (
    <div ref={wrapRef} style={{position:'absolute', inset:0}}>
      <canvas ref={canvasRef} style={{display:'block', width:'100%', height:'100%'}} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('threads-root'))
  .render(<Threads />);

