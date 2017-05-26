"use strict"

;(function (){

  var fs = require("fs")
  var ЗD = require("./3D.js")

  // return
  // TO DO //
  // 
  // Trim end of magnet support
  // Add triangular base for better adherence of magnet support


  // <HARD-CODED>
  var scale = 4
  var edge = 50 * scale
  var magWidth = 12 * scale    // width of gap for magnet
  var magHeight = 4 * scale    // height of gap for magnet
  var bumpWidth = magWidth / 4
  var bumpHeight = magHeight / 2
  var bumpLength = 12 * scale  // length of bump to anchor magnet 
  var ply = 1 * scale
  var blockWidth = ply * 3
  var blockAdjust = 0.2 // 0.0 - 0.5
  var blockCount = 4 * 2 // must be an even number
  var gapCount = 2 // number of blockWidths to leave empty along bevel 
  var popDepth = ply * 0.5

  var trimWidth = blockWidth
  var baseWidth = blockWidth

  var vFile = "version"
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

  var normalMap = {
    yAxis:  [0,  1,  0]
  , _yAxis: [0, -1,  0]
  , zAxis:  [0,  0,  1]
  , _zAxis: [0,  0, -1]
  }

  var vertices = []
  var faceIndices = []
  var faceNormals = []

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
        var offsetX = p/2 * edge
        var offsetY = q/2 * edge
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
          addBevelsToLineMap() // lineMap.bevel_X = <Line>
          calculateInnerPoints()

          vertices = vertices.concat(innerPoints)

          // console.log(vertices)

          /**
           * Adds a bevels to line map.
           */
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

              perpendicular = new ЗD.Vector(0, 0, 1)
                             .cross(edge.direction)
  
              tan = Math.tan(angles[ii])
              perpendicular.scalarMultiply(ply / tan)

              // Find a point on line which will include the bevel
              // segment. This point will not be one of the ends of
              // the bevel segment.
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
          //          A                  B
          //         / \                / \
          //       21–––20            23–––22
          //       /|  /|\            /|  /|\
          //      / | / | \          / | / | \
          //     /  |/  |  \        /  |/  |  \
          //    /  18———19  \       18—16——17—D
          //   /                    |\ |   | \|
          //  9————16   F—————8   7 D—17   E——C 5
          // 3_______________1
          //                  
          // Find the centroid of the equilateral triangle which joins
          // the short diagonals of three faces at one peak, and the
          // normal for this triangle. Normal is unscaled.
return
          var x = Math.cos(acute) / Math.cos(acute / 2) // from tip
          var z = Math.sqrt(1 - x * x)
          var normal
            , centroid
            , line
            , bevelEdge
            , point
            , eastPlane
            , westPlane
            , northPlane

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

            // Create a plane passing through points 1, 3 and A.
            eastPlane = new ЗD.Plane(centroid, normal)

            // Create a parallel plane passing through points 5 and 7
            westPlane = new ЗD.Plane(vertices[5], normal)

            // A point on this new plane by the centroid            
            line = new ЗD.Line(centroid, normal)
            point = westPlane.intersectsLine(line)
            vertices.push(point.clone()) // B

            // Normals for sides of magnet support, starting on the
            // y>0 side
            normal = bevelEdge.direction
                              .cross(lineMap.support1.direction)
            normalMap.plusSide = [normal.x, normal.y, normal.z]
            normalMap.minusSide = [normal.x, -normal.y, normal.z]
          })()

          ;(function createGap() {
            var xAxis = new ЗD.Vector(1, 0, 0)
            var yAxis = new ЗD.Vector(0, 1, 0)
            var rayOffset = new ЗD.Vector(0, 0, magHeight)
            var width
              , offsetX
              , line

            // Calculate width of feet either side of the magnet gap
            point.copy(vertices[5])

            width = (point.distanceTo(vertices[7]))
            width = (width - magWidth - trimWidth) / 2
            offsetX = new ЗD.Vector(0, width, 0)

            point.subtract(yAxis.clone().scalarMultiply(trimWidth))
            vertices.push(point.clone()) // C
            
            // Create plane to make horizontal slices
            northPlane = new ЗD.Plane(point, new ЗD.Vector(0, -1, 0))
            line = new ЗD.Line(point, yAxis)

            // Point at shoulder of trim
            vertices.push(northPlane.intersectsLine(line)) // D

            // Move to north of magnet gap. northPlane and line
            // follow as point changes
            point.subtract(offsetX)
            vertices.push(point.clone()) // E

            // Find equivalent point in west plane
            line = new ЗD.Line(point, xAxis)
            point = eastPlane.intersectsLine(line)
            vertices.push(point.clone()) // D

            point.y = -point.y
            vertices.push(point.clone()) // E

            point.copy(vertices[12]) // (C)
            point.y = -point.y
            vertices.push(point.clone()) // F

            // Top
            point.add(rayOffset)
            line.setPoint(point)                           
            point = westPlane.intersectsLine(line)
            vertices.push(point.clone()) // 16

            point.y = -point.y
            vertices.push(point.clone()) // 17

            point = eastPlane.intersectsLine(line)
            vertices.push(point.clone()) // 18

            point.y = -point.y
            vertices.push(point.clone()) // 19

            // Apex
            line = lineMap.support1
            point = northPlane.intersectsLine(line)
            vertices.push(point.clone()) // 20

            point.y = -point.y
            vertices.push(point.clone()) // 21

            line = lineMap.support5
            point = northPlane.intersectsLine(line)
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
          var y = bumpWidth
          var z = bumpHeight
          var r = Math.sqrt(bumpLength * bumpLength + z * z)
          var slopeX = z / r
          var slopeZ = bumpLength / r
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
          point.set(x + bumpLength, y, 0)
          vertices.push(point.clone()) // 4
          point.y = -y
          vertices.push(point.clone()) // 5

          // Left: magnet side
          point.set(-x - bumpLength, y, 0)
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
         * Adds blocks along each edge, separated by the space of one
         * block, and with a one-block gap at the end. There will be a
         * length equivalent to 3 x the width of blocks at either end.
         * 
         * The blocks are slightly indented so that they snap
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
          // Normals
          var uNormal = offsetU.toArray()
          var vNormal = offsetV.toArray()
          var _uNormal = _offsetU.toArray()
          var _vNormal =_offsetV.toArray()
          // Scalar
          var spacing = (vertices[4].distanceTo(vertices[5])
                        - gapCount * 2 * blockWidth)
                      / blockCount
          var blockZ

          // Prepare normals for blocks. Treat points and indentations
          // on the ends of the blocks as having an average normal.
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

          // north-east: point,  ray,      block direction
          addBlocks(vertices[4], _offsetV, offsetU, true)
          // north-west
          addBlocks(vertices[5], _offsetU, _offsetV, true)
          // south-west
          addBlocks(vertices[6], offsetV, _offsetU, true)
          // south-east
          addBlocks(vertices[7], offsetU, offsetV, false)

          function addBlocks(bevelPoint, ray, blockDirection, pop) {
            // point, ray, blockDirection are all the original
            // vectors. They must be cloned before they are
            // modified.

            // Move point inwards by the blockWidth
            var point = bevelPoint.clone()
                                  .add(ray.clone()
                                          .scalarMultiply(blockWidth))
            var normal = blockZ.cross(blockDirection).normalize()
            var innerPlane = new ЗD.Plane(point.clone(), normal)
            var blockVector = blockDirection.clone()
                                            .scalarMultiply(spacing)
            var adjust = blockDirection.clone()
                                  .scalarMultiply(spacing*blockAdjust)
            var ray
              , popOffset
              , ii
              , inner
              , upper
              , centre

            // Set point to the first vertex on the outer plane
            point = bevelPoint.clone()
                              .add(blockDirection.clone()
                                                 .scalarMultiply(
                                               blockWidth * gapCount))
            ray = new ЗD.Line(point.clone(), ray) // direction => line

            popOffset = blockDirection.clone()
                                      .scalarMultiply(popDepth)
            if (!pop) {
              popOffset.reverse()
            }

            //   3———————2  \
            //    \ *.  / \  \
            //     \  °4   \  \
            //      \ /  °. \  \
            // ______1_______0  \
            // _______________°*®.
            
            for (ii = 0; ii < blockCount; ii += 1) {
              vertices.push(point.clone()) // index + 5ii
                                           // 
              inner = innerPlane.intersectsLine(ray)
              vertices.push(inner) // index + 1 + 5ii

              upper = point.clone().add(blockZ)
              vertices.push(upper) // index + 2 + 5ii

              ray.setPoint(upper)
              vertices.push(innerPlane.intersectsLine(ray)) //...+3...
              
              centre = inner.average(upper)
                            .add(popOffset)
              vertices.push(centre) // index + 4 + 4ii

              point.add(blockVector)
              if (!ii) {
                point.subtract(adjust)
              } else if (ii % 2) {
                point.add(adjust).add(adjust)
              } else {
                point.subtract(adjust).subtract(adjust)
              }

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
        var total
          , index
          , normalArray
          , normals
          , normal
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
        faceIndices.push([4, 5, 7])
        faceNormals.push(normal)
        faceIndices.push([7, 5, 6])
        faceNormals.push(normal)

        // // Magnet support   
        // // x>               x<
        // //         A                 B
        // //        / \               / \
        // //      21–––20           23–––22
        // //      /|  /|\           /|  /|\
        // //     / | / | \         / | / | \
        // //    /  |/  |  \       /  |/  |  \
        // //   /  18———19  \     /  16———17  \
        // //  9————E   D————8   7————F   C————5
        // // 3_______________1

        // // supportMore (tip side)
        // normal = normalMap.centroidToTip
        // faceIndices.push([8, 20, 13])
        // faceNormals.push(normal)
        // faceIndices.push([9, 14, 21])
        // faceNormals.push(normal)
        // faceIndices.push([10, 21, 20])
        // faceNormals.push(normal)
        // faceIndices.push([18, 20, 21])
        // faceNormals.push(normal)
        // faceIndices.push([19, 20, 18])
        // faceNormals.push(normal)
        // // supportLess
        // normal = normalMap.tipToCentroid
        // faceIndices.push([5, 12, 22])
        // faceNormals.push(normal)
        // faceIndices.push([7, 23, 15])
        // faceNormals.push(normal)
        // faceIndices.push([11, 22, 23])
        // faceNormals.push(normal)
        // faceIndices.push([16, 23, 22])
        // faceNormals.push(normal)
        // faceIndices.push([17, 16, 22])
        // faceNormals.push(normal)
        // // gap less
        // normal = normalMap.yAxis
        // faceIndices.push([14, 15, 16])
        // faceNormals.push(normal)
        // faceIndices.push([14, 16, 18])
        // faceNormals.push(normal)
        // //gap more
        // normal = normalMap._yAxis
        // faceIndices.push([12, 13, 19])
        // faceNormals.push(normal)
        // faceIndices.push([12, 19, 17])
        // faceNormals.push(normal)
        // // gap bottom
        // normal = normalMap.zAxis
        // faceIndices.push([15, 14, 13])
        // faceNormals.push(normal)
        // faceIndices.push([15, 13, 12])
        // faceNormals.push(normal)
        // // gap top
        // normal = normalMap._zAxis
        // faceIndices.push([16, 17, 19])
        // faceNormals.push(normal)
        // faceIndices.push([16, 19, 18])
        // faceNormals.push(normal)
        // // edges  
        // faceIndices.push([5, 11, 8]) // plus side
        // faceNormals.push(normalMap.plusSide)
        // faceIndices.push([10, 8, 11])
        // faceNormals.push(normalMap.plusSide)
        // faceIndices.push([7, 9, 10]) // minus side
        // faceNormals.push(normalMap.minusSide)
        // faceIndices.push([11, 7, 10])
        // faceNormals.push(normalMap.minusSide)

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
        index = 8

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
        // 
        //   |   B_______A
        //   |   .       .
        //   8———————7   .
        //   |\ *.  /|\  .
        //   | \  °9 | \ .
        //   |  \ /  °. \.
        //   |   6___|___5
        //   |   .   |   |   inner    top     outer    close     space
        //   3———.———2   |   8———3    8——7    2———7   7———————8  B——A
        //    \ *.  / \  |    \ / \   |\ |   / \ /   / \  . °/   |\ |
        //     \ .°4   \ |     6———1  | \|  0———5   /   9   /    | \|
        //      \./  °. \|            3__2         / .°  \ /     6__5
        // ______1_______0                        5*______6
        // _______________°*®.
       
        total = blockCount / 2
        normalArray = normalMap.blocks

        for (jj = 0; jj < 4; jj += 1) { // will be 4 edges
          normals = normalArray[jj]
          
          for (ii = 0; ii < total; ii += 1) {
            normal = normals.open
            // Opening end
            faceIndices.push([index, index+4, index+1])
            faceNormals.push(normal)
            faceIndices.push([index+1, index+4, index+3])
            faceNormals.push(normal)
            faceIndices.push([index+3, index+4, index+2])
            faceNormals.push(normal)
            faceIndices.push([index+2, index+4, index+0])
            faceNormals.push(normal)

            // Inner face
            normal = normals.inner
            faceIndices.push([index+1, index+3, index+6])
            faceNormals.push(normal)  
            faceIndices.push([index+8, index+6, index+3])
            faceNormals.push(normal)
            
            // Top
            normal = normalMap.zAxis
            faceIndices.push([index+3, index+2, index+8])
            faceNormals.push(normal)  
            faceIndices.push([index+7, index+8, index+2])
            faceNormals.push(normal)  
            
            // Outer face
            normal = normals.outer
            faceIndices.push([index, index+5, index+2])
            faceNormals.push(normal)
            faceIndices.push([index+7, index+2, index+5])
            faceNormals.push(normal)
            
            // Closing end
            normal = normals.close
            faceIndices.push([index+5, index+6, index+9])
            faceNormals.push(normal)
            faceIndices.push([index+6, index+8, index+9])
            faceNormals.push(normal)
            faceIndices.push([index+8, index+7, index+9])
            faceNormals.push(normal)
            faceIndices.push([index+7, index+5, index+9])
            faceNormals.push(normal)
            
            // // Space
            // faceIndices.push([index+6, index+5, index+11])
            // faceNormals.push(normal)  
            // faceIndices.push([index+10, index+11, index+5])
            // faceNormals.push(normal)

            index += 10       
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
        , normal
        , face
      
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