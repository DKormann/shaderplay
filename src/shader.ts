
let varcounter = 0;


class DType{
  size:number
  constructor(size:number){
    this.size = size

  }

  toString(){
    if (this.size == 1){
      return "float"
    }
    return "vec"+this.size
  }
  choose<T>(...args:T[]):T{
    return args[this.size-1]
  }

  eq(other:DType){
    return this.size == other.size
  }
}

const float = new DType(1)
const vec2 = new DType(2)
const vec3 = new DType(3)
const vec4 = new DType(4)

export const dtypes = {float, vec2, vec3, vec4}

abstract class AST  {
  name:string
  dtype:DType

  constructor(name:string|null = null, dtype:DType = float){
    if (name == null){
      name = "x"+String(varcounter)
      varcounter += 1
    }
    this.name= name
    this.dtype=dtype
  }

  gen(){
    return this.name
  }

  compile (shader:Renderer){
    if (shader.varmap.has(this.name)){
      return
    }
    shader.varmap.set(this.name, this)

  }

  toString(){
    return "AST"
  }



  app_binary(op:OP){ return (other:AST|number) => new AstNode ([this,other], op) }

  add = this.app_binary(BinaryInplace("+"))
  sub = this.app_binary(BinaryInplace("-"))
  mul = this.app_binary(BinaryInplace("*"))
  div = this.app_binary(BinaryInplace("/"))

  app_unary(op:OP){
    return ()=> new AstNode([this], op)
  }

  sin = this.app_unary(UnaryFun("sin"))
  cos = this.app_unary(UnaryFun("cos"))
  log = this.app_unary(UnaryFun("log"))
  pow = this.app_binary(BinaryFun("pow"))
  atan = this.app_binary(BinaryFun("atan"))


  clamp = (a:AST|number, b:AST|number) => new AstNode ([this,a,b], TernaryFun("clamp"))



  x = () => Getter("x", this)
  y = () => Getter("y", this)
  z = () => Getter("z", this)
  w = () => Getter("w", this)
}


export type Data = AST|number


const VecOp = (dtype:DType) => new OP(-1, (...s:AST[])=> `${dtype}(${s.map(s=>s.name).join(',')})`)

export const Vec = (srcs:Data[]):AstNode =>{

  console.log(srcs);
  
  let size = srcs.map(s=> typeof s == "number" ? upcast(s, float) : s).reduce((a:number,b)=> a + b.dtype.size, 0)
  if (size > 4) throw new Error("too many args")

  const dtype = [float, vec2, vec3, vec4][size-1]
  const res = new AstNode(srcs, VecOp(dtype))
  res.dtype = dtype
  return res

}

const upcast = (d:Data, dtype:DType = float) =>{
  if (typeof d == "number"){d = new Const(d)}
  if (d.dtype == dtype) return d
  if (d.dtype != float) throw new Error("cant upcast:"+d.dtype+"->"+dtype);
  return Vec(Array.from({length: dtype.size}, (_,i)=>d))
}


class OP {
  arity : number
  gen : (...srcs:Data[]) => string
  constructor (arity:number, gen: (...srcs:(AST)[]) => string){
    this.arity = arity
    this.gen = (...s) => gen(...s.map(s=>typeof s == "number" ? new Const(s) : s))
  }

  toString(){
    return this.gen(...Array.from({length: this.arity}, (_,i)=>new Const(i)))
  }
}




function BinaryInplace (tag:string){
  return new OP(2, (a,b)=> `${a.name} ${tag} ${b.name}`)
}

function UnaryFun (tag:string){
  return new OP(1, x=> `${tag}(${x.name})`)
}

function BinaryFun (tag:string){
  return new OP(2, (x,y)=> `${tag}(${x.name}, ${y.name})`)
}

function TernaryFun (tag:string){
  return new OP(3, (x,y,z)=> `${tag}(${x.name}, ${y.name}, ${z.name})`)
}


const field_names = ['add']

type Field = "x" | "y" | "z" | "w"


function Getter (field: Field, node: AST) {

  const n = ["x","y","z","w"].indexOf(field)

  if (n > node.dtype.size-1){
    throw new Error("field out of bounds")
  }
  
  const op = new OP(1, x=> `${x.name}.${field}`)
  
  const res = new AstNode([node], op)
  res.dtype = float
  return res
}



export class Const extends AST {
  value:number
  constructor(value:number){
    let name = `${value}`
    if (!name.includes(".")){
      name += "."
    }

    super(name,float)
    this.value = value * 1.0
  }
  compile(shader: Renderer): void {}
  gen() : string {
    return this.name
  }
}


export class AstNode extends AST  {
  srcs : AST[]
  op: OP

  constructor (_srcs: (AST|number)[], op :OP, name:string|null = null, dtype:DType|null = null){

    let srcs = _srcs.map(s=>{

      if(typeof (s) == "number"){
        return new Const(s)
      }
      return s
    })as AST[]

    if (dtype == null) {
      dtype = srcs.map(s=>s.dtype).reduce((a,b)=>a.size > b.size ? a : b, float)
    }
    super(name,dtype)
    this.srcs = srcs
    this.op = op
  }

  gen(){
    return this.op.gen(...this.srcs)
  }


  compile(ctx:Renderer): void {
    this.srcs.forEach(s=>s.compile(ctx))
    super.compile(ctx)
  }
}

export class Input extends AstNode {

  setValue : (...values:number[]) => void = n=>{}
  

  constructor( name:string|null = null, dtype:DType = float){
    super([], new OP(0, ()=>"name"),name, dtype)
  }
  compile(ctx: Renderer): void {
    ctx.uniforms.set(this.name, this)
  }

}

export class Varying extends Input {compile(ctx: Renderer): void {} }


export const Pos = new Varying("pos", vec2)



export class Renderer{
  varmap = new Map<String, AST>()
  uniforms = new Map<String, Input>()
  graph : AstNode

  gl:WebGLRenderingContext

  constructor(graph:AstNode, cavas:HTMLCanvasElement){

    if (graph.dtype != vec4){
      throw `frag shader must result in vec4 got ${graph.dtype}`
    }
    graph.compile(this)
    this.varmap.delete(graph.name)
    this.graph = graph

    console.log(graph);
  
  
    {
      const gl = cavas.getContext("webgl")
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
${Array.from(this.uniforms.values()).map(u=>`uniform ${u.dtype} ${u.name};`).join("\n")}

void main() {
  ${Array.from(this.varmap.values()).map(v=>`${v.dtype} ${v.name} = ${v.gen()};`).join("\n  ")}
  gl_FragColor = ${this.graph.gen()};
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
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1,  1,
        1,  1,
      ]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(posAttrLoc);
      gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);

      console.log(this.uniforms);

      this.uniforms.forEach(u=>{
      
        const loc = gl.getUniformLocation(program, u.name)
        u.setValue = (...v)=>{
          ( (u.dtype == float) ? gl.uniform1f(loc, ...(v as[number,])):
            (u.dtype == vec2) ? gl.uniform2f(loc, ...(v as[number,number,])):
            (u.dtype == vec3) ? gl.uniform3f(loc, ...(v as[number,number,number,])):
            gl.uniform4f(loc, ...(v as[number,number,number,number,])));}
      })      
    }
  }

  render (){ 
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
  
}
