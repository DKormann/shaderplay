
let varcounter = 0;



type Compiler = (ast:AST) => string


const  WebGlCompiler : Compiler = (ast)=>{
  return "GLSL"
}



type UOp = "sin" | "cos" | "tan" | "log" | "exp" | "atan"
type BOp = "add" | "sub" | "mul" | "div" | "atan" | "pow"
type TOp = "clamp"


type VecType = 1 | 2 | 3 | 4

type Op = UOp | BOp | TOp | "const" | "uniform" | "varying" | "vec" | "index"

type AST =
  ({op:"uniform" | "varying", name:string} 
| {op: "vec", srcs:AST[]}
| {op:"index", srcs:[AST], value:number}
| {op:"const", value:number}
| {op:UOp, srcs:[AST]}
| {op:BOp, srcs:[AST,AST]}
| {op:TOp, srcs:[AST,AST,AST]}) & {vectype:VecType}


type Data = AST | number

const upcast = (a:Data, vectype:VecType = 1) :AST => {
  if (typeof a == "number") a = {op:"const", value:a, vectype:1}
  if (a.vectype == vectype) return a
  if (a.vectype != 1) throw new Error("upcast not implemented for dtype " + vectype)
  return {op:"vec", srcs:Array.from({length: vectype}, ()=>a), vectype:vectype}
}

const datatype = (a:Data):VecType => {
  if (typeof a == "number") return 1
  return a.vectype
}

const broadcast = (srcs:Data[]) => {
  const vectype = Math.max(...srcs.map(datatype)) as VecType
  return {srcs: srcs.map(s=>upcast(s,vectype)), vectype}
}

const unaryFun = (op:UOp) =>
(a:Data) :AST => {
  return {op, srcs:[upcast(a)]} as AST
}

const  binaryFun = (op:BOp) =>
(a:Data, b:Data) :AST => {
  return {op, ...broadcast([a,b])} as AST
}

const  ternaryFun = (op:TOp) =>
(a:Data, b:Data, c:Data) :AST => {
  return {op, ...broadcast([a,b,c])} as AST
}

const vec = (...args:Data[]) : AST =>{
  if (args.length == 1) return upcast(args[0])
  let typesum = args.reduce((a:number,b)=>a+datatype(b), 0) as number
  if (typesum > 4) throw new Error("vec can only have 4 arguments")
  return {op:"vec", ...broadcast(args)}
}


const getter = (idx:number, a:Data) : AST => {
  if (datatype(a) <= idx) throw new Error(`index ${idx} out of bounds for vec size ${datatype(a)}`)
  return {op:"index", srcs:broadcast([a]).srcs, value:idx} as AST
}


export const sin = unaryFun("sin")
export const cos = unaryFun("cos")
export const tan = unaryFun("tan")
export const log = unaryFun("log")

export const exp = unaryFun("exp")

export const add = binaryFun("add")
export const sub = binaryFun("sub")
export const mul = binaryFun("mul")
export const div = binaryFun("div")
export const pow = binaryFun("pow")
export const atan = binaryFun("atan")
export const clamp = ternaryFun("clamp")


export const sqrt = (x:Data) => pow(x, 0.5)
export const sum = (x:Data) => {
  let res = getter(0,x)
  for (let i = 1; i < datatype(x); i++) {
    res = add(res, getter(i, x))
  }
  return res
}
export const length = (x:Data) => sqrt(sum(mul(x,x)))
export const normalize = (x:Data) => div(x, length(x))

function Vec(...args:Data[]) {
  let vv = vec(...args)
  let res = {
    ...vv,
    sin: () => sin(vv),
    cos: () => cos(vv),
    tan: () => tan(vv),
    log: () => log(vv),
    exp: () => exp(vv),
    add: (a:Data) => add(vv,a),
    sub: (a:Data) => sub(vv,a),
    mul: (a:Data) => mul(vv,a),
    div: (a:Data) => div(vv,a),
    pow: (a:Data) => pow(vv,a),
    atan: (a:Data) => atan(vv,a),
    clamp: (a:Data, b:Data) => clamp(vv,a,b),
    x: () => getter(0,vv),
    y: () => getter(1,vv),
    z: () => getter(2,vv),
    w: () => getter(3,vv),
    length: () => length(vv),
    normalize: () => normalize(vv),
  }
  return res
}



let x = Vec(1,2,3,4)
console.log(x.sin())

// export const Pos = new Varying("pos", vec2)


// // ********** RENDERER **********


// export class Renderer{
//   varmap = new Map<String, AST>()
//   uniforms = new Map<String, Input>()

//   graph : AST

//   gl:WebGLRenderingContext

//   constructor(graph:AST, cavas:HTMLCanvasElement){
    

//     if (graph.dtype != vec4){
//       throw `frag shader must result in vec4 got ${graph.dtype}`
//     }


//     graph.compile(this)

//     console.log("graph compiled");
    

//     this.varmap.delete(graph.name)
//     this.graph = graph
  

//     {
//       const gl = cavas.getContext("webgl2")
//       console.log(gl);
      
//       if (!gl) throw new Error("webgl not suppported");
//       this.gl = gl
      
//       const compileShader = (src: string, type: number): WebGLShader =>{
//         const shader = gl.createShader(type)!;
//         gl.shaderSource(shader, src);
//         gl.compileShader(shader);
//         if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
//           throw new Error(gl.getShaderInfoLog(shader)!);
//         }
//         return shader;
//       }
      

//       const vertexShaderSource = `
//       attribute vec2 a_position;
//       varying vec2 pos;
//       void main() {
//         pos = a_position;
//         gl_Position = vec4(a_position, 0, 1);
//       }`;

//       console.log("vertex shader compiled");
      
      


//       const fragShader  =`
// precision mediump float;
// varying vec2 pos;
// ${Array.from(this.uniforms.values()).map(u=>`uniform ${u.dtype} ${u.name};`).join("\n")}

// void main() {
//   ${Array.from(this.varmap.values()).map(v=>`${v.dtype} ${v.name} = ${v.gen()};`).join("\n  ")}
//   gl_FragColor = ${this.graph.gen()};
// }`

//       console.log("frag shader compiled");

//       console.log(fragShader);

      

//       const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
//       const fs = compileShader(fragShader, gl.FRAGMENT_SHADER);
      
//       const program = gl.createProgram()!;
//       gl.attachShader(program, vs);
//       gl.attachShader(program, fs);
//       gl.linkProgram(program);
//       if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
//         throw new Error(gl.getProgramInfoLog(program)!);
//       }
//       gl.useProgram(program);


//       const posAttrLoc = gl.getAttribLocation(program, "a_position");
//       const buffer = gl.createBuffer();
//       gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
//       gl.enableVertexAttribArray(posAttrLoc);
//       gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);



//       this.uniforms.forEach(u=>{
      
//         const loc = gl.getUniformLocation(program, u.name)
//         u.setValue = (...v)=>{
//           ( (u.dtype == float) ? gl.uniform1f(loc, ...(v as[number,])):
//             (u.dtype == vec2) ? gl.uniform2f(loc, ...(v as[number,number,])):
//             (u.dtype == vec3) ? gl.uniform3f(loc, ...(v as[number,number,number,])):
//             gl.uniform4f(loc, ...(v as[number,number,number,number,])));}
//       })      
//     }
//   }

//   render (){ 
//     this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
//   }
  
// }
