
let varcounter = 0;

type Compiler = (ast:AST) => string


type UOp = "sin" | "cos" | "tan" | "log" | "exp" | "atan"
type BOp = "add" | "sub" | "mul" | "div" | "atan" | "pow"
type TOp = "clamp"

const uops:UOp[] = ["sin","cos","tan","log","exp","atan"]
const bops:BOp[] = ["add","sub","mul","div","atan","pow"]
const tops:TOp[] = ["clamp"]

type VecType = 1 | 2 | 3 | 4

type Op = UOp | BOp | TOp | "const" | "uniform" | "varying" | "vec" | "index"

type AST =
  ({op:"uniform", srcs:[], setValue?:(...v:number[])=>void}
  | {op:"varying", srcs:[], name:string}
  | {op: "vec", srcs:AST[]}
  | {op:"index", srcs:[AST], value:number}
  | {op:"const", value:number, srcs:[]}
  | {op:UOp, srcs:[AST]}
  | {op:BOp, srcs:[AST,AST]}
  | {op:TOp, srcs:[AST,AST,AST]}) & {vectype:VecType}


type Data = AST | number
type VecData = Data|Vector


const upcast = (a:Data, vectype:VecType|null = null) :AST => {
  if (vectype == null) vectype = datatype(a)
  if (typeof a == "number") a = {op:"const", value:a, vectype:1, srcs:[]}
  if (a.vectype == vectype) return a
  if (a.vectype != 1) throw new Error("upcast not implemented for dtype " + vectype)
  return {op:"vec", srcs:Array.from({length: vectype}, ()=>a) as AST[], vectype:vectype}
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
  return {op, ...broadcast([a])} as AST
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
  let vs = args.map(a=>upcast(a))
  if (vs.length == 1) return vs[0]
  let typesum = vs.reduce((a,b)=>a+datatype(b), 0)
  if (isNaN(typesum)) throw new Error("vec can only have 4 arguments")
  if (typesum > 4) throw new Error("vec can only have 4 arguments")
  return {op:"vec", srcs:vs, vectype:typesum as VecType}
}


const getter = (idx:number, a:Data) : AST => {
  if (datatype(a) <= idx) throw new Error(`index ${idx} out of bounds for vec size ${datatype(a)}`)
  return {op:"index", srcs:broadcast([a]).srcs, value:idx, vectype:1  } as AST
}


export const sin = unaryFun("sin")
export const cos = unaryFun("cos")
export const tan = unaryFun("tan")
export const ln = unaryFun("log")

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
  for (let i = 1; i < datatype(x); i++) {res = add(res, getter(i, x))}
  return res
}
export const length = (x:Data) => sqrt(sum(mul(x,x)))
export const normalize = (x:Data) => div(x, length(x))

const tanh = (x:Data) =>{
  // return 2.0 / (1.0 + exp(-2.0 * x)) - 1.0;

  return sub(div(2,add(1, exp(mul(x,-2)))),1)
}



const VecAst = (a:VecData) => a instanceof Vector ? a.ast : a

export class Vector{
  ast:AST
  vectype:VecType
  constructor(...srcs:(Data|Vector)[]){
    this.ast = vec(...srcs.map(VecAst))
    if (isNaN(this.ast.vectype)) throw new Error("vector must have 1,2,3 or 4 components")
    if (this.ast.vectype == undefined) throw new Error("vector must have 1,2,3 or 4 components")
    this.vectype = this.ast.vectype
  }
  sin(){return new Vector(sin(this.ast))}
  cos(){return new Vector(cos(this.ast))}
  tan(){return new Vector(tan(this.ast))}
  log(){return new Vector(ln(this.ast))}
  exp(){return new Vector(exp(this.ast))}
  add(a:VecData){return new Vector(add(this.ast,VecAst(a)))}
  sub(a:VecData){return new Vector(sub(this.ast,VecAst(a)))}
  mul(a:VecData){return new Vector(mul(this.ast,VecAst(a)))}
  div(a:VecData){return new Vector(div(this.ast,VecAst(a)))}
  pow(a:VecData){return new Vector(pow(this.ast,VecAst(a)))}
  atan(a:VecData){return new Vector(atan(this.ast,VecAst(a)))}
  clamp(a:VecData, b:VecData){return new Vector(clamp(this.ast,VecAst(a),VecAst(b)))}
  x(){return new Vector(getter(0,this.ast))}
  y(){return new Vector(getter(1,this.ast))}
  z(){return new Vector(getter(2,this.ast))}
  w(){return new Vector(getter(3,this.ast))}
  length(){return new Vector(length(this.ast))}
  normalize(){return new Vector(normalize(this.ast))}
  sum(){return new Vector(sum(this.ast))}
  sqrt(){return new Vector(sqrt(this.ast))}
  tanh(){return new Vector(tanh(this.ast))}
}



type ProgramNode = {ast:AST, srcs: ProgramNode[], name:string, usecount: number}

const  Linearize = (ast:AST) => {

  const nodesmap = new Map<AST, ProgramNode>()
  const nodes: ProgramNode [] = []

  function walkast(ast:AST):ProgramNode{

    if (nodesmap.has(ast)) {
      let res = nodesmap.get(ast)!
      res.usecount += 1
      return res
    }
    const srcs = ast.srcs.map(walkast)
    const name = ast.op == "varying" ? ast.name : "x" + nodes.length
    const node = {ast, srcs, name, usecount: 1}
    nodes.push(node)
    nodesmap.set(ast, node)
    return node
  }
  walkast(ast)
  return nodes
}


const WebGlCompiler = (nodes:ProgramNode[]) =>{

  function rep(node:ProgramNode):string{
   if (node.usecount > 1) return node.name
   return render(node)
  }
  
  function render(node:ProgramNode):string{
    const op = node.ast.op
    if (op == "uniform" || op == "varying") return node.name
    if (op == "const") {

      let res = node.ast.value.toString()
      if (!res.includes(".")) res += ".0"
      return res
    } 
    if (op == "vec") return `vec${node.ast.vectype}(${node.srcs.map(x=>rep(x)).join(",")})`
    if (op == "index") return `${rep(node.srcs[0])}.${["x","y","z","w"][node.ast.value]}`
    if (op == "add") return `( ${rep(node.srcs[0])} + ${rep(node.srcs[1])})`
    if (op == "sub") return `(${rep(node.srcs[0])} - ${rep(node.srcs[1])})`
    if (op == "mul") return `(${rep(node.srcs[0])} * ${rep(node.srcs[1])})`
    if (op == "div") return `(${rep(node.srcs[0])} / ${rep(node.srcs[1])})`
    return `${op}(${node.srcs.map(x=>rep(x)).join(", ")})`
  }

  return nodes.map(n =>{
    if (["uniform","varying", "const"].includes(n.ast.op)) return ""
    if (n.usecount == 1) return ""
    return `${["float","vec2","vec3","vec4"][n.ast.vectype-1]} ${n.name} = ${render(n)};\n`
  }).join("") + "gl_FragColor = " +render(nodes[nodes.length-1])
}



export class Input extends Vector{

  constructor(size:VecType){
    super({op:"uniform", vectype: size, srcs:[], setValue: (...v:number[]) => {}})
  }

  setValue(...v:number[]){
    (this.ast as {setValue:(...v:number[])=>void}).setValue(...v)
  }

}

const Varying = (name:string, vectype:VecType) => new Vector({op:"varying", name, vectype, srcs:[]})

export const Pos = Varying("pos", 2)
export const Time = new Input(1)



let x = new Vector(1,2,3,4)
let ss = x.sum().add(Pos).add(Time)

console.log(WebGlCompiler(Linearize(ss.ast)))




export class Renderer{
  gl:WebGLRenderingContext
  constructor(graph:Vector, cavas:HTMLCanvasElement){
    
    if (graph.vectype < 3){
      throw new Error("graph must result in vec3 got " + graph.vectype)
    }

    if (graph.vectype == 3){
      graph = new Vector(graph, 1)
    }
    const nodes = Linearize(graph.ast)
    console.log(nodes);
    
    const uniforms = nodes.filter(x=>x.ast.op == "uniform")
  
    {
      const gl = cavas.getContext("webgl2")
      console.log(gl);
      
      if (!gl) throw new Error("webgl not suppported");
      this.gl = gl
      
      const compileShader = (src: string, type: number): WebGLShader =>{
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          throw new Error(gl.getShaderInfoLog(shader)!);
        }
        return shader;
      }
      

      const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 pos;
      void main() {
        pos = a_position;
        gl_Position = vec4(a_position, 0, 1);
      }`;
      
      const fragShader  =`
precision mediump float;
varying vec2 pos;
${uniforms.map(u=>`uniform ${["float","vec2","vec3","vec4"][u.ast.vectype-1]} ${u.name};`).join("\n")}

void main() {
  ${WebGlCompiler(nodes)};

}`  
    console.log(fragShader);
    

      console.log("frag shader compiled");

      console.log(fragShader);

      

      const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
      const fs = compileShader(fragShader, gl.FRAGMENT_SHADER);
      
      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program)!);
      }
      gl.useProgram(program);


      const posAttrLoc = gl.getAttribLocation(program, "a_position");
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(posAttrLoc);
      gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);



      uniforms.forEach(u=>{

        const uf = u.ast as {setValue:(...v:number[])=>void, vectype:VecType}
      
        const loc = gl.getUniformLocation(program, u.name)
        uf.setValue = (...v)=>{
          ( (uf.vectype == 1) ? gl.uniform1f(loc, ...(v as[number,])):
            (uf.vectype == 2) ? gl.uniform2f(loc, ...(v as[number,number,])):
            (uf.vectype == 3) ? gl.uniform3f(loc, ...(v as[number,number,number,])):
            gl.uniform4f(loc, ...(v as[number,number,number,number,])));}
      })      
    }
  }

  render (){ 
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
  
}
