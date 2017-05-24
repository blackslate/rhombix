"use strict"

;(function (){

  var fs = require("fs")
  var ЗD = require("./3D.js")

  // return

  // <HARD-CODED>
  var scale = 4
  var edge = 50 * scale
  var magWidth = 10 * scale
  var magHeight = 3 * scale
  var ply = 0.5 * scale
  var blockWidth = ply *2
  var blockCount = 6 * 2 // must be an even number

  var vFile = "v"
  var path = "output/"
  var name = "acute"

  var showWitnessFace = false
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
  var _18degrees = Math.PI / 10 // side bevel of flat rhombohedron
  // 0.3141592653589793 radians 18°
  var _36degrees = _18degrees * 2// crown bevel of pointy rhombohedron
  // 0.6283185307179586 radians 36°
  var _54degrees = _18degrees * 3// side bevel of pointy rhombohedron
  // 0.9424777960769379 radians 54°
  var _72degrees = _36degrees * 2 // crown of flat rhombohedron
  // 1.2566370614359172 radians 72°

  // var _108degrees = _36degrees * 3
  // // 1.8849555921538759 radians 108°// side of pointy rhombohedron
  // var _144degrees = _36degrees * 4
  // // 2.5132741228718345 radians 144° // dome of flat rhombohedron

  var offsetX = p/2 * edge
  var offsetY = q/2 * edge

  var vertices = []
  var normalMap = {}
  var planes = {}
  var faceIndices = []
  var faceNormals = []
  var faces = []
  var normal
  var face

  var version

  fs.readFile(vFile, versionIt)

  function versionIt(error, data) {
    if (error) {
      version = "001"
    } else {
      version = parseInt(data, 10) + 1
      if (version < 10) {
        version = "00" + version
      } else if (version < 100) {
        version = "0" + version
      }
    }

    ;(function prepareAcuteRhombus(){
      ;(function createVertices(){
        var lineMap = {} // {bevel45: <Line>, ...}

        // Exterior vertices for rhombus
        vertices.push(new ЗD.Vector(offsetX, 0, 0))
        vertices.push(new ЗD.Vector(0, offsetY, 0))
        vertices.push(new ЗD.Vector(-offsetX, 0, 0))
        vertices.push(new ЗD.Vector(0, -offsetY, 0))

        // Interior
        addInteriorVertices(0, _36degrees, _54degrees)
        // addInteriorVertices(1, _18degrees, _72degrees)
        
        addMagnetSupport()
        addMagnetBumps()
        addClipBlocks()

        addWitnessFace()

        /* BEVELS *
          // For both acute and obtuse rhombohedrons, there are two 
          // different bevels and three different bevel intersection
          // types in four different places:
          // Bevels:
          // - Between adjacent faces (36° for acute, 72° for obtuse)
          // - Where the sides connect (54° for acute, 18° for obtuse)
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
          addBevelsToLineMap()
          calculateInnerPoints()

          vertices = vertices.concat(innerPoints)

          // console.log(vertices)

          function addBevelsToLineMap() {
            var endIndex = 0
            var endVertex = vertices[endIndex]
            var ii = vertices.length

            var startVertex
            var edge
              , perpendicular
              , tan
              , name
           
            for (; ii-- ;) {
              startVertex = vertices[ii]
              edge = new ЗD.Line(startVertex, endVertex, "fromPoints")
              // console.log(edge.toString())

              perpendicular = new ЗD.Vector(0, 0, 1)
                             .cross(edge.direction)
  
              tan = Math.tan(angles[ii])
              perpendicular.scalarMultiply(ply / tan)

              edge.point =  perpendicular.add(edge.point)
                                         .add(new ЗD.Vector(0, 0, ply))
              name = "bevel_" + ii
              lineMap[name] = edge

              endVertex = startVertex
              endIndex = ii
            }
          }

          function calculateInnerPoints() {
            var bevel = lineMap.bevel_3
            var ii
              , name
              , line
              , point
            
            for (ii = 0; ii<4; ii += 1) {
              name = "bevel_" + ii
              line = lineMap[name]
              point = line.closestPointTo(bevel)
              innerPoints[ii] = line.point = point
              bevel = line
            }
          }
        }

        function addMagnetSupport() {
          // The support for the magnet on the acute rhombohedron is
          // created with 5 triangles on the front face, 5 on the
          // back face, 2 x 2 edges, and a total of 6 in the gap
          // ABCD
          // 
          // x>               x<
          //         A                 B
          //        / \               / \
          //      21–––20           23–––22
          //      /|  /|\           /|  /|\
          //     / | / | \         / | / | \
          //    /  |/  |  \       /  |/  |  \
          //   /  18———19  \     /  16———17  \
          //  9————E   D————8   7————F   C————5
          // 3_______________1
          //                  
          // Find the centroid of the equilateral triangle which joins
          // the short diagonals of three faces at one peak, and the
          // normal for this triangle. Normal is unscaled.

          var x = Math.cos(acute) / Math.cos(acute / 2) // from tip
          var z = Math.sqrt(1 - x * x)
          var normal
            , centroid
            , line
            , bevelEdge
            , point
            , plane

          ;(function createSupportOutline(){
            x = p/2 - x // from origin

            normal = new ЗD.Vector(x/3, 0, z/3)
                           .subtract(new ЗD.Vector(p/2, 0, 0))
                           .normalize()
            normalMap.tipToCentroid = [normal.x, normal.y, normal.z]
            normalMap.centroidToTip = [-normal.x,-normal.y,-normal.z]
            
            // Scale for centroid
            centroid = new ЗD.Vector (x * edge / 3, 0, z * edge / 3)

            // Find where lines from ends of short diagonal cross the
            // inner bevels
            // y>0
            line = new ЗD.Line(centroid, vertices[1], "fromPoints")
            lineMap.support1 = line
            bevelEdge = lineMap.bevel_0
            point = bevelEdge.closestPointTo(line)
            vertices.push(point.clone()) // 8

            lineMap.support5 = line.clone().setPoint(vertices[5])

            // y<0
            point.y = -point.y
            vertices.push(point.clone()) // 9

            vertices.push(centroid) // A

            // Create a plane passing through points 1, 3 and A. Call
            // it supportMore, because it is on the side where the
            // values of x are more than on the other face
            planes.supportMore = new ЗD.Plane(centroid, normal)

            // Create a parallel plane passing through points 5 and 7
            plane = new ЗD.Plane(vertices[5], normal)
            planes.supportLess = plane

            // A point on this new plane by the centroid            
            line = new ЗD.Line(centroid, normal)
            point = plane.intersectsLine(line)
            vertices.push(point.clone()) // B

            // Normals for sides of magnet support, starting on the
            // y>0 side
            normal = bevelEdge.direction
                              .cross(lineMap.support1.direction)
            normalMap.plusSide = [normal.x, normal.y, normal.z]
            normalMap.minusSide = [normal.x, -normal.y, normal.z]
          })()

          ;(function createGap(){
            var xAxis = new ЗD.Vector(1, 0, 0)
            var yAxis = new ЗD.Vector(0, 1, 0)
            var rayOffset = new ЗD.Vector(0, 0, magHeight)
            var width
              , offsetX
              , line

            normalMap.yAxis = [yAxis.x, yAxis.y, yAxis.z]
            normalMap._yAxis = [0, -1, 0]
            normalMap.zAxis = [0, 0, 1]
            normalMap._zAxis = [0, 0, -1]

            // Bottom, less face
            point.copy(vertices[5])
            width = (point.distanceTo(vertices[7]) - magWidth) / 2
            offsetX = new ЗD.Vector(0, width, 0)

            point.subtract(offsetX)
            vertices.push(point.clone()) // C

            planes.gap = new ЗD.Plane(point, new ЗD.Vector(0, -1, 0))

            line = new ЗD.Line(point, xAxis)
            point = planes.supportMore.intersectsLine(line)
            vertices.push(point.clone()) // D

            point.y = -point.y
            vertices.push(point.clone()) // E

            point.copy(vertices[12]) // (C)
            point.y = -point.y
            vertices.push(point.clone()) // F

            // Top
            point.add(rayOffset)
            line.setPoint(point)                           
            point = planes.supportLess.intersectsLine(line)
            vertices.push(point.clone()) // 16

            point.y = -point.y
            vertices.push(point.clone()) // 17

            point = planes.supportMore.intersectsLine(line)
            vertices.push(point.clone()) // 18

            point.y = -point.y
            vertices.push(point.clone()) // 19

            // Apex
            line = lineMap.support1
            plane = planes.gap
            point = plane.intersectsLine(line)
            vertices.push(point.clone()) // 20

            point.y = -point.y
            vertices.push(point.clone()) // 21

            line = lineMap.support5
            point = plane.intersectsLine(line)
            vertices.push(point.clone()) // 22

            point.y = -point.y
            vertices.push(point.clone()) // 23

          })()
        }

        function addMagnetBumps() {
          //
          //   6——————A            0——————4
          //   \*    /|            |\   * |
          //   |\*  / |            |•\ *  |
          //   | \ 9  |            |  3   |
          //   |  \|• |            | •|\  |
          //   |   8  |            |  2 \ |
          //   | *  \•|            | / * \|
          //   |*    \|            |/   * \
          //   7——————B            1——————5
          //
          // [0,1,2] [0,2,3] [0,3,4] [1,5,2] [2,5,3] [3,5,4]
          // [6,7,8] [6,8,9] [6,9,A] [7,B,8] [8,B,9] [9,B,A]

          var x = magWidth / 2
          var y = magWidth / 4
          var z = magHeight / 2
          var r = Math.sqrt(y * y + z * z)
          var slopeX = z / r
          var slopeZ = y / r
          var point = new ЗD.Vector(x, y, 0)

          normalMap.bumps = [
            [ [-1,  0, 0]
            , [-1,  0, 0]
            , [ 0,  1, 0]
            , [ 0, -1, 0]
            , [ 0,  1, 0]
            , [ slopeX, 0, slopeZ]
            , [ slopeX, 0, slopeZ]
            ]
          , [ [-slopeX, 0, slopeZ]
            , [-slopeX, 0, slopeZ]
            , [ 0,  1, 0]
            , [ 0, -1, 0]
            , [ 0,  1, 0]
            , [ 1,  0, 0]
            , [ 1,  0, 0]
            ]
          ]

          // Right: magnet side
          vertices.push(point.clone()) // 0
          point.y = -y
          vertices.push(point.clone()) // 1
          // top
          point.z = z
          vertices.push(point.clone()) // 2
          point.y = y
          vertices.push(point.clone()) // 3
          // outside
          point.set(x+y, y, 0)
          vertices.push(point.clone()) // 4
          point.y = -y
          vertices.push(point.clone()) // 5

          // Left: magnet side
          point.set(-x-y, y, 0)
          vertices.push(point.clone()) // 6
          point.y = -y
          vertices.push(point.clone()) // 7
          // top
          point.set(-x, -y, z)
          vertices.push(point.clone()) // 8
          point.y = y
          vertices.push(point.clone()) // 9
          // outside
          point.z = 0
          vertices.push(point.clone()) // A
          point.y = -y
          vertices.push(point) // B
        }

        /**
         * Adds six blocks along each edge, separated by the space of
         * one block, and with a one-block gap at the end. There will
         * be a length equivalent to 3 x the width of blocks at either
         * end.
         * 
         * The blocks may be slightly dovetailed so that they snap
         * together with the blocks on another face.
         */
        function addClipBlocks() {
          // Create two planes parallel with the adjacent face, one
          // at the lip of the bevel, one 1-block-width further in.
          // Create a line to intersect this plane, parallel to the
          // preceding adjacent face. Move this line to 8 different
          // positions corresponding to the corners of the blocks, and
          // detect the intersection points with the planes, to give
          // the vertices of the blocks. Add these vertices to the
          // vertices array. The facets will be stitched together in
          // the createFaces function.
          // 
          // This operation needs to be done twice: once with each
          // bevel angle. The vertex points can be mirrored to the
          // opposite side after each operation.

          var x = Math.cos(acute) / Math.cos(acute / 2) // from tip
          var z = Math.sqrt(1 - x * x)
          // Unit vectors
          var offsetU = lineMap.bevel_0.direction
          var offsetV = lineMap.bevel_3.direction
          var _offsetU = offsetU.clone().reverse()
          var _offsetV = offsetV.clone().reverse()
          // Scaled vectors
          var blockU = offsetU.clone().scalarMultiply(blockWidth)
          var blockV = offsetV.clone().scalarMultiply(blockWidth)
          var _blockU = blockU.clone().reverse()
          var _blockV = blockV.clone().reverse()
          // Normals
          var uNormal = offsetU.toArray()
          var vNormal = offsetV.toArray()
          var _uNormal = _offsetU.toArray()
          var _vNormal =_offsetV.toArray()
          // Scalar
          var spacing = (lineMap.bevel_0.point
                                 .distanceTo(lineMap.bevel_1.point)
                        - 6 * blockWidth) / blockCount // bigger gap
          var blockZ
            , normal
            , spacingOffset
            , point, inner, upper
            , innerPlane
            , ray
            , total
            , ii  

          // Prepare normals for blocks
          normalMap.blocks = [
            { open:  _uNormal
            , inner: _vNormal
            , outer:  vNormal
            , close:  uNormal
            }
          , { open:  _vNormal
            , inner:  uNormal
            , outer: _uNormal
            , close:  vNormal
            }
          , { open:   vNormal
            , inner: _uNormal
            , outer:  uNormal
            , close: _vNormal
            }
          , { open:  _uNormal
            , inner:  vNormal
            , outer: _vNormal
            , close:  uNormal
            }
          ]

          // Get angle of east ridge
          x = p/2 - x // from origin
          blockZ = new ЗD.Vector (x * edge, 0, z * edge) // peak point
          blockZ.subtract(vertices[0]) // direction
                   .normalize()
                   .scalarMultiply(blockWidth)

          ;(function northEastEdge(){
            point = vertices[4].clone()

            // Create inner plane for ray casting
            normal = blockZ.cross(offsetU)
                           .normalize()
            point.subtract(blockV)
            innerPlane = new ЗD.Plane(point.clone(), normal)

            spacingOffset = offsetU.clone()
                                   .scalarMultiply(spacing)

            // Leave a blockWidth gap before the first block
            point.copy(lineMap.bevel_0.point)
                 .add(blockU)
                 .add(blockU)
                 .add(blockU) // bigger gap
            ray = new ЗD.Line(point.clone(), offsetV)

            addBlocks(innerPlane, ray, point, spacingOffset)                        
          })()

          ;(function southEastEdge(){
            point = vertices[7].clone() // 7 not 4

            // Create inner plane for ray casting (+ U, not -V)
            normal = blockZ.cross(offsetV) // V not U
                            .normalize()
            point.add(blockU)
            innerPlane = new ЗD.Plane(point.clone(), normal)

            // Set block dimensions
            spacingOffset = offsetV.clone() // V not U
                                   .scalarMultiply(spacing)

            // Leave a blockWidth gap before the first block
            point.copy(lineMap.bevel_3.point) // 3 not 0
                 .add(blockV)                 // V not U
                 .add(blockV)                 //
                 .add(blockV)                 // bigger gap
            ray = new ЗD.Line(point.clone(), offsetU) // U not V

            addBlocks(innerPlane, ray, point, spacingOffset)                     
          })()

          ;(function northWestEdge(){
            point = vertices[5].clone()

            // Create inner plane for ray casting
            normal = offsetV.cross(blockZ)
                            .normalize()
            point.add(_blockU)
            innerPlane = new ЗD.Plane(point.clone(), normal)

            spacingOffset = _offsetV.clone()
                                   .scalarMultiply(spacing)

            // Leave a blockWidth gap before the first block
            point.copy(lineMap.bevel_1.point)
                 .add(_blockV)
                 .add(_blockV)
                 .add(_blockV) // bigger gap
            ray = new ЗD.Line(point.clone(), _offsetU)

            addBlocks(innerPlane, ray, point, spacingOffset)          
          })()

          ;(function southWestEdge(){
            point = vertices[6].clone()

            // Create inner plane for ray casting
            normal = offsetU.cross(blockZ)
                            .normalize()
            point.add(blockV)
            innerPlane = new ЗD.Plane(point.clone(), normal)

            spacingOffset = _offsetU.clone()
                                   .scalarMultiply(spacing)

            // Leave a blockWidth gap before the first block
            point.copy(lineMap.bevel_2.point)
                 .add(_blockU)
                 .add(_blockU)
                 .add(_blockU) // bigger gap
            ray = new ЗD.Line(point.clone(), offsetV)

            addBlocks(innerPlane, ray, point, spacingOffset)          
          })()

          function addBlocks(innerPlane, ray, point, spacingOffset) {
            var inner
              , upper

            //   26——27 \
            //    \ / \  \
            // ___24__25  \
            // _________°*®.
            
            for (ii = 0; ii < blockCount; ii += 1) {
              inner = innerPlane.intersectsLine(ray)
              vertices.push(inner) // 24 + 4ii

              vertices.push(point.clone()) // 25 + 4ii

              upper = point.clone().add(blockZ)

              ray.setPoint(upper)
              vertices.push(innerPlane.intersectsLine(ray)) // 26 + 4ii

              vertices.push(upper) // 27 + 4ii

              point.add(spacingOffset)
              ray.setPoint(point)
            }

            // End the final space
            inner = innerPlane.intersectsLine(ray)
            vertices.push(inner) // 32 + 4ii
            vertices.push(point.clone()) // 33 + 4ii
          }  
        }

        function addWitnessFace() {
          if (!showWitnessFace) {
            return
          }

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
          normal = peak.cross(side)
                       .normalize()
          normalMap.face2out = [normal.x, normal.y, normal.z] 
          normalMap.face2in  = [-normal.x, -normal.y, -normal.z]

          // var temp = peak.clone()
          //                .subtract(new ЗD.Vector(0, q/2, 0))
          //                .magnitude()
          // console.log(peak, temp, q, Math.abs(temp - q) < 3e-16)
          // temp = peak.clone()
          //                .subtract(new ЗD.Vector(0, -q/2, 0))
          //                .magnitude()
          // console.log(peak, temp, q, Math.abs(temp - q) < 3e-16)

          vertex = new ЗD.Vector (x * edge, 0, z * edge)

          vertices.push(vertex) // 24
        }        
      })()

      ;(function createFaces(){
        // Variables for blocks (whose number may be set)
        var index = 24 // the 36 after magnet bumps
        var total = blockCount / 2
        var normalArray
          , end
          , normals
          , ii
          , jj

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
        faceIndices.push([9, 4, 8])
        faceNormals.push(normal)
        faceIndices.push([7, 5, 6])
        faceNormals.push(normal)

        // Magnet support   
        // x>               x<
        //         A                 B
        //        / \               / \
        //      21–––20           23–––22
        //      /|  /|\           /|  /|\
        //     / | / | \         / | / | \
        //    /  |/  |  \       /  |/  |  \
        //   /  18———19  \     /  16———17  \
        //  9————E   D————8   7————F   C————5
        // 3_______________1

        // supportMore (tip side)
        normal = normalMap.centroidToTip
        faceIndices.push([8, 20, 13])
        faceNormals.push(normal)
        faceIndices.push([9, 14, 21])
        faceNormals.push(normal)
        faceIndices.push([10, 21, 20])
        faceNormals.push(normal)
        faceIndices.push([18, 20, 21])
        faceNormals.push(normal)
        faceIndices.push([19, 20, 18])
        faceNormals.push(normal)
        // supportLess
        normal = normalMap.tipToCentroid
        faceIndices.push([5, 12, 22])
        faceNormals.push(normal)
        faceIndices.push([7, 23, 15])
        faceNormals.push(normal)
        faceIndices.push([11, 22, 23])
        faceNormals.push(normal)
        faceIndices.push([16, 23, 22])
        faceNormals.push(normal)
        faceIndices.push([17, 16, 22])
        faceNormals.push(normal)
        // gap less
        normal = normalMap.yAxis
        faceIndices.push([14, 15, 16])
        faceNormals.push(normal)
        faceIndices.push([14, 16, 18])
        faceNormals.push(normal)
        //gap more
        normal = normalMap._yAxis
        faceIndices.push([12, 13, 19])
        faceNormals.push(normal)
        faceIndices.push([12, 19, 17])
        faceNormals.push(normal)
        // gap bottom
        normal = normalMap.zAxis
        faceIndices.push([15, 14, 13])
        faceNormals.push(normal)
        faceIndices.push([15, 13, 12])
        faceNormals.push(normal)
        // gap top
        normal = normalMap._zAxis
        faceIndices.push([16, 17, 19])
        faceNormals.push(normal)
        faceIndices.push([16, 19, 18])
        faceNormals.push(normal)
        // edges  
        faceIndices.push([5, 11, 8]) // plus side
        faceNormals.push(normalMap.plusSide)
        faceIndices.push([10, 8, 11])
        faceNormals.push(normalMap.plusSide)
        faceIndices.push([7, 9, 10]) // minus side
        faceNormals.push(normalMap.minusSide)
        faceIndices.push([11, 7, 10])
        faceNormals.push(normalMap.minusSide)

        // Magnet bumps
        //
        //   6——————A            0——————4
        //   \*    /|            |\   * |
        //   |\*  / |            |•\ *  |
        //   | \ 9  |            |  3   |
        //   |  \|• |            | •|\  |
        //   |   8  |            |  2 \ |
        //   | *  \•|            | / * \|
        //   |*    \|            |/   * \
        //   7——————B            1——————5
        //
        // [0,1,2] [0,2,3] [0,3,4] [1,5,2] [2,5,3] [3,5,4]
        // [6,7,8] [6,8,9] [6,9,A] [7,B,8] [8,B,9] [9,B,A]

        normalArray = normalMap.bumps
        index = 24

        for (ii = 0; ii < 2; ii += 1) {
          normals = normalArray[ii]

          faceIndices.push([index, index+1, index+2])
          faceNormals.push(normals.shift())
          faceIndices.push([index, index+2, index+3])
          faceNormals.push(normals.shift())
          faceIndices.push([index, index+3, index+4])
          faceNormals.push(normals.shift())
          faceIndices.push([index+1, index+2, index+5])
          faceNormals.push(normals.shift())
          faceIndices.push([index+2, index+5, index+3])
          faceNormals.push(normals.shift())
          faceIndices.push([index+3, index+5, index+4])
          faceNormals.push(normals.shift())

          index += 6
        }

        // Blocks (number may vary; normals point outwards)
        //      \\
        //   30——31
        //    \   \\
        //   *28__29\
        //    *     *\    inner       outer    close    top     space
        //     * 26——27   30——26      27——31   31––30   31——27  33——29
        //      * \ / \\   \ / \      / \ /    / \ /    / \ /   / \ /
        // _open_*24__25\  28___24  25__29   29__28   30__26  32__28
        // _____________*.
       
        normalArray = normalMap.blocks

        for (jj = 0; jj < 4; jj += 1) { // will be 4 edges
          normals = normalArray[jj]
          
          for (ii = 0; ii < total; ii += 1) {
            normal = normals.open
            // Opening end
            faceIndices.push([index, index+1, index+3])
            faceNormals.push(normal)  
            faceIndices.push([index, index+3, index+2])
            faceNormals.push(normal)

            // Inner face
            normal = normals.inner
            faceIndices.push([index, index+2, index+4])
            faceNormals.push(normal)  
            faceIndices.push([index+2, index+6, index+4])
            faceNormals.push(normal)
            
            // Outer face
            normal = normals.outer
            faceIndices.push([index+1, index+5, index+3])
            faceNormals.push(normal)
            faceIndices.push([index+3, index+5, index+7])
            faceNormals.push(normal)
            
            // Closing end
            normal = normals.close
            faceIndices.push([index+4, index+6, index+7])
            faceNormals.push(normal)  
            faceIndices.push([index+4, index+7, index+5])
            faceNormals.push(normal)  
            
            // Top
            normal = normalMap.zAxis
            faceIndices.push([index+2, index+3, index+7])
            faceNormals.push(normal)  
            faceIndices.push([index+2, index+7, index+6])
            faceNormals.push(normal)  
            
            // Space
            faceIndices.push([index+4, index+5, index+9])
            faceNormals.push(normal)  
            faceIndices.push([index+4, index+9, index+8])
            faceNormals.push(normal)

            index += 8       
          }

          index += 2 // skip vertices at the end of the final space
        }
        
        if (showWitnessFace) {
          faceIndices.push([0, 1, index])
          faceNormals.push(normalMap.face2out)
          faceIndices.push([0, 24, 1])
          faceNormals.push(normalMap.face2in)
        }
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

      fs.writeFile(path + name + version + ".stl", stl)
      fs.writeFile(vFile, version)
    })()
  }

  function e(number) {
    return (Math.round(number * 1000) / 1000) //.toExponential()
  }  
})()