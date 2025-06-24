import { htmlElement } from "./html";
import { AstNode, Display, Pos, Uniform, Vec } from "./shader";

export {}


const canvas =  htmlElement("canvas", "" , "", {id:"glcanvas"}) as HTMLCanvasElement
document.body.appendChild(canvas)

canvas.width = window.innerWidth /2
canvas.height = window.innerHeight /2

const T = new Uniform("time", "float")

const sinuify = (x:AstNode)=>x.add(1).div(2)
let dist = Pos.x().pow(2).add(Pos.y().pow(2)).pow(.5)

let angle = Pos.x().atan(Pos.y())
let d = angle.mul(5).sin()
let r = dist.log().sub(T).mul(10).sin()
let spot = d.mul(r)


let color = new Vec(spot,spot,0,1)

const disp = new Display(color, canvas)

T.setValue(0.1 * 0.001)

let  rot = 0.;
const keymap = new Map<String, boolean> ()

document.body.addEventListener("keydown",e=>{
  keymap.set(e.key, true)
})

document.body.addEventListener("keyup", e=>{
  keymap.set(e.key, false)
})


function render(time: number) {

  if (keymap.get("ArrowLeft") ?? false) rot += 0.1;
  else if (keymap.get("ArrowRight") ?? false)rot -= 0.1;
  T.setValue(time * 0.001)
  disp.render()
  requestAnimationFrame(render);
}



requestAnimationFrame(render);

