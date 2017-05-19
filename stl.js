;(function (){
  // <HARD-CODED>
  var scale = 4
  var edge = 50 * scale
  var magWidth = 10 * scale
  var magHeight = 3 * scale
  var minX = 999999
  var minY = 999999
  var ply = 1 * scale
  // </HARD-CODED>

  var name = "acute"
  var stl = "solid " + name + "\n"

  var sqrt5 = Math.sqrt(5)
  var p = 2 * ((1 + sqrt5) / Math.sqrt(10 + 2 * sqrt5))
  // 1.70130161670408 = long diagonal
  var q = 4 / (Math.sqrt (10 + 2 * sqrt5))
  // 1.0514622242382672 = short diagonal
  // var height = getThickness() // 0.5627774222552386

  var obtuse = Math.atan(1) + Math.atan(3)
  // 2.0344439357957027 radians 116.56505117707799°
  var acute = Math.atan(2)
  // 1.1071487177940904 radians 63.43494882292201°

  var offsetX = p/2 * edge
  var offsetY = q/2 * edge

  var vertices = []
  var faceIndices = []
  var faceNormals = []
  var faces = []
  var normal
  var face

  var total
  var ii

  // Vertices for base
  vertices.push([offsetX, 0, 0])
  vertices.push([0, offsetY, 0])
  vertices.push([-offsetX, 0, 0])
  vertices.push([0, -offsetY, 0])

  vertices.push([offsetX, 0, ply])
  vertices.push([0, offsetY, ply])
  vertices.push([-offsetX, 0, ply])
  vertices.push([0, -offsetY, ply])

  // Faces for underneath
  normal = [0, 0, -1]
  faceIndices.push([0, 1, 3])
  faceNormals.push(normal)
  faceIndices.push([1, 2, 3])
  faceNormals.push(normal)

  // Faces for edges
  normal = [q, p, 0]
  faceIndices.push([0, 4, 1])
  faceNormals.push(normal)
  faceIndices.push([4, 5, 1])
  faceNormals.push(normal)
  
  normal = [q, -p, 0]
  faceIndices.push([1, 5, 2])
  faceNormals.push(normal)
  faceIndices.push([4, 6, 2])
  
  normal = [-q, -p, 0]
  faceIndices.push([2, 6, 3])
  faceNormals.push(normal)
  faceIndices.push([6, 7, 3])
  faceNormals.push(normal)
  
  normal = [-q, p, 0]
  faceNormals.push(normal)
  faceIndices.push([7, 1, 0])
  faceNormals.push(normal)

  // Faces for top
  normal = [0, 0, 1]
  faceIndices.push([4, 7, 5])
  faceNormals.push(normal)
  faceIndices.push([5, 7, 6])
  faceNormals.push(normal)

  total = faceIndices.length
  ii
  
  for (ii = 0; ii < total; ii += 1) {
    normal = faceNormals[ii]
    face = faceIndices[ii]
    stl += "\n  facet normal " + normal[0] + " " + normal[1] + " " +  normal[2]
    stl += "\n    outer loop" 

    stl += "\n      vertex " + (vertices[face[0]][0] + offsetX)
                       + " " + (vertices[face[0]][1] + offsetY)
                       + " " + vertices[face[0]][2]

    stl += "\n      vertex " + (vertices[face[1]][0] + offsetX)
                       + " " + (vertices[face[1]][1] + offsetY)
                       + " " + vertices[face[1]][2]

    stl += "\n      vertex " + (vertices[face[2]][0] + offsetX)
                       + " " + (vertices[face[2]][1] + offsetY)
                       + " " + vertices[face[2]][2]
  
    stl += "\n    endloop"
    stl += "\n  endfacet"
  }

  stl += "\nendsolid " + name

  console.log(stl)
  
})()