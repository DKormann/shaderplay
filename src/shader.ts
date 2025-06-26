
let varcounter = 0;

type UOp = "sin" | "cos" | "tan" | "log" | "exp" | "atan"
type BOp = "add" | "sub" | "mul" | "div" | "atan" | "pow"
type TOp = "clamp"

type VecType = 1 | 2 | 3 | 4

type Op = UOp | BOp | TOp | "const" | "uniform" | "varying" | "vec" | "index"

type AST =
  ({op:"uniform", srcs:[], name:string}
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
  if (!(typeof a.op == "string")) throw new Error("upcast not implemented for " + a)
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


const VecAst = (a:VecData):AST => a instanceof Vector ? a.ast : upcast(a)

export class Vector{
  ast:AST
  vectype:VecType
  inputs = new Set<Input>()
  constructor(srcs:(Data|Vector)[] | VecData, op:Op = "vec"){
    if (!(srcs instanceof Array))srcs = [srcs]
    let asts = srcs.map(VecAst)
    srcs.forEach(v=>{if (v instanceof Vector) v.inputs.forEach(i=>this.inputs.add(i))})

    if (op == "vec"){
      if (asts.length == 1){
        this.ast = asts[0]

      }else{
        let vectype = asts.reduce((a,b)=>a+b.vectype, 0) as VecType
        this.ast = {op, srcs: asts, vectype}
      }
    }else{
      let {srcs,vectype} = broadcast(asts)
      this.ast = {op, srcs, vectype} as AST
    }
    this.vectype = this.ast.vectype
    if (isNaN(this.ast.vectype)) throw new Error("vector must have 1,2,3 or 4 components")
    if (this.ast.vectype == undefined) throw new Error("vector must have 1,2,3 or 4 components")
    if (!(typeof this.ast.op =="string")) throw new Error("wrong ast type")

  }
  sin(){return new Vector([this], "sin")}
  cos(){return new Vector([this], "cos")}
  tan(){return new Vector([this], "tan")}
  log(){return new Vector([this], "log")}
  exp(){return new Vector([this], "exp")}

  add(a:VecData){return new Vector([this, a], "add")}
  sub(a:VecData){return new Vector([this, a], "sub")}
  mul(a:VecData){return new Vector([this, a], "mul")}
  div(a:VecData){return new Vector([this, a], "div")}
  pow(a:VecData){return new Vector([this, a], "pow")}
  atan(a:VecData){return new Vector([this, a], "atan")}
  clamp(a:VecData, b:VecData){return new Vector([this, a, b], "clamp")}

  static fromAst(ast:AST, inputs:Input[]|Set<Input>){
    let vec = new Vector(ast)
    inputs.forEach(i=>vec.inputs.add(i))
    return vec
  }

  getter(idx:number){
    if (idx >= this.vectype) throw new Error("index out of bounds")
    return Vector.fromAst({op:"index", srcs:[this.ast], value:idx, vectype:1}, this.inputs)
  }

  x(){return this.getter(0)}
  y(){return this.getter(1)}
  z(){return this.getter(2)}
  w(){return this.getter(3)}

  length(){return this.square().sum().sqrt()}
  normalize(){return this.div(this.length())}
  sum(){
    let vec = this.getter(0)
    for (let i = 1; i < this.vectype; i++) {
      vec = vec.add(this.getter(i))
    }
    return vec
  }
  sqrt(){return this.pow(0.5)}
  square(){return this.pow(2)}
  inv(){return this.pow(-1)}
  tanh(){
    return this.div(this.add(1).exp().add(1).exp().inv())
  }
}



type ProgramNode = {ast:AST, srcs: ProgramNode[], name:string, usecount: number}

export const  Linearize = (ast:AST) => {

  const nodesmap = new Map<AST, ProgramNode>()
  const nodes: ProgramNode [] = []

  function walkast(ast:AST):ProgramNode{

    if (nodesmap.has(ast)) {
      let res = nodesmap.get(ast)!
      res.usecount += 1
      return res
    }

    const srcs = ast.srcs.map(walkast)
    const name = ast.op == "varying" || ast.op == "uniform" ? ast.name : "x" + nodes.length
    const node = {ast, srcs, name, usecount: 1}
    nodes.push(node)
    nodesmap.set(ast, node)
    return node
  }
  walkast(ast)
  return nodes
}


export const WebGlCompiler = (nodes:ProgramNode[]) =>{

  function rep(node:ProgramNode):string{
    if (node.ast.op == "const" || node.usecount <= 1) return render(node)
    return node.name
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
  value:number[]
  subscribers = new Set<(arg0: number[]) => void>()
  name:string

  constructor(size:VecType){
    const name = "input"+varcounter++
    super({op:"uniform", vectype: size, srcs:[], name})
    this.inputs.add(this)
    this.name = name

    this.value = Array.from({length:size}, ()=>0)
  }

  set(...v:number[]){
    if (v.length != this.vectype) throw new Error("Input.set: wrong number of arguments")
    this.value = v;
    this.subscribers.forEach(s=>s(v))
  }

  subscribe(f:(arg0: number[]) => void){
    f(this.value)
    this.subscribers.add(f)
  }

  get(){
    return this.value
  }

  update(f: (arg0: () => number[]) => number){
    this.set(f(this.get))
  }

}

const Varying = (name:string, vectype:VecType) => new Vector({op:"varying", name, vectype, srcs:[]})

export const Pos = Varying("pos", 2)
export const Time = new Input(1)


export function JsRunner (vec:Vector){
  const nodes = Linearize(vec.ast)
  const uniforms = nodes.filter(x=>x.ast.op == "uniform")
  return
}

export class Renderer{
  gl:WebGLRenderingContext
  constructor(graph:Vector, canvas:HTMLCanvasElement){
    
    if (graph.vectype < 3){
      throw new Error("graph must result in vec3 got " + graph.vectype)
    }

    if (graph.vectype == 3){
      graph = new Vector([graph, 1])
    }

    const inputs = Array.from(graph.inputs)
  
    {
      const gl = canvas.getContext("webgl2")
      
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
${inputs.map(u=>`uniform ${["float","vec2","vec3","vec4"][u.ast.vectype-1]} ${u.name};`).join("\n")}

void main() {

${WebGlCompiler(Linearize(graph.ast))};

}`

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

      inputs.forEach(u=>{
        const uf = u.ast as {name:string, vectype:VecType, op:"varying"}
        const loc = gl.getUniformLocation(program, uf.name)
        u.subscribe((v)=>{
          ( (uf.vectype == 1) ? gl.uniform1f(loc, ...(v as[number,])):
            (uf.vectype == 2) ? gl.uniform2f(loc, ...(v as[number,number,])):
            (uf.vectype == 3) ? gl.uniform3f(loc, ...(v as[number,number,number,])):
            gl.uniform4f(loc, ...(v as[number,number,number,number,])));})
      })
    }
  }

  render (){ 
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
  
}
