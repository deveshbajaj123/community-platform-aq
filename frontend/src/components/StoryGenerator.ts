
// ── Story data types ─────────────────────────────────────────────
export interface StoryData {
  type: 'post' | 'opening'
  title?: string; body?: string; authorName?: string; authorAvatar?: string
  authorSchool?: string; category?: string; uuid?: string
  openingTitle?: string; description?: string; skills?: string[]
  teamName?: string; teamCategory?: string; teamUuid?: string
}

const W = 1080, H = 1920
const MINT='#00E5A0', LEMON='#FFC700', PINK='#FF6BD6', INK='#0A0A0A', WHITE='#FFFFFF', CARD='#131313'
const CAT_COLORS: Record<string,string> = { welfare: MINT, events: '#FF7A1A', labs: LEMON, operations: '#3DA9FC', content: PINK }
const catColor = (c?: string) => CAT_COLORS[(c||'').toLowerCase()] || MINT

function grid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
  for (let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for (let y=0;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, color: string, alpha=1) {
  ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle=color; ctx.translate(cx,cy); ctx.beginPath()
  for (let i=0;i<16;i++){const a=(i*Math.PI)/8-Math.PI/2,r=i%2===0?sz:sz*0.38;i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
  ctx.closePath(); ctx.fill(); ctx.restore()
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath()
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words=text.split(' '); let line='',cy=y
  for (const w of words){const t=line?`${line} ${w}`:w;if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,x,cy);line=w;cy+=lh}else line=t}
  if(line)ctx.fillText(line,x,cy); return cy+lh
}

function logo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.font='900 50px "NeutralFace","Arial Black",Impact,sans-serif'
  ctx.fillStyle=WHITE; ctx.fillText('AQUA',x,y)
  ctx.fillStyle=MINT; ctx.fillText('TERRA.',x+ctx.measureText('AQUA').width+5,y)
}

