import { htmlElement } from "./html";
import { AstNode, Renderer, Pos, Uniform, Vec, dtypes } from "./shader";

export {}

const canvas =  htmlElement("canvas", "" , "", {id:"glcanvas"}) as HTMLCanvasElement
document.body.appendChild(canvas)

canvas.width = window.innerWidth /2
canvas.height = window.innerHeight /2

const T = new Uniform("time", dtypes.float)
const Rot = new Uniform("rot", dtypes.float)


let dist = Pos.x().pow(2) .add(Pos.y().pow(2)).pow(.5)

let angle = Pos.x()
.atan(Pos.y())
.add(Rot.mul(0.5))
let d = angle.mul(5).sin()
let r = dist.log().sub(T).mul(10).sin()
let spot = d.mul(r).clamp(0,1)

let color = Vec([ T.sin(), (T.add(3).sin().add(r.mul(0.1))), (T.add(6).sin().add(r.mul(0.1))), ])


const renderer = new Renderer( Vec([color.mul(spot),1]), canvas)

let  rot = 0.;
const keymap = new Map<String, boolean> ()

document.body.addEventListener("keydown",e=>{ keymap.set(e.key, true)})
document.body.addEventListener("keyup", e=>{ keymap.set(e.key, false)})


let lasttime = 0;
let extraspeed = 1.

let mytime = 0


function render(time: number) {

  let delta = lasttime- time
  lasttime = time

  if (keymap.get("ArrowUp") ?? false) extraspeed += .2
  extraspeed *= 0.95

  mytime += delta * (extraspeed+ 1)
  
  if (keymap.get("ArrowLeft") ?? false) rot += 0.1;
  else if (keymap.get("ArrowRight") ?? false)rot -= 0.1;
  T.setValue( - mytime * 0.001)
  Rot.setValue(rot)
  renderer.render()
  requestAnimationFrame(render);
}

requestAnimationFrame(render);

