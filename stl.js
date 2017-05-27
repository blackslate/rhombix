"use strict"

;(function (){

  var fs = require("fs")
  var ЗD = require("./3D.js")

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
  var blockAdjust = 0.0 // 0.0 - 0.5
  var blockCount = 4 * 2 // must be an even number
  var gapCount = 2 // number of blockWidths to leave empty along bevel 
  var popDepth = ply * 0.5

  var trimWidth = blockWidth * 2
  var buttressWidth = blockWidth

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

        // vertice.length = 4

        // Interior
        addInteriorVertices(0, _36degrees, _54degrees)
        // addInteriorVertices(1, _18degrees, _72degrees)

        // vertices.length = 8
 
        addMagnetSupport()

        // vertices.length = 34
 
        addMagnetBumps()

        // vertices.length = 56
 
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
          // Create a set of vertice for the magnet support and its
          // buttresses.
          // 
          //          9                     8
          //         / \                   / \
          //       26–––E                31–––19               
          //       /|  /|\               /|  /|\
          //      / | / | \             / | / | \
          //     /  |/  |  \           /  |/  |  \
          //    23——25——D———B         28——30—18——16
          //    | \ |   | \ |         |   |   |   |
          //  7 22——24  C———A 5       27——29 17———F *  
          //                       3_________________1
          //
          //
          //     28——————30       18——————16
          //      |\    / .\       |\    / .\
          //     27.\../.29 \     17.\../..F \
          //       °32_____°33      °21_____°20

          var eastPlane
            , westPlane
            , northPlane 
            , point            
 
          ;(function createSupportOutline() {
            // Find the centroid of the equilateral triangle which
            // joins the short diagonals of three faces at one peak,
            // and the normal for this triangle. Normal is unscaled.
            // Create a "west" plane parallel to the plane of this
            // equilateral, to give the support thickness.
            //
            // west<                >east
            //          9                     8
            //         / \                   / \
            //        /   \                 /   \              
            //       /     \               /     \
            //      /       \             /       \
            //     /         \           /         \
            //    •           •         •           •
            //   •             •       •             •
            //  7               5     •               *  
            //                       3_________________1
  
            // <Repeated in addClipBlocks()>
            var x = Math.cos(acute) / Math.cos(acute / 2) // from tip
            var z = Math.sqrt(1 - x * x)
            // </Repeated>

            var normal
            , centroid
            , line
            , bevelEdge

            x = p/2 - x // from origin

            normal = new ЗD.Vector(x/3, 0, z/3)
                           .subtract(new ЗD.Vector(p/2, 0, 0))
                           .normalize()
            normalMap.tipToCentroid = normal.toArray()
            normalMap.centroidToTip = [-normal.x,-normal.y,-normal.z]
            
            // Scale for centroid
            centroid = new ЗD.Vector (x * edge / 3, 0, z * edge / 3)

            // Find where lines from ends of short diagonal cross the
            // inner bevels at the north end
            line = new ЗD.Line(vertices[1], centroid, "fromPoints")
            lineMap.support_1 = line
            bevelEdge = lineMap.bevel_0

            // Create line from bevelled corner
            lineMap.support_5 = line.clone().setPoint(vertices[5])

            vertices.push(centroid) // 8

            // Create a plane passing through points (1, 3 and) 8.
            eastPlane = new ЗD.Plane(centroid, normal)

            // Create a parallel plane passing through points 5 and 7
            westPlane = new ЗD.Plane(vertices[5], normal)

            // A point on this new plane by the centroid            
            line = new ЗD.Line(centroid, normal)
            point = westPlane.intersectsLine(line)
            vertices.push(point.clone()) // 9

            // Normals for sides of magnet support, starting on the
            // y>0 side
            normal = bevelEdge.direction
                              .cross(lineMap.support_1.direction)
            normalMap.northSide = [normal.x, normal.y, normal.z]
            normalMap.southSide = [normal.x, -normal.y, normal.z]
          })()

          ;(function createGap() {
            var xAxis = new ЗD.Vector(1, 0, 0)
            var yAxis = new ЗD.Vector(0, 1, 0)
            var rayOffset = new ЗD.Vector(0, 0, magHeight)
            var start = vertices.length
            var buttressOffset = xAxis.clone()
                                      .scalarMultiply(buttressWidth)
            var width
              , offsetX
              , line
              , end
              , ii

            // Calculate width of feet either side of the magnet gap
            point.copy(vertices[5])

            width = (point.distanceTo(vertices[7]))
            width = (width - magWidth) / 2 - trimWidth
            offsetX = new ЗD.Vector(0, width, 0)

            // Point at foot of trimmed support
            point.subtract(yAxis.clone().scalarMultiply(trimWidth))
            vertices.push(point.clone()) // A
            
            // Create plane to make horizontal slices
            northPlane = new ЗD.Plane(point, new ЗD.Vector(0, -1, 0))
            line = lineMap.support_5 // \

            // Point at shoulder of trim
            vertices.push(northPlane.intersectsLine(line)) // B

            // Move to north of magnet gap. northPlane follows as
            // point changes
            point.subtract(offsetX)
            vertices.push(point.clone()) // C

            // Top of magnet gap
            point.add(rayOffset)
            line = new ЗD.Line(point, xAxis)
            point = westPlane.intersectsLine(line)
            vertices.push(point.clone()) // D

            // Base of apex triangle
            point = northPlane.intersectsLine(lineMap.support_5)
            vertices.push(point.clone()) // E

            // Project points C - 16 onto east face: F - 19
            end = vertices.length           
            for (ii = start; ii < end; ii += 1) {
              point = vertices[ii]
              line.setPoint(point)
              vertices.push(eastPlane.intersectsLine(line))
            }

            // Create buttress points on base
            point = vertices[start].clone().add(buttressOffset)  // 20
            vertices.push(point)
            point = vertices[start+2].clone().add(buttressOffset) //21
            vertices.push(point)

            // Normal for angled buttress faces
            normalMap.butt = new ЗD.Vector(buttressWidth,0,magHeight)
                                   .normalize()

            // Copy points C - 21 to the south side: 22 - 33
            end = vertices.length          
            for (ii = start; ii < end; ii += 1) {
              point = vertices[ii].clone()
              point.y = -point.y
              vertices.push(point)
            }
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
          addBlocks(vertices[5], _offsetU, _offsetV, 2)
          // south-west
          addBlocks(vertices[6], offsetV, _offsetU, 2)
          // south-east
          addBlocks(vertices[7], offsetU, offsetV, false)

          function addBlocks(bevelPoint, ray, blockDirection, pop) {
            // point, ray, blockDirection are all the original
            // vectors. They must be cloned before they are
            // modified.
            // pop may be true, false or 2. True and false determine
            // the direction of all the pop blocks on the edges at
            // the peak of the rhombohedron. 2 creates a two-way set
            // of blocks for the outer edges, where the rhombus is 
            // rotated around the z-axis.

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
              // for pop === 2
              , halfway
              , out
              // 
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
            } else if (pop === 2) {
              halfway = blockCount / 2
              out = true
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
              if (halfway) {
                // Alternate ins and outs with a flat side at each end
                // and in the centre
                switch (ii) {
                  case 0:
                  case halfway:
                    break;
                  default:
                    out ? centre.add(popOffset)
                        : centre.subtract(popOffset)
                    out = !out
                }

              } else {
                centre.add(popOffset)
              }

              vertices.push(centre) // index + 4 + 4ii

              // Adjust spacing between blocks to account for overrun
              // when printing
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

        // Magnet support
        // The support for the magnet on the acute rhombohedron is
        // created with 9 triangles on the west face, 5 on the east
        // face plus 4 buttress faces, 4 x 2 edges, and a total of 8
        // in the gap.
        // 
        // west<                 east>
        //          9                     8
        //         / \                   / \
        //       26–––E                31–––19
        //       /|  /|\               /|  /|\
        //      / | / | \             / | / | \
        //     /  |/  |  \           /  |/  |  \
        //    23——25——D———B         28——30—18——16
        //    | \ |   | \ |         |   |   |   |
        //  7 22——24  C———A 5       27——29 17———F *  
        //                       3_________________1
        //
        // gap
        //                 30——————18
        //                /  ° • . /
        //           30——25———————D——18
        //          • |\ |        |\ | •
        //        .°  | \|        | \|  °.
        //       33——29——24———————C——17——21
        //                \      / \ 
        //                 \    /   \ 
        //                  \  /     \ 
        //                   \/       \ 
         //                  33———————21
        //
        // buttress
        // 
        //     28—————30       18—————16
        //      |\   / .\       |\   / .\
        //     27.\./.29 \     17.\./..F \
        //       °32____°33      °21____°20
        //
        // south             north
        //       9———8             8———9
        //       |  /|             |  /|
        //       | / |             | / |  normal: angled
        //       |/  |             |/  |
        //       23—28.           .16——B
        //       | / | °•.     .•° | / |          +±yAxis
        //       22—27———32   20———F———A
  
        // east face (tip side)
        //                                8
        //                               / \
        //                             31–––19
        //                             /|  /|\
        //                            / | / | \
        //                           /  |/  |  \
        //                          28——30—18——16

        normal = normalMap.centroidToTip
        faceIndices.push([8, 31, 19])
        faceNormals.push(normal)
        faceIndices.push([16, 19, 18])
        faceNormals.push(normal)
        faceIndices.push([18, 19, 30])
        faceNormals.push(normal)
        faceIndices.push([19, 31, 30])
        faceNormals.push(normal)
        faceIndices.push([28, 30, 31])
        faceNormals.push(normal)

        // angled buttress faces
        //     28—————30       18————16
        //       \   / \        \   / \
        //        \ /   \        \ /   \
        //        32—————33       21————20

        normal = normalMap.butt
        faceIndices.push([16, 21, 20])
        faceNormals.push(normal)
        faceIndices.push([18, 21, 16])
        faceNormals.push(normal)
        faceIndices.push([28, 32, 30])
        faceNormals.push(normal)
        faceIndices.push([30, 32, 33])
        faceNormals.push(normal)
        
        // west face (normals pointing into screen)
        //          9
        //         / \
        //       26–––E             
        //       /|  /|\
        //      / | / | \
        //     /  |/  |  \
        //    23——25——D———B
        //    | \ |   | \ |
        //    22——24  C———A
      
        normal = normalMap.tipToCentroid
        faceIndices.push([9, 14, 26])
        faceNormals.push(normal)
        faceIndices.push([10, 13, 11])
        faceNormals.push(normal)
        faceIndices.push([11, 13, 14])
        faceNormals.push(normal)
        faceIndices.push([12, 13, 10])
        faceNormals.push(normal)
        faceIndices.push([13, 25, 14])
        faceNormals.push(normal)
        faceIndices.push([14, 25, 26])
        faceNormals.push(normal)
        faceIndices.push([22, 23, 24])
        faceNormals.push(normal)
        faceIndices.push([23, 25, 24])
        faceNormals.push(normal)
        faceIndices.push([25, 23, 26])
        faceNormals.push(normal)

        // gap
        //                 30——————18
        //                /  ° • . /
        //           30——25———————D——18
        //          • |\ |        |\ | •
        //        .°  | \|        | \|  °.
        //       33——29——24———————C——17——21
        //                \      / \ 
        //                 \    /   \ 
        //                  \  /     \ 
        //                   \/       \ 
        //                   33———————21
        
        // north side
        normal = normalMap._yAxis
        faceIndices.push([12, 17, 13])
        faceNormals.push(normal)
        faceIndices.push([13, 17, 18])
        faceNormals.push(normal)
        faceIndices.push([17, 21, 18])
        faceNormals.push(normal)
        // south side
        normal = normalMap.yAxis
        faceIndices.push([24, 25, 30])
        faceNormals.push(normal)
        faceIndices.push([24, 30, 29])
        faceNormals.push(normal)
        faceIndices.push([29, 30, 33])
        faceNormals.push(normal)
        // bottom
        normal = normalMap.zAxis
        faceIndices.push([12, 24, 33])
        faceNormals.push(normal)
        faceIndices.push([12, 32, 21])
        faceNormals.push(normal)
        // gap top
        normal = normalMap._zAxis
        faceIndices.push([13, 18, 30])
        faceNormals.push(normal)
        faceIndices.push([13, 30, 25])
        faceNormals.push(normal)

        // edges  
        // south             north
        //       9———8             8———9
        //       |  /|             |  /|
        //       | / |             | / |  normal: xxxthSide
        //       |/  |             |/  |
        //       23—28.           .16——B
        //       | / | °•.     .•° | / |          +±yAxis
        //       22—27———32   20———F———A

        normal = normalMap.southSide
        faceIndices.push([8, 9, 23])
        faceNormals.push(normal)
        faceIndices.push([8, 23, 28])
        faceNormals.push(normal)
        normal = normalMap.yAxis
        faceIndices.push([22, 28, 23])
        faceNormals.push(normal)
        faceIndices.push([22, 27, 28])
        faceNormals.push(normal)
        faceIndices.push([27, 32, 28])
        faceNormals.push(normal)

        normal = normalMap.northSide
        faceIndices.push([8, 9, 16])
        faceNormals.push(normal)
        faceIndices.push([9, 16, 11])
        faceNormals.push(normal)
        normal = normalMap._yAxis
        faceIndices.push([10, 11, 15])
        faceNormals.push(normal)
        faceIndices.push([11, 16, 15])
        faceNormals.push(normal)
        faceIndices.push([15, 16, 20])
        faceNormals.push(normal)

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
        index = 34

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

      createSTL(name, vertices, faceIndices, faceNormals)
    })()

    function createSTL(name, vertices, faceIndices, faceNormals){
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
    }
  }

  function e(number) {
    return (Math.round(number * 1000) / 1000) //.toExponential()
  }  
})()