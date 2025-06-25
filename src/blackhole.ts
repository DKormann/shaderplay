
// import { htmlElement } from "./html";
// import { AST, AstNode, Renderer, Pos, Input, Vector, dtypes, Const,Data } from "./shader";


// const atan = (x:AST, y:AST)=>x.atan(y)
// const cos = (x:AST)=>x.cos()

// const canvas =  htmlElement("canvas", "" , "", {id:"glcanvas"}) as HTMLCanvasElement
// document.body.appendChild(canvas)

// canvas.width = 500
// canvas.height = 500

// let z : AST = new Const(0);
// const d = new Const(0);
// const snormed = Vector(Pos, 1).normalize()
// let o : AST = Vector(0,0,0,1)


// for (let i = 0; i < 20; i++){
//   const pp = z.mul(snormed)
//   const dd = pp.z()

//   const p = Vector(
//     atan(pp.y().div(2),pp.x().add(.01)).mul(2),
//     dd.div(3),
//     Vector(pp.x(), pp.y()).length().sub(5).sub(z.mul(2))
//   )
  
//   const rd = Vector(p.cos().mul(.4).sub(.4),p.z()).length()
//   z = z.add(rd)
//   o = o.add(
//     cos(
//     p.x()
//     .add(i*8)
//     .add(z)
//     .add(Vector(6,1,2,0))).add(1).div(rd))
// }

// o = o.mul(o).div(40).tanh()

// const color = Vector(o.x(),o.y(),o.z(),1).normalize()


// new Renderer(color, canvas).render()

// // for (float )


