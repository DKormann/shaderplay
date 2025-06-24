import { htmlElement } from "./html";
import { AstNode, Renderer, Pos, Input, Vec, dtypes, Const,Data } from "./shader";

export {}


document.body.appendChild(htmlElement("p","USE ARROW BUTTONS", ""))
const canvas =  htmlElement("canvas", "" , "", {id:"glcanvas"}) as HTMLCanvasElement
document.body.appendChild(canvas)

canvas.width = 500
canvas.height = 500

const distance = (Pos:AstNode)=>{
  return Pos.x().pow(2).add(Pos.y().pow(2)).pow(.5)
}

const Mix = (t:AstNode, x:AstNode, y:AstNode)=>{
  t=t.clamp(0,1)
  return x.mul(I.sub(t)).add(y.mul(t))
}

const I = new Const(1)

const T = new Input()
const Rot = new Input()


let angle = Pos.x().atan(Pos.y().mul(-1))

let r = distance(Pos).log().mul(-1)

let tiles = angle.add(Rot.mul(0.5)).mul(5).sin()
.mul(r.mul(5)
.add(T.mul(5)).sin()).clamp(0,1)

let color = Vec([1,3,6])
.add(T.mul(2.))
.add(r.mul(0.1))
.sin().mul(tiles)

let relpos = Vec([r,angle])

const PlayerAlpha = distance(relpos.sub(Vec([.5,0]))).mul(-8).add(2).clamp(0,1)
color = Mix(PlayerAlpha, color, Vec([1,0,0]))


const renderer = new Renderer( Vec([color, 1]), canvas)




let rot = 0.;
const keymap = new Map<String, boolean>()

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

