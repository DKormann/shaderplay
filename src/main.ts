import { htmlElement } from "./html";
import { AstNode, Display, Pos, Uniform, Vec } from "./shader";

export {}


const canvas =  htmlElement("canvas", "" , "", {id:"glcanvas"}) as HTMLCanvasElement
document.body.appendChild(canvas)

canvas.width = window.innerWidth /2
canvas.height = window.innerHeight /2



const fx = new Uniform("time", "float")
const sinuify = (x:AstNode)=>x.add(1).div(2)

let dist = Pos.x().pow(2).add(Pos.y().pow(2)).pow(.5)

let angle = Pos.x().atan(Pos.y())
let d = angle.mul(5).sin()
let r = dist.log().mul(10).sin()
let spot = d.mul(r)

let col = new Vec(spot,0,0,1)






const disp = new Display(col, canvas)


const creategl = (graph: AstNode): WebGLRenderingContext => {


  const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
  const fs = compileShader(graph.compile(), gl.FRAGMENT_SHADER);
  
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program)!);
  }
  gl.useProgram(program);


  const posAttrLoc = gl.getAttribLocation(program, "a_position");
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1,  1,
    1,  1,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posAttrLoc);
  gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);


  const timeLoc = gl.getUniformLocation(program, "time")
  const rotLoc = gl.getUniformLocation(program, "rot")

  return gl
}


const gl = creategl (col)
let  rot = 0.;

const keymap = new Map<String, boolean> ()

document.body.addEventListener("keydown",e=>{
  keymap.set(e.key, true)
})

document.body.addEventListener("keyup", e=>{
  keymap.set(e.key, false)
})


function render(time: number) {

  if (keymap.get("ArrowLeft") ?? false){
    rot += 0.1;
  }else if (keymap.get("ArrowRight") ?? false){
    rot -= 0.1;
  }
  gl.uniform1f(timeLoc, time * 0.001); // Convert ms to seconds
  gl.uniform1f(rotLoc, rot)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(render);
}







requestAnimationFrame(render);

