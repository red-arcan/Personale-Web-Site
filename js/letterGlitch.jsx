const { useRef, useEffect } = React;

function LetterGlitch({
  glitchColors = ['#2b4539', '#61dca3', '#61b3dc'],
  glitchSpeed = 50,
  centerVignette = true,
  outerVignette = false,
  smooth = true,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789'
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const letters = useRef([]);
  const grid = useRef({ columns: 0, rows: 0 });
  const ctx = useRef(null);
  const last = useRef(Date.now());

  const chars = Array.from(characters);
  const fontSize = 16, charW = 10, charH = 20;

  const rchar = () => chars[Math.floor(Math.random()*chars.length)];
  const rcol  = () => glitchColors[Math.floor(Math.random()*glitchColors.length)];
  const hex2 = h => {
    const s=/^#?([a-f\d])([a-f\d])([a-f\d])$/i; h=h.replace(s,(m,r,g,b)=>r+r+g+g+b+b);
    const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:null;
  };
  const lerpC=(a,b,t)=>`rgb(${Math.round(a.r+(b.r-a.r)*t)},${Math.round(a.g+(b.g-a.g)*t)},${Math.round(a.b+(b.b-a.b)*t)})`;

  const gridFor=(w,h)=>({columns:Math.ceil(w/charW),rows:Math.ceil(h/charH)});
  const init=(c,r)=>{
    grid.current={columns:c,rows:r};
    letters.current=Array.from({length:c*r},()=>({char:rchar(),color:rcol(),target:rcol(),t:1}))
  };
  const draw=()=>{
    const cvs=canvasRef.current; if(!cvs) return; const parent=cvs.parentElement; if(!parent) return;
    const {columns,rows}=grid.current; const w=parent.clientWidth, h=parent.clientHeight;
    ctx.current.clearRect(0,0,w,h);
    ctx.current.fillStyle='#0a0a0a'; ctx.current.fillRect(0,0,w,h);
    ctx.current.font=`${fontSize}px monospace`; ctx.current.textAlign='center'; ctx.current.textBaseline='middle';
    const offX=(w-columns*charW)/2+charW/2, offY=(h-rows*charH)/2+charH/2;
    letters.current.forEach((L,i)=>{
      const x=offX+(i%columns)*charW, y=offY+Math.floor(i/columns)*charH;
      ctx.current.fillStyle=L.color; ctx.current.fillText(L.char,x,y);
    });
  };
  const update=()=>{
    const n=Math.max(1,Math.floor(letters.current.length*0.05));
    for(let i=0;i<n;i++){
      const k=Math.floor(Math.random()*letters.current.length);
      const cell=letters.current[k]; if(!cell) continue;
      cell.char=rchar(); cell.target=rcol(); cell.t=smooth?0:1; if(!smooth) cell.color=cell.target;
    }
  };
  const smoothStep=()=>{
    let need=false;
    letters.current.forEach(c=>{
      if(c.t<1){ c.t+=0.05; if(c.t>1)c.t=1;
        const a=hex2(c.color), b=hex2(c.target); if(a&&b){ c.color=lerpC(a,b,c.t); need=true; }
      }
    });
    if(need) draw();
  };
  const resize=()=>{
    const cvs=canvasRef.current, parent=cvs.parentElement; if(!parent) return;
    const dpr=window.devicePixelRatio||1, r=parent.getBoundingClientRect();
    cvs.width=r.width*dpr; cvs.height=r.height*dpr; cvs.style.width=`${r.width}px`; cvs.style.height=`${r.height}px`;
    ctx.current.setTransform(dpr,0,0,dpr,0,0);
    const {columns,rows}=gridFor(r.width,r.height); init(columns,rows); draw();
  };
  const loop=()=>{
    const now=Date.now();
    if(now-last.current>=glitchSpeed){ update(); draw(); last.current=now; }
    if(smooth) smoothStep();
    animationRef.current=requestAnimationFrame(loop);
  };

  useEffect(()=>{
    const cvs=canvasRef.current; ctx.current=cvs.getContext('2d');
    resize(); loop();
    let to; const onR=()=>{ clearTimeout(to); to=setTimeout(()=>{ cancelAnimationFrame(animationRef.current); resize(); loop(); },120); };
    window.addEventListener('resize',onR);
    return ()=>{ cancelAnimationFrame(animationRef.current); window.removeEventListener('resize',onR); };
  },[]);

  return (
    <div className="visual-canvas" style={{background:'#000'}}>
      <canvas ref={canvasRef} style={{display:'block',width:'100%',height:'100%'}} />
      {outerVignette && <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)'}}/>}
      {centerVignette && <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)'}}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('react-root'))
  .render(<LetterGlitch />);

