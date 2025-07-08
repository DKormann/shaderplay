
import { vector } from "./shader"


{ // crystal

  const color = [0,.5,1]
  const ballpos = vector(0,0,.5)

  let pos = vector(RelP, 0)

  let d = vector(0)


  let rotmatrix = [
    [1,0,0],
    [0,1,0],
    [0,0,1]
  ]

  const rotate = (angle:number, axis:number, matrix:number[][])=>{

    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const [fst,snd] = [0,1,2].filter(x=>x!=axis)
    
    const rotmat = [[1,0,0],[0,1,0],[0,0,1]]

    rotmat[fst][fst] = c
    rotmat[fst][snd] = s
    rotmat[snd][fst] = -s
    rotmat[snd][snd] = c

    let newmat = [[0,0,0],[0,0,0],[0,0,0]]

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          newmat[i][j] += matrix[i][k]*rotmat[k][j]
        }
      }
    }
    
    return newmat
    
  }
  rotmatrix = rotate(.7, 2, rotmatrix)
  rotmatrix = rotate(.7, 1, rotmatrix)

  for (let i = 0; i < 10; i++){

    console.log(pos.vectype);
    d = pos.sub(ballpos)

    d = vector(
      d.mul(rotmatrix[0]).sum(),
      d.mul(rotmatrix[1]).sum(),
      d.mul(rotmatrix[2]).sum()
    )

    d = d.abs()
    .max()
    .sub(.2)
    pos = vector(pos.fields.xy, pos.fields.z.add(d))
  }

  d = d.mul(100).clamp(0,1)
  display(d.mix(0,pos.fields.z.sub1().mul(color)))

}
