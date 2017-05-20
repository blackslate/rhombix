;(function (){
  // <HARD-CODED>
  var scale = 4
  var edge = 50 * scale
  var magWidth = 10 * scale
  var magHeight = 3 * scale
  var minX = 999999
  var minY = 999999
  var ply = 1 * scale

  var vFile = "v"
  var path = "output/"
  var name = "acute"
  // </HARD-CODED>

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
  
  // Angles between faces 
  var _36degrees = Math.PI / 5 // thin wedge of flat rhombohedron
  // 1.2566370614359172 radians 72°
  var _72degrees = _36degrees * 2 // point of pointy rhombohedron
  // 1.2566370614359172 radians 72°
  var _108degrees = _36degrees * 3
  // 1.8849555921538759 radians 108°// side of pointy rhombohedron
  var _144degrees = _36degrees * 4
  // 2.5132741228718345 radians 144° // dome of flat rhombohedron

  var offsetX = p/2 * edge
  var offsetY = q/2 * edge

  var vertices = []
  var faceIndices = []
  var faceNormals = []
  var faces = []
  var normal
  var face

  var fs = require("fs")
  var v 

  fs.readFile(vFile, versionIt)

  function versionIt(error, data) {
    if (error) {
      v = "001"
    } else {
      v = parseInt(data, 10) + 1
      if (v < 10) {
        v = "00" + v
      } else if (v < 100) {
        v = "0" + v
      }
    }

    ;(function prepareAcuteRhombus(){
      ;(function createVertices(){
        // Exterior vertices for rhombus
        vertices.push([offsetX, 0, 0])
        vertices.push([0, offsetY, 0])
        vertices.push([-offsetX, 0, 0])
        vertices.push([0, -offsetY, 0])

        // Interior
        addInteriorVerticesAcute()

      })()

      ;(function createFaces(){
        // // Faces for exterior
        // normal = [0, 0, -1]
        // faceIndices.push([1, 0, 3])
        // faceNormals.push(normal)
        // faceIndices.push([2, 1, 3])
        // faceNormals.push(normal)

        // Faces for edges
        normal = [q, p, 0]
        faceIndices.push([4, 0, 1])
        faceNormals.push(normal)
        faceIndices.push([5, 4, 1])
        faceNormals.push(normal)
        
        normal = [-q, p, 0]
        faceIndices.push([5, 1, 2])
        faceNormals.push(normal)
        faceIndices.push([6, 5, 2])
        faceNormals.push(normal)
       
        normal = [-q, -p, 0]
        faceIndices.push([6, 2, 3])
        faceNormals.push(normal)
        faceIndices.push([7, 6, 3])
        faceNormals.push(normal)
        
        normal = [q, -p, 0]
        faceIndices.push([7, 3, 0])
        faceNormals.push(normal)
        faceIndices.push([4, 7, 0])
        faceNormals.push(normal)

        // Faces for top
        normal = [0, 0, 1]
        faceIndices.push([7, 4, 5])
        faceNormals.push(normal)
        faceIndices.push([7, 5, 6])
        faceNormals.push(normal)
      })()
    })()

    ;(function createSTL(){
      var stl = "solid " + name + "\n"
      var total = faceIndices.length
      var ii
      
      for (ii = 0; ii < total; ii += 1) {
        normal = faceNormals[ii]
        face = faceIndices[ii]
        stl += "\n  facet normal " + e(normal[0]) 
                             + " " + e(normal[1])
                             + " " + e(normal[2])
        stl += "\n    outer loop" 

        stl += "\n      vertex " + e(vertices[face[0]][0]) // + offsetX)
                           + " " + e(vertices[face[0]][1]) // + offsetY)
                           + " " + e(vertices[face[0]][2])

        stl += "\n      vertex " + e(vertices[face[1]][0]) // + offsetX)
                           + " " + e(vertices[face[1]][1]) // + offsetY)
                           + " " + e(vertices[face[1]][2])

        stl += "\n      vertex " + e(vertices[face[2]][0]) // + offsetX)
                           + " " + e(vertices[face[2]][1]) // + offsetY)
                           + " " + e(vertices[face[2]][2])
      
        stl += "\n    endloop"
        stl += "\n  endfacet"
      }

      stl += "\nendsolid " + name

      fs.writeFile(path + name + v + ".stl", stl)
      fs.writeFile(vFile, v)
    })()
  }

  /* BEVELS *
    // For both acute and obtuse rhombohedrons, there are two 
    // different bevels and three different bevel intersection types
    // in four different places:
    // Bevels:
    // - Between adjacent faces (36° for acute, 72° for obtuse)
    // - Where the sides connect (108° for acute, 18° for obtuse)
    // Intersection types:
    // - Where adjacent faces meet at the crown
    // - At the VV armpits in the broad middle (x2 = left and right)
    // - At the tip of the opposing Vs
    // The armpit intersections are at an angle. The two at the inner
    // tip and outermost points of the rhombus meet on the diagonal.
  */

  function addInteriorVerticesAcute() {
    // Bevels:
    // - 36° between adjacent faces
    // - 108° where the sides connect
    // Intersection types:
    // - 36°-36° at the acute crown
    // - 36°-108° at obtuse VV armpits (x2 = left and right)
    // - 108°-108° at the tip of the outer acute Vs
    // The angled armpit intersections are at the obtuse angle of the
    // rhombus. The two intersections at the acute ends of the rhombus
    // meet on the long diagonal.

    vertices.push([offsetX, 0, ply])
    vertices.push([0, offsetY, ply])
    vertices.push([-offsetX, 0, ply])
    vertices.push([0, -offsetY, ply])
  }

  function addInteriorVerticesObtuse() {
    // Bevels:
    // - 72° between adjacent faces
    // - 18° where the sides connect
    // Intersection types:
    // - 72°-72° at the obtuse crown
    // - 72°-18° at acute VV armpits (x2 = left and right)
    // - 18°-18° at the tip of the outer obtuse Vs
    // The angled armpit intersections are at the acute ends of the
    // rhombus. The two intersections at the obtuse angles of the
    // rhombus meet on the short diagonal.

    vertices.push([offsetX, 0, ply])
    vertices.push([0, offsetY, ply])
    vertices.push([-offsetX, 0, ply])
    vertices.push([0, -offsetY, ply])
  }

  function e(number) {
    return (Math.round(number * 1000) / 1000) //.toExponential()
  }
  
})()