
let varcounter = 0;


class DType{
  size:number
  constructor(size:number){
    this.size = size

  }

  toString(){
    if (this.size == 1) return "float"
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



type Compiler = (ast:AST) => string


const  WebGlCompiler : Compiler = (ast)=>{

  return "GLSL"
  
}


type UOp = "sin" | "cos" | "tan" | "log" | "exp" | "pow" | "atan"
type BOp = "add" | "sub" | "mul" | "div" | "atan"
type TOp = "clamp"
type ZOp = "const"

type Op = UOp | BOp | TOp | ZOp


type AstArg = {op:ZOp, srcs:[]}
| {op:UOp, srcs:[AST]}
| {op:BOp, srcs:[AST,AST]}
| {op:TOp, srcs:[AST,AST,AST]}


export abstract class AST {

  dtype:DType
  srcs:AST[] = []
  name:string | null = null

  constructor(args:AstArg, dtype:DType = float, name:string | null = null){
    this.name = args.op
    this.dtype = dtype
    this.srcs = args.srcs

    if (name == null){
      name = "var"+varcounter++
    }
    this.name = name
    
  }
}




// export const Pos = new Varying("pos", vec2)


// ********** RENDERER **********


export class Renderer{
  varmap = new Map<String, AST>()
  uniforms = new Map<String, Input>()

  graph : AST

  gl:WebGLRenderingContext

  constructor(graph:AST, cavas:HTMLCanvasElement){
    

    if (graph.dtype != vec4){
      throw `frag shader must result in vec4 got ${graph.dtype}`
    }


    graph.compile(this)

    console.log("graph compiled");
    

    this.varmap.delete(graph.name)
    this.graph = graph
  

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

      console.log("vertex shader compiled");
      
      


      const fragShader  =`
precision mediump float;
varying vec2 pos;
${Array.from(this.uniforms.values()).map(u=>`uniform ${u.dtype} ${u.name};`).join("\n")}

void main() {
  ${Array.from(this.varmap.values()).map(v=>`${v.dtype} ${v.name} = ${v.gen()};`).join("\n  ")}
  gl_FragColor = ${this.graph.gen()};
}`

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
