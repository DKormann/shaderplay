

import { htmlElement } from "./html"
import {Vector, Input, Renderer, Pos, Linearize, WebGlCompiler} from "./shader"


document.body.appendChild(htmlElement("p", "USE ARROW KEYS", "", {class:"glcanvas"}))





function colorbox(graph:Vector){
  const canvas = htmlElement("canvas", "", "", {class:"glcanvas"}) as HTMLCanvasElement
  canvas.width = 500
  canvas.height = 500
  document.body.appendChild(canvas)
  return new Renderer(graph, canvas)
}

let T = new Input(1)





let PX = new Input(1)
let PY = new Input(1)

let R = Pos.length()
let A = Pos.x().atan(Pos.y()).add(PX)

let pulse = T.mul(5).sin().mul(.2)
let beam = A.mul(10).sin()
let circ = R.log().sub(PY).mul(10).sin()

let tiles = beam.mul(circ)

let color = new Vector([T, T, T.add(.5)])
color = color.sin()

let rend = colorbox(color.mul(tiles))

const keymap = new Map<string, boolean>()

document.addEventListener("keydown", e=>{
  keymap.set(e.key, true)
})
document.addEventListener("keyup", e=>{
  keymap.set(e.key, false)
})
let lasttime= 0
let px = 0
let py = 0

function render(time:number){
  time = time * 0.001
  let delta = time - lasttime
  lasttime = time

  let dx = (keymap.get("ArrowRight") ?? false ? 1 : 0) - (keymap.get("ArrowLeft") ?? false ? 1 : 0)
  let dy = keymap.get("ArrowUp") ?? false ? 1 : 0
  dy += 0
  
  px += delta * dx * 2
  py += delta * dy

  PX.set(px)
  PY.set(py)

  T.set(time)
  rend.render()
  requestAnimationFrame(render)
}


render(0)