function postStory(ctx: CanvasRenderingContext2D, d: StoryData) {
  const ac=catColor(d.category)
  ctx.fillStyle=INK; ctx.fillRect(0,0,W,H); grid(ctx)
  ctx.fillStyle=ac; ctx.fillRect(0,0,W,12)
  logo(ctx,72,120); star(ctx,W-130,150,90,ac,0.65); star(ctx,80,H-230,52,LEMON,0.45); star(ctx,W-85,H-430,38,PINK,0.4)

  const catLabel=(d.category||'general').toUpperCase()
  ctx.font='700 26px "JetBrains Mono",monospace'; const cw=ctx.measureText(catLabel).width+52
  rrect(ctx,W-cw-72,74,cw,50,25); ctx.fillStyle=ac+'2A'; ctx.fill(); ctx.strokeStyle=ac; ctx.lineWidth=2; ctx.stroke()
  ctx.fillStyle=ac; ctx.fillText(catLabel,W-cw-72+26,107)

  rrect(ctx,48,240,W-96,1120,32); ctx.fillStyle=CARD; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=2; ctx.stroke()

  const ay=312
  ctx.fillStyle=ac; ctx.beginPath(); ctx.arc(116,ay,46,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=WHITE; ctx.lineWidth=3; ctx.stroke()
  const ini=(d.authorName||'AQ').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()
  ctx.font='900 36px "NeutralFace",sans-serif'; ctx.fillStyle=INK; ctx.textAlign='center'; ctx.fillText(ini,116,ay+14); ctx.textAlign='left'
  ctx.font='700 34px "NeutralFace",sans-serif'; ctx.fillStyle=WHITE; ctx.fillText(d.authorName||'AQ Member',186,ay-2)
  if(d.authorSchool){ctx.font='500 24px "JetBrains Mono",monospace';ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillText(d.authorSchool,186,ay+34)}

  ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(80,392); ctx.lineTo(W-80,392); ctx.stroke()

  const excerpt=(d.body||'').slice(0,300)
  const fs=excerpt.length>140?52:excerpt.length>70?64:76
  ctx.font=`900 ${fs}px "NeutralFace","Arial Black",Impact,sans-serif`; ctx.fillStyle=WHITE
  const ey=wrap(ctx,excerpt,80,450,W-160,fs*1.22)

  ctx.fillStyle=ac; ctx.fillRect(80,Math.min(ey+32,1290),110,8)
  ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(206,Math.min(ey+32,1290),W-286,8)

  ctx.font='700 30px "NeutralFace",sans-serif'; ctx.fillStyle=WHITE; ctx.fillText('read full post →',72,1480)
  ctx.font='500 24px "JetBrains Mono",monospace'; ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillText('community.aquaterra.in',72,1528)

  ctx.fillStyle=ac; ctx.fillRect(0,H-12,W,12)
  ctx.font='600 24px "JetBrains Mono",monospace'; ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillText('aquaterra.in  ·  @ngo.aquaterra  ·  student-run',72,H-56)
}

function openingStory(ctx: CanvasRenderingContext2D, d: StoryData) {
  const ac=catColor(d.teamCategory)
  ctx.fillStyle=INK; ctx.fillRect(0,0,W,H); grid(ctx)

  const g=ctx.createLinearGradient(0,0,W,520); g.addColorStop(0,ac+'99'); g.addColorStop(1,'transparent')
  ctx.fillStyle=g; ctx.fillRect(0,0,W,520)
  ctx.fillStyle=ac; ctx.fillRect(0,0,W,12)

  star(ctx,W-105,118,108,WHITE,0.07); star(ctx,88,H-218,56,ac,0.5); star(ctx,W-88,H-510,42,LEMON,0.42)
  logo(ctx,72,116)

  rrect(ctx,72,184,390,58,29); ctx.fillStyle=ac; ctx.fill(); ctx.strokeStyle=INK; ctx.lineWidth=3; ctx.stroke()
  ctx.font='900 27px "JetBrains Mono",monospace'; ctx.fillStyle=INK; ctx.fillText("★ WE'RE HIRING",100,223)

  const tl=(d.teamName||'AquaTerra').toUpperCase()
  ctx.font='700 28px "JetBrains Mono",monospace'; const tw=ctx.measureText(tl).width+52
  rrect(ctx,72,278,tw,54,27); ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fill()
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=2; ctx.stroke()
  ctx.fillStyle=WHITE; ctx.fillText(tl,98,315)

  const title=(d.openingTitle||'Open Role')
  const tfs=title.length>28?88:title.length>18?104:120
  ctx.font=`900 ${tfs}px "NeutralFace","Arial Black",Impact,sans-serif`; ctx.fillStyle=WHITE
  const tey=wrap(ctx,title.toUpperCase(),72,402,W-144,tfs*1.12)
  ctx.fillStyle=ac; ctx.fillRect(72,tey+10,190,10)

  if(d.description){
    const dY=tey+72; ctx.font='400 36px "Eina01",Arial,sans-serif'; ctx.fillStyle='rgba(255,255,255,0.68)'
    const td=d.description.slice(0,200)+(d.description.length>200?'…':'')
    const dey=wrap(ctx,td,80,dY+52,W-200,52)
    rrect(ctx,72,dY,W-144,dey-dY+28,20); ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fill()
  }

  if(d.skills?.length){
    const skY=tey+(d.description?360:110)
    ctx.font='700 22px "JetBrains Mono",monospace'; ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.fillText('SKILLS',72,skY)
    let sx=72,sy=skY+22
    for(const sk of d.skills.slice(0,7)){
      ctx.font='700 25px "JetBrains Mono",monospace'; const sw=ctx.measureText(sk).width+36
      if(sx+sw>W-72){sx=72;sy+=58}
      rrect(ctx,sx,sy,sw,48,24); ctx.fillStyle='rgba(255,255,255,0.09)'; ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.17)'; ctx.lineWidth=1.5; ctx.stroke()
      ctx.fillStyle=WHITE; ctx.fillText(sk,sx+18,sy+33); sx+=sw+14
    }
  }

  const ctaY=H-390
  rrect(ctx,72,ctaY,W-144,178,24); ctx.fillStyle=ac; ctx.fill(); ctx.strokeStyle=INK; ctx.lineWidth=4; ctx.stroke()
  ctx.font='900 44px "NeutralFace",sans-serif'; ctx.fillStyle=INK; ctx.textAlign='center'; ctx.fillText('APPLY NOW →',W/2,ctaY+66)
  ctx.font='700 27px "JetBrains Mono",monospace'; ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillText('aquaterrakolkata@gmail.com',W/2,ctaY+128); ctx.textAlign='left'

  ctx.fillStyle=ac; ctx.fillRect(0,H-12,W,12)
  ctx.font='600 24px "JetBrains Mono",monospace'; ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillText('aquaterra.in  ·  @ngo.aquaterra  ·  student-run NGO',72,H-52)
}

export async function generateStory(data: StoryData): Promise<string> {
  await document.fonts.ready
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H
  const ctx=canvas.getContext('2d')!; ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'
  if(data.type==='post') postStory(ctx,data); else openingStory(ctx,data)
  return canvas.toDataURL('image/png')
}

export function downloadStory(dataUrl: string, filename: string) {
  const a=document.createElement('a'); a.href=dataUrl; a.download=filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
