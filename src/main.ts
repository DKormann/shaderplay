

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

console.log(T.vectype);


console.log(T.sin().vectype);


let c = new Vector(1,0,T.sin())

let rend = colorbox(c)




function render(time:number){
  T.setValue(time * 0.001)
  rend.render()
  requestAnimationFrame(render)
}


render(0)
