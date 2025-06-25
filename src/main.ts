


import { htmlElement } from "./html"
import {Vec, Input, Renderer, AST, Pos} from "./shader"



function colorbox(graph:AST){
  const canvas = htmlElement("canvas", "", "", {class:"glcanvas"}) as HTMLCanvasElement
  canvas.width = 500
  canvas.height = 500
  document.body.appendChild(canvas)
  new Renderer(graph, canvas).render()
}



{
  let angle = Pos.x().atan(Pos.y())
  let r = Vec(0)
  for (let i = 1; i < 10; i++){
    let col = Vec(1-0.1*i,0,1,1)
    r = r.add(
      Pos.length().sub(0.1*i)
      .mul(-10).tanh().add(angle.mul(4).sin()).tanh()
      .mul(col)
    )
  }
  colorbox(r)
}
