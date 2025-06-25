

import { htmlElement } from "./html"
import {Vector, Input, Renderer, Pos, ln} from "./shader"


function colorbox(graph:Vector){
  const canvas = htmlElement("canvas", "", "", {class:"glcanvas"}) as HTMLCanvasElement

  canvas.width = 500
  canvas.height = 500
  document.body.appendChild(canvas)
  return new Renderer(graph, canvas)
}

let T = new Input(1)

let rad = T.mul(5).sin().mul(.2).add(5)
let r = Pos.length().mul(10).sub(rad).tanh()
let c = new Vector(0,r,0)
let rend = colorbox(c)


function render(time:number){
  T.setValue(time * 0.001)
  rend.render()
  requestAnimationFrame(render)
}


render(0)
