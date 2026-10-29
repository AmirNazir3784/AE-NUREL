import { imagePlacement, rgb, type Background, type KeySettings } from "./key-core";

// The preview/reference key remains in keyPixels. Export can run the same math
// as a fragment shader, avoiding a full-resolution CPU readback on every frame.
export function createGpuKey(width: number, height: number, key: KeySettings, background: Background, image: ImageBitmap | null) {
  const canvas = new OffscreenCanvas(width, height);
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const shaders: WebGLShader[] = [], textures: WebGLTexture[] = [];
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
  const dispose = () => { textures.forEach(texture => gl.deleteTexture(texture)); shaders.forEach(shader => gl.deleteShader(shader)); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); gl.getExtension("WEBGL_lose_context")?.loseContext(); };
  try {
    if (Math.max(width, height, image?.width ?? 0, image?.height ?? 0) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) { dispose(); return null; }
    const compile = (type: number, text: string) => { const shader = gl.createShader(type); if (!shader) throw new Error("Shader allocation failed"); shaders.push(shader); gl.shaderSource(shader, text); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed"); return shader; };
    const vertex = compile(gl.VERTEX_SHADER, "attribute vec2 point; varying vec2 uv; void main(){uv=(point+1.0)*0.5;gl_Position=vec4(point,0.,1.);}");
    const fragment = compile(gl.FRAGMENT_SHADER, `precision highp float;
      varying vec2 uv; uniform sampler2D source; uniform sampler2D picture;
      uniform vec3 keyColor; uniform vec3 first; uniform vec3 second;
      uniform vec2 size; uniform vec4 imageBox; uniform float threshold; uniform float feather;
      uniform float spill; uniform int dominant; uniform int mode; uniform bool animated; uniform float time;
      void main(){
        vec4 pixel=texture2D(source,uv); vec3 chroma=pixel.rgb/max(1.0/255.0,pixel.r+pixel.g+pixel.b);
        float distance=length(chroma-keyColor); float t=clamp((distance-threshold)/feather,0.,1.);
        float alpha=t*t*(3.-2.*t)*pixel.a;
        if(dominant>=0 && distance<threshold+feather+0.3){
          float other=dominant==1?max(pixel.r,pixel.b):max(pixel.r,pixel.g);
          float channel=dominant==1?pixel.g:pixel.b;
          float cleaned=channel-max(0.,channel-other)*spill*clamp(1.-(distance-threshold-feather)/0.3,0.,1.);
          if(dominant==1)pixel.g=cleaned;else pixel.b=cleaned;
        }
        vec2 p=vec2(uv.x,1.-uv.y)*size; vec3 bg=first;
        if(mode==1){
          vec2 start=vec2(0.);vec2 delta=size;
          if(animated){vec2 radius=vec2(cos(time*0.7853981634),sin(time*0.7853981634))*size*0.5;start=size*0.5-radius;delta=radius*2.;}
          float amount=clamp(dot(p-start,delta)/dot(delta,delta),0.,1.);bg=mix(first,second,amount);
        }
        if(mode==2){vec2 pos=(p-imageBox.xy)/imageBox.zw;if(pos.x>=0.&&pos.x<=1.&&pos.y>=0.&&pos.y<=1.){vec4 img=texture2D(picture,vec2(pos.x,1.-pos.y));bg=mix(first,img.rgb,img.a);}}
        gl_FragColor=vec4(mix(bg,pixel.rgb,alpha),1.);
      }`);
    program = gl.createProgram(); if (!program) throw new Error("Program allocation failed");
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Program link failed"); gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const point = gl.getAttribLocation(program, "point"); gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program!, name);
    const texture = (unit: number) => {
      const value = gl.createTexture(); if (!value) throw new Error("Texture allocation failed"); textures.push(value); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, value);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return value;
    };
    const input = texture(0); gl.uniform1i(uniform("source"), 0);
    texture(1); gl.uniform1i(uniform("picture"), 1); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    if (image) {
      // ImageBitmap ignores UNPACK_FLIP_Y_WEBGL. Normalize through a canvas,
      // so image uploads use the same orientation as source-frame uploads.
      const normalized = new OffscreenCanvas(image.width, image.height); const context = normalized.getContext("2d"); if (!context) throw new Error("Image normalization failed"); context.drawImage(image, 0, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, normalized);
    } else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
    const color = rgb(key.color), sum = Math.max(1, color.reduce((a, b) => a + b, 0));
    gl.uniform3fv(uniform("keyColor"), color.map(value => value / sum)); gl.uniform3fv(uniform("first"), rgb(background.color).map(value => value / 255)); gl.uniform3fv(uniform("second"), rgb(background.second).map(value => value / 255));
    gl.uniform2f(uniform("size"), width, height); gl.uniform1f(uniform("threshold"), key.strength / 200); gl.uniform1f(uniform("feather"), .005 + key.softness * .003); gl.uniform1f(uniform("spill"), key.spill / 100);
    gl.uniform1i(uniform("dominant"), color[1] > Math.max(color[0], color[2]) * 1.15 ? 1 : color[2] > Math.max(color[0], color[1]) * 1.15 ? 2 : -1);
    gl.uniform1i(uniform("mode"), background.type === "solid" ? 0 : background.type === "gradient" ? 1 : 2); gl.uniform1i(uniform("animated"), background.animated ? 1 : 0);
    if (image) { const box = imagePlacement(image, { width, height }, background.fit); gl.uniform4f(uniform("imageBox"), box.x, box.y, box.width, box.height); }
    gl.viewport(0, 0, width, height);
    if (gl.getError() !== gl.NO_ERROR) throw new Error("Renderer initialization failed");
    return {
      render(frame: OffscreenCanvas, timestamp: number) {
        if (gl.isContextLost()) throw new Error("Video rendering was interrupted. Close unused graphics-heavy tabs and try again.");
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, input); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame); gl.uniform1f(uniform("time"), timestamp); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.flush();
        if (gl.getError() !== gl.NO_ERROR) throw new Error("The video frame could not be rendered. Try a smaller output size.");
        return canvas;
      }, dispose,
    };
  } catch { dispose(); return null; }
}
