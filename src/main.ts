import { htmlElement } from "./html"
import {Vector, Input, Renderer, Pos, Linearize, WebGlCompiler, JsRunner, JSCompiler, Resolution, vector, veclike} from "./shader"

let boxes = []
const isMobile = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/) ? true : false

export function display(...graphs:veclike[]){

  let laststeer = ""
  const canvas = htmlElement("canvas", "", "", {class:"glcanvas"}) as HTMLCanvasElement
  canvas.width = isMobile ? window.innerWidth : 500
  canvas.height = isMobile ? window.innerHeight : 500

  canvas.addEventListener("touchstart", e=>{
    laststeer = e.touches[0].clientX < canvas.width/2 ? "ArrowLeft" : "ArrowRight"
    keymap.set(laststeer, true)
    e.preventDefault()
  })
  canvas.addEventListener("touchend", e=>{
    keymap.set(laststeer, false)
    e.preventDefault()
  })

  document.body.appendChild(canvas)
  boxes.push(new Renderer(graphs, canvas))
}

const twopi = Math.PI * 2


const rand = (t:Vector) =>{return t.add(2.4).mul(435.23).sin().mul(34).abs().frac()}


let P = Pos.fields.xy

let Time = new Input(1)

let TimeCycle = new Input(1)
Time.subscribe(t=>TimeCycle.set(t[0]/100%1))

let PlayerProgress = new Input(1)
let PlayerRot = new Input(1)


let PlayerCycle = new Input(1)

PlayerProgress.subscribe(p=>{
  PlayerCycle.set(p[0]/100%1)
})

let Time1K = new Input(1)
Time.subscribe(t=>Time1K.set(t[0] / 1000))

let RelP = P.mul(2).sub(Resolution).div(Resolution.min())


P = vector(
  RelP.fields.x.atan(RelP.fields.y.neg()),
  RelP.length().log(),
)

let playercoord = P.add(0,0.3).div(.2)
let playerR = playercoord.length()

let refy = playerR.square()
.mul(2).sub(1).clamp(-.999,0.999).atanh().neg()
let refx = playercoord.fields.x.atan(playercoord.fields.y)

let Pl = P.add(refx, refy)

P = playerR.sub1().mul(100).sigmoid().mix(Pl,P);

P = P.sub(PlayerRot, 0)

P = vector(P.fields.x.mod(2*Math.PI), P.fields.y)







// let tx = P.fields.x.div(3.1415*2)
// for (let i = 0; i <6; i++){
//   let k = 1.8**i
//   tx = tx.add(P.fields.y.mul(k*.2).frac().sub(.5).abs().div(k*2))
// }



let xx = P.fields.x

xx.onclick ="xx"
// console.log(JSCompiler(xx));


display(xx)




let cyc = PlayerCycle.sub(P.fields.y.mul(0.01)).add(0,.25).mod(1).mul(twopi).sin().mul(20).sin().sum()


let cloud = vector(P.fields.x, cyc)

display(cloud.sin())

for (let i = 1; i<7; i++){
  cloud = cloud.add(
    cloud.fields.yx.mul(vector(4,3).add(i)).sin().div(i*2)
  )
  .add(TimeCycle.mul(1+i*30).sin().div(i*2))
}

display(cloud.sin().square())


let dim = P.fields.y.add(cloud.fields.y.mul(.3)).add(1).sigmoid()


// let world = bolts.mix([1,.2,.2], P.fields.x.add(vector(0,1,4)).sin().add(vector(2,2,3)).normalize().mul(dim))
let world = cloud.fields.x.add(vector(0,1,4)).sin().add(vector(2,2,3)).normalize().mul(dim)
display(world)

const keymap = new Map<string, boolean>()
document.addEventListener("keydown", e=>{
  if (e.key.startsWith("Arrow")) e.preventDefault()
  keymap.set(e.key, true)
})
document.addEventListener("keyup", e=>keymap.set(e.key, false))

PlayerProgress.set(1_600_000)


function render(time:number){

  let delta = 0;

  Time.update(t=>{
    time *= 0.001
    delta = time - t[0]
    return [time ]
  })

  let dx = - (keymap.get("ArrowRight") ?? false ? 1 : 0) + (keymap.get("ArrowLeft") ?? false ? 1 : 0)
  let dy = - (keymap.get("ArrowDown") ?? false ? 1 : 0) + (keymap.get("ArrowUp") ?? false ? 1 : 0)

  if (isMobile) dy = 1

  PlayerRot.update(r=>[((r[0] + delta * dx) % twopi + twopi) % twopi ])
  PlayerProgress.update(p=>[p[0] + delta * dy])

  boxes.forEach(b=>b.render())
  requestAnimationFrame(render)
}
render(0)

