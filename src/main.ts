

import { htmlElement } from "./html"
import {Vector, Input, Renderer, Pos, Linearize, WebGlCompiler, JsRunner, JSCompiler, Resolution, vector} from "./shader"

document.body.appendChild(htmlElement("p", "USE ARROW KEYS", "", {class:"glcanvas"}))

let boxes = []

function colorbox(graph:Vector){
  const canvas = htmlElement("canvas", "", "", {class:"glcanvas"}) as HTMLCanvasElement
  canvas.width = 500
  canvas.height = 500
  document.body.appendChild(canvas)
  boxes.push(new Renderer(graph, canvas))
}

let P = Pos.fields.xy
let Time = new Input(1)
let PlayerPos = new Input(2)

let x = P.div(Resolution).mul(2)
x = x.get(0)

{  
  let RelP = P.mul(2).sub(Resolution)
  let CenterDist = RelP.div(Resolution.min()).length()

  P = vector(
    RelP.fields.x.atan(RelP.fields.y.neg()).sub(PlayerPos.fields.x),
    CenterDist.log().sub(PlayerPos.fields.y),
  )

  P.onclick = "P"

  // pertubations
  for (let i = 1; i<6; i++){
    P = P.add(
      P.fields.yx.mul(vector(4,3).add(i)).sin().div(i*2)
    ).add(Time.mul(.2,.1).mul(i+0.4).sin().div(i+2.3))
  }
  let dim = P.fields.y.add(PlayerPos.fields.y).mul(.2).sigmoid()
  colorbox(dim) // creates new display
  let color = P.fields.x.add(vector(0,1,4)).sin().add(vector(2,2,3)).normalize()
  color.onclick = "color" // debug view in console
  colorbox(color) // creates new display

  let wave = P.fields.y.mul(8).sin().abs().sub1().pow(4).mul(.4)
  colorbox(wave)
  colorbox(dim.mix(wave.add(color), 0))
}

{
  let p = (P.mul(2).sub(Resolution)).div(Resolution.min())
  p.onclick = "p"
  for (let i = 0; i < 8; i++){
    p = p.abs().div(p.dot(p)).sub(Time.mul(.2).cos().mul(.4).add(.9))
  }
}


const keymap = new Map<string, boolean>()
document.addEventListener("keydown", e=>{
  if (e.key.startsWith("Arrow")) e.preventDefault()
  keymap.set(e.key, true)
})
document.addEventListener("keyup", e=>keymap.set(e.key, false))

function render(time:number){

  let delta = 0;

  Time.update(t=>{
    time *= 0.001
    delta = time - t[0]
    return [time]
  })


  let dx = (keymap.get("ArrowRight") ?? false ? 1 : 0) - (keymap.get("ArrowLeft") ?? false ? 1 : 0)
  let dy = (keymap.get("ArrowUp") ?? false ? 1 : 0) - (keymap.get("ArrowDown") ?? false ? 1 : 0)


  PlayerPos.update(p=>
    [
      p[0] + delta * dx * 1,
      p[1] + delta * (dy) ,
    ])

  boxes.forEach(b=>b.render())
  requestAnimationFrame(render)
}
render(0)