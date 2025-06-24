
let varcounter = 0;

type DType = "float" | "vec2" | "vec3" | "vec4"

abstract class AST  {
  name:string
  dtype:DType

  constructor(name:string|null = null, dtype:DType = "float"){
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

  compile (shader:Display){
    if (shader.varmap.has(this.name)){
      return
    }
    shader.varmap.set(this.name, this)

  }

  toString(){
    return "AST"
  }
}



export class Display{
  varmap = new Map<String, AST>()
  uniforms = new Map<String, Uniform>()
  graph : AstNode

  gl:WebGLRenderingContext

  constructor(graph:AstNode, cavas:HTMLCanvasElement){

    if (graph.dtype != "vec4"){
      throw `frag shader must result in vec4 got ${graph.dtype}`
    }
    graph.compile(this)
    this.varmap.delete(graph.name)
    this.graph = graph

    
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


      const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
      const fs = compileShader(this.compile(), gl.FRAGMENT_SHADER);
      
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

      this.uniforms.forEach(u=>{
        const loc = gl.getUniformLocation(program, u.name)

        u.setValue = (v)=>{
          // (u.dtype == "float" ? gl.uniform1f : udt)
        }

      })
      
    }




  }

  compile (){


    return `
precision mediump float;
varying vec2 pos;
${Array.from(this.uniforms.values()).map(u=>`uniform ${u.dtype} ${u.name};`).join("\n")}

void main() {
  ${Array.from(this.varmap.values()).map(v=>`${v.dtype} ${v.name} = ${v.gen()};`).join("\n  ")}
  gl_FragColor = ${this.graph.gen()};
}`
  }
}



class OP {
  arity : number
  gen : (...srcs:(AST|number)[]) => string
  constructor (arity:number, gen: (...srcs:(AST)[]) => string){
    this.arity = arity

    this.gen = (...s) => gen(...s.map(s=>typeof s == "number" ? new Const(s) : s))
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


const field_names = ['add']

type Field = "x" | "y" | "z"


function Getter (field: Field) {
  return new OP(1, x=> `${x.name}.${field}`)
}


export class Const extends AST {
  value:number
  constructor(value:number){
    let name = `${value}`
    if (!name.includes(".")){
      name += "."
    }

    super(name,"float")
    this.value = value * 1.0
  }
  compile(shader: Display): void {}
  gen() : string {
    return this.name
  }
}


export class AstNode extends AST  {
  srcs : AST[]
  op: OP

  constructor (_srcs: (AST|number)[], op :OP, name:string|null = null, dtype:DType = "float"){

    let srcs = _srcs.map(s=>{

      if(typeof (s) == "number"){
        return new Const(s)
      }
      return s
    })as AST[]

    if (srcs.length && srcs.filter(s=>s.dtype != srcs[0].dtype).length){
      throw new Error(`dtypes not compatible ${srcs.map(s=>s.dtype)}`);
    }
    super(name,dtype)
    if (srcs.length != op.arity){
      throw "must match arity"
    }
    this.srcs = srcs
    this.op = op
  }

  app_binary(op:OP){
    return (other:AST|number) => new AstNode ([this,other], op)
  }

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

  gen(){
    return this.op.gen(...this.srcs)
  }

  compile(ctx:Display): void {
    this.srcs.forEach(s=>s.compile(ctx))
    super.compile(ctx)
  }

  x(){
    if (this.dtype == "float"){
      throw new Error("cant x on float")
    }
    return new AstNode([this], Getter("x"))
  }

  y(){
    if (this.dtype == "float"){
      throw new Error("cant y on float")
    }
    return new AstNode([this], Getter("y"))
  }
}

export class Uniform extends AstNode {

  setValue : (value:number) => void = n=>{throw new Error("Uniform not connected to shader yet?")}
  

  constructor( name:string, dtype:DType){
    super([], new OP(0, ()=>name),name, dtype)
  }
  compile(ctx: Display): void {
    ctx.uniforms.set(this.name, this)
  }

}

export class Varying extends Uniform {

  compile(ctx: Display): void {
  }

}


export const Pos = new Varying("pos", "vec2")

export class Vec extends AstNode {
  constructor (...srcs:(AST|number)[]){
    const dtype:DType = srcs.length == 2 ? "vec2" : srcs.length == 3 ? "vec3" : srcs.length == 4 ? "vec4" : "float"
    if (dtype == "float") throw "not enough args"

    super(
      srcs,
      new OP(srcs.length, (...s:AST[]) => `${dtype}(${s.map(s=>s.name).join(',')})`),
      null,
      dtype
    )
  }
}






