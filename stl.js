;(function (){
  var fs = require("fs")
  var ЗD = require("./3D.js")

  // <HARD-CODED>
  var scale = 4
  var edge = 50 * scale
  var magWidth = 10 * scale
  var magHeight = 3 * scale
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
  var _18degrees = Math.PI / 10 // thin bevel of flat rhombohedron
  // 0.3141592653589793 radians 18°
  var _36degrees = _18degrees * 2// point bevel of pointy rhombohedron
  // 0.6283185307179586 radians 36°
  var _54degrees = _18degrees * 3// side bevel of pointy rhombohedron
  // 0.9424777960769379 radians 54°
  
  var _72degrees = _36degrees * 2 // point of pointy rhombohedron
  // 1.2566370614359172 radians 72°
  var _108degrees = _36degrees * 3
  // 1.8849555921538759 radians 108°// side of pointy rhombohedron
  var _144degrees = _36degrees * 4
  // 2.5132741228718345 radians 144° // dome of flat rhombohedron

  var offsetX = p/2 * edge
  var offsetY = q/2 * edge

  var vertices = []
  var normals = {}
  var faceIndices = []
  var faceNormals = []
  var faces = []
  var normal
  var face

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
        var bevelLineArray = [] // [<Line>, <Line>, <Line>, <Line>]

        // Exterior vertices for rhombus
        vertices.push(new ЗD.Vector(offsetX, 0, 0))
        vertices.push(new ЗD.Vector(0, offsetY, 0))
        vertices.push(new ЗD.Vector(-offsetX, 0, 0))
        vertices.push(new ЗD.Vector(0, -offsetY, 0))

        // Interior
        addInteriorVertices(0, _36degrees, _54degrees)
        // addInteriorVertices(1, _18degrees, _72degrees)
        
        addMagnetSupport()

        addWitnessFace()

        /* BEVELS *
          // For both acute and obtuse rhombohedrons, there are two 
          // different bevels and three different bevel intersection
          // types in four different places:
          // Bevels:
          // - Between adjacent faces (36° for acute, 72° for obtuse)
          // - Where the sides connect (108° for acute, 18° for obtuse)
          // Intersection types:
          // - Where adjacent faces meet at the crown
          // - At the VV armpits in the middle (x2 = left and right)
          // - At the tip of the opposing Vs
          // The armpit intersections are at an angle. The two at the
          // inner tip and outermost points of the rhombus meet on the
          // diagonal.
        */

        function addInteriorVertices(pointIndex, innerAngle, outerAngle) {
          // Bevels:
          // - innerAngle between adjacent faces
          // - outerAngle where the sides connect
          // Intersection types:
          // - inner-inner at the crown
          // - inner-outer at VV armpits (x2 = left and right)
          // - outer-outer at the tip of the acute Vs

          var angles = [innerAngle, outerAngle, outerAngle, innerAngle]
          var innerPoints = []

          if (pointIndex) {
            angles.unshift(angles.pop())
          }
          populateBevelLineArray()
          calculateInnerPoints()

          vertices = vertices.concat(innerPoints)

          // console.log(vertices)

          function populateBevelLineArray() {
            var endVertex = vertices[0]
            var ii = vertices.length

            var startVertex
            var edge
              , perpendicular
              , tan
           
            for (; ii-- ;) {
              startVertex = vertices[ii]
              edge = new ЗD.Line().setFromPoints(startVertex, endVertex)
              // console.log(edge.toString())

              perpendicular = new ЗD.Vector(0, 0, 1)
                             .cross(edge.direction)
  
              tan = Math.tan(angles[ii])
              perpendicular.scalarMultiply(ply / tan)

              edge.point =  perpendicular.add(edge.point)
                                         .add(new ЗD.Vector(0, 0, ply))
              bevelLineArray.unshift(edge)

              endVertex = startVertex
            }
          }

          function calculateInnerPoints() {
            var total = bevelLineArray.length
            var other = bevelLineArray.slice(-1)[0] // above vertex 3
            var ii
              , line
              , point
            
            for (ii = 0; ii<total; ii += 1) {
              line = bevelLineArray[ii]
              point = line.closestPointTo(other)
              innerPoints[ii] = line.point = point
              other = line
            }
          }
        }

        function addMagnetSupport() {
          // The support for the magnet on the acute rhombohedron is
          // created with 5 triangles on the front face, 5 on the
          // back face, 2 x 2 edges, and a total of 6 in the gap
          // ABCD
          // 
          // Front:           Back:
          //        17               24
          //       / \              / \
          //     15–––16          22–––23
          //     /|  /|\          /|  /|\
          //    / | / | \        / | / | \
          //   /  |/  |  \      /  |/  |  \
          //  /   B———C   \    /   19—20   \
          // 9————A   D————14 7————18 21————5
          // 
          // The 20 triangles will be:
          // Front: 9-A-15, B-C-16, B-16-15, D-14-16, 15-16-17
          // Sides: 9-17-7, 24-7-17 : 14-5-17, 24-17-5
          // Back:  7-18-22, 22-23-29, 20-19-23, 21-23-5, 22-24-23
          // Gap: A-18-B, 19-B-18 : B-C-19, 20-19-C : D-C-21, 20-21-C
          
          // var top = bevelLineArray[1]    // vertex 5
          // var bottom = bevelLineArray[3] // vertex 7

          // // Thickness of support triangle
          // var direction = top.direction.clone().scalarMultiply(ply)
          // var vertex = top.point.clone().subtract(direction)
          // vertices.push(vertex)

          // direction.copy(top.direction).scalarMultiply(ply)
          // vertex.copy(bottom.point).subtract(direction)
          // vertices.push(vertex)

          // First draft: one third of an equilateral triangle with
          // its base along the short diagonal of the rhombus to the 
          // centre between short diagonals on adjacent faces.

          var x = Math.cos(acute) / Math.cos(acute / 2) // from tip
          var z = Math.sqrt(1 - x * x)
          var vertex
            , normal
            , peak
            , centroid

          x = p/2 - x // from origin

          normal = new ЗD.Vector(x/3, 0, z/3) // unscaled
          normals.support1 = [normal.x, normal.y, normal.z]
          normals.support2 = [-normal.x, -normal.y, -normal.z]
          
          x *= edge
          z *= edge

          /// vertex = new ЗD.Vector (x, 0, z)
          vertex = new ЗD.Vector (x/3, 0, z/3)

          vertices.push(vertex)
        }  


        function addWitnessFace() {
          // Unscaled
          var x = Math.cos(acute) / Math.cos(acute / 2) // from tip
          var z = Math.sqrt(1 - x * x)
          var peak
            , side
            , vertex
            , normal
            , centroid

          x = p/2 - x // from origin

          peak = new ЗD.Vector(x, 0, z)
          side = new ЗD.Vector(p, q, 0)
          normal = peak.clone()
                       .cross(side)
                       .normalize()
          normals.face2out = [normal.x, normal.y, normal.z] 
          normals.face2in  = [-normal.x, -normal.y, -normal.z]

          // var temp = peak.clone()
          //                .subtract(new ЗD.Vector(0, q/2, 0))
          //                .magnitude()
          // console.log(peak, temp, q, Math.abs(temp - q) < 3e-16)
          // temp = peak.clone()
          //                .subtract(new ЗD.Vector(0, -q/2, 0))
          //                .magnitude()
          // console.log(peak, temp, q, Math.abs(temp - q) < 3e-16)

          vertex = new ЗD.Vector (x * edge, 0, z * edge)

          vertices.push(vertex)
        }        
      })()

      ;(function createFaces(){
        // Faces for exterior
        normal = [0, 0, -1]
        faceIndices.push([1, 0, 3])
        faceNormals.push(normal)
        faceIndices.push([2, 1, 3])
        faceNormals.push(normal)

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

        // Equilateral triangle   
        faceIndices.push([1, 8, 3])
        faceNormals.push(normals.support1)
        faceIndices.push([1, 3, 8])
        faceNormals.push(normals.support2)

        // Face 2 external 
        faceIndices.push([0, 1, 9])
        faceNormals.push(normals.face2out)
        faceIndices.push([0, 9, 1])
        faceNormals.push(normals.face2in)

      })()
    })()

    ;(function createSTL(){
      // return

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

        stl += "\n      vertex " + e(vertices[face[0]].x) // + offsetX)
                           + " " + e(vertices[face[0]].y) // + offsetY)
                           + " " + e(vertices[face[0]].z)

        stl += "\n      vertex " + e(vertices[face[1]].x) // + offsetX)
                           + " " + e(vertices[face[1]].y) // + offsetY)
                           + " " + e(vertices[face[1]].z)

        stl += "\n      vertex " + e(vertices[face[2]].x) // + offsetX)
                           + " " + e(vertices[face[2]].y) // + offsetY)
                           + " " + e(vertices[face[2]].z)
      
        stl += "\n    endloop"
        stl += "\n  endfacet"
      }

      stl += "\nendsolid " + name

      fs.writeFile(path + name + v + ".stl", stl)
      fs.writeFile(vFile, v)
    })()
  }

  function e(number) {
    return (Math.round(number * 1000) / 1000) //.toExponential()
  }  
})()