

import { htmlElement } from "./html"
import {Vector, Input, Renderer, Pos, Linearize, WebGlCompiler, JsRunner, JSCompiler, Resolution, vector} from "./shader"


export function display(...graphs:Vector[]){

  let laststeer = ""
  
  const canvas = htmlElement("canvas", "", "", {class:"glcanvas"}) as HTMLCanvasElement
  canvas.width = isMobile ? window.innerWidth : 500
  canvas.height = isMobile ? window.innerHeight : 500

  canvas.addEventListener("touchstart", e=>{
    laststeer = e.touches[0].clientX < canvas.width/2 ? "ArrowLeft" : "ArrowRight"
    keymap.set(laststeer, true)
  })
  canvas.addEventListener("touchend", e=>{
    keymap.set(laststeer, false)
  })

  document.body.appendChild(canvas)
  boxes.push(new Renderer(graphs, canvas))
}

let boxes = []

const isMobile = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/) ? true : false



let P = Pos.fields.xy
let Time = new Input(1)
let PlayerPos = new Input(2)

let x = P.div(Resolution).mul(2)
x = x.get(0)


const rand = t =>{return t.add(2.4).mul(435.23).sin().mul(34).abs().frac()}

{  
  let RelP = P.mul(2).sub(Resolution).div(Resolution.min())

  P = vector(
    RelP.fields.x.atan(RelP.fields.y.neg()),
    RelP.length().log(),
  )//.add(PlayerPos)


  let tx = P.fields.x.div(3.1415*2)
  for (let i = 0; i <6; i++){
    let k = 1.8**i
    tx = tx.add(P.fields.y.mul(k*.2).frac().sub(.5).abs().div(k*2))
  }


  let playercoord = P.add(0,.3).div(.2)

  let playerR = playercoord.length()
  let playeroutline = playerR.sub1().mul(100).sigmoid()


  let refy = playerR.square().mul(2).sub(1).clamp(-.999,0.999).atanh().neg()
  let refx = playercoord.fields.x.atan(playercoord.fields.y)
  refy.onclick="refy"

  P = playeroutline.mix(
    vector(refx, refy)//.frac()
    ,
    P
  );

  P = P.add(PlayerPos)

  const xsteps = 32



  let bolts = vector(
    tx.mod(1),
    P.fields.y
    .sub(Time)
    )


  bolts = bolts
  .mul(xsteps,.5)
  .add(0, bolts.fields.x.steps(xsteps).mul(5.34))

  bolts = bolts.abs().frac().mul(2).sub(1).abs().sub1().mul(1,2).clamp(0,1).square().prod()
  .mul(rand(bolts.floor().mul(12.3,4.1).sum()).lt(0.1))


  // display(c)

  let playerskin = 0

  for (let i = 1; i<6; i++){
    P = P.add(
      P.fields.yx.mul(vector(4,3).add(i)).sin().div(i*2)
    ).add(Time.mul(.2,.1).mul(i+0.4).sin().div(i+2.3))
  }
  let color = P.fields.x.add(vector(0,1,4)).sin().add(vector(2,2,3)).normalize()
  let wave = P.fields.y.sub(PlayerPos.fields.y).mul(8).sin().abs().sub1().pow(4).mul(.4)


  let dim = P.fields.y.sub(PlayerPos.fields.y).add(1).sigmoid()
  dim.onclick="dim"

  
  
  let world = bolts.mix([1,.2,.2], color.mul(dim))
  display(world)

  display(playeroutline.mix(playerskin, world))


}



const keymap = new Map<string, boolean>()
document.addEventListener("keydown", e=>{
  if (e.key.startsWith("Arrow")) e.preventDefault()
  keymap.set(e.key, true)
})
document.addEventListener("keyup", e=>keymap.set(e.key, false))

const twopi = Math.PI * 2

function render(time:number){

  let delta = 0;

  Time.update(t=>{
    time *= 0.001
    delta = time - t[0]
    return [time]
  })


  let dx = (keymap.get("ArrowRight") ?? false ? 1 : 0) - (keymap.get("ArrowLeft") ?? false ? 1 : 0)
  let dy = (keymap.get("ArrowDown") ?? false ? 1 : 0) - (keymap.get("ArrowUp") ?? false ? 1 : 0)



  PlayerPos.update(p=>
    [
      ((p[0] + delta * dx * 1) % twopi + twopi) % twopi,
      p[1] + delta * dy,
    ])

  boxes.forEach(b=>b.render())
  requestAnimationFrame(render)
}
render(0)