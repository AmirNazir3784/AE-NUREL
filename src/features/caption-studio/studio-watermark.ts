// Shared by the real preview and video encoder, including frames with no cues.
export function paintStudioWatermark(ctx:CanvasRenderingContext2D,width:number,height:number,enabled:boolean){
  if(!enabled)return;
  const size=Math.max(9,Math.min(width,height)*.026),padding=size*.55,margin=Math.max(8,Math.min(width,height)*.025);
  ctx.save();ctx.font=`600 ${size}px Arial`;ctx.textAlign='left';ctx.textBaseline='middle';
  const label='AENural',boxWidth=ctx.measureText(label).width+padding*2+size*.3,boxHeight=size+padding*1.4;
  const left=width-boxWidth-margin,top=margin;
  ctx.fillStyle='rgba(9,24,20,.78)';ctx.fillRect(left,top,boxWidth,boxHeight);
  ctx.fillStyle='#ffae58';ctx.fillRect(left,top,size*.16,boxHeight);
  ctx.fillStyle='#ffffff';ctx.fillText(label,left+padding+size*.16,top+boxHeight/2);ctx.restore();
}
