import { htmlElement } from "./html";
import { AstNode, Renderer, Pos, Uniform, Vec, dtypes } from "./shader";

export {}

const canvas =  htmlElement("canvas", "" , "", {id:"glcanvas"}) as HTMLCanvasElement
document.body.appendChild(canvas)

canvas.width = window.innerWidth /2
canvas.height = window.innerHeight /2

const T = new Uniform("time", dtypes.float)
const Rot = new Uniform("rot", dtypes.float)

const sinuify = (x:AstNode)=>x.add(1).div(2)

let dist = Pos
.x().pow(2)
.add(Pos.y().pow(2)).pow(.5)

let angle = Pos.x()
.atan(Pos.y())
.add(Rot.mul(0.5))
let d = angle.mul(5).sin()
let r = dist.log().sub(T).mul(10).sin()
let spot = d.mul(r)

let color = Vec([spot,spot,0,1])


const renderer = new Renderer(color, canvas)


let  rot = 0.;
const keymap = new Map<String, boolean> ()

document.body.addEventListener("keydown",e=>{ keymap.set(e.key, true)})
document.body.addEventListener("keyup", e=>{ keymap.set(e.key, false)})

function render(time: number) {
  if (keymap.get("ArrowLeft") ?? false) rot += 0.1;
  else if (keymap.get("ArrowRight") ?? false)rot -= 0.1;
  T.setValue(time * 0.001)
  Rot.setValue(rot)
  renderer.render()
  requestAnimationFrame(render);
}

requestAnimationFrame(render);

