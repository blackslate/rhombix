function Vector(x, y, z) {
  this.x = x || 0
  this.y = y || 0
  this.z = z || 0
}

Vector.prototype.magnitude = function magnitude() {
  return Math.sqrt(this.x * this.x
                 + this.y * this.y
                 + this.z * this.z)
}

Vector.prototype.normalize = function normalize(normalize) {
  var magnitude = this.magnitude()
  this.x /= magnitude
  this.y /= magnitude
  this.z /= magnitude

  return this
}

Vector.prototype.add = function add(vector) {
  this.x += vector.x
  this.y += vector.y
  this.z += vector.z

  return this
}

Vector.prototype.subtract = function subtract(vector) {
  this.x -= vector.x
  this.y -= vector.y
  this.z -= vector.z

  return this
}

Vector.prototype.cross = function cross(vector) {
  var x = this.y * vector.z - this.z * vector.y
  var y = this.z * vector.x - this.x * vector.z
  var z = this.x * vector.y - this.y * vector.x

  return new Vector(x, y, z)
}

Vector.prototype.dot = function dot(vector) {
  return this.x * vector.x
       + this.y * vector.y
       + this.z * vector.z
}

Vector.prototype.clone = function clone() {
  return new Vector(this.x, this.y, this.z)
}

Vector.prototype.copy = function copy(vector) {
  this.x = vector.x
  this.y = vector.y
  this.z = vector.z

  return this
}

Vector.prototype.set = function set(x, y, z) {
  this.x = x
  this.y = y
  this.z = z

  return this
}

Vector.prototype.setLength = function setLength(length) {
  var magnitude = this.magnitude()

  this.x = this.x * length / magnitude
  this.y = this.y * length / magnitude
  this.z = this.z * length / magnitude    

  return this
}

Vector.prototype.scalarMultiply = function scalarMultiply(scalar) {
  this.x *= scalar
  this.y *= scalar
  this.z *= scalar   

  return this
}

Vector.prototype.distanceTo = function distanceTo(point) {
  var x = point.x - this.x
  var y = point.y - this.y
  var z = point.z - this.z

  return Math.sqrt(x * x + y * y + z * z)
}

Vector.prototype.angleBetween = function angleBetween(vector) {
  var magnitude = this.magnitude() * vector.magnitude()
  return Math.acos(this.dot(vector) / magnitude)
}

Vector.prototype.reverse = function reverse(vector) {
  this.x = -this.x
  this.y = -this.y
  this.z = -this.z

  return this
}

Vector.prototype.toString = function toString() {
  return "{ x: " + this.x + ", y: " + this.y + ", z: " + this.z + " }"
}

Vector.prototype.toArray = function toArray() {
  return [this.x, this.y, this.z]
}

function Line(point, direction, fromPoints) {
  direction = direction || new Vector(0, 0, 0)

  this.point = point || new Vector(0, 0, 0)

  if (fromPoints) {
    direction = direction.clone()
               .subtract(point)
               .normalize()
  }

  this.direction = direction
}

Line.prototype.clone = function clone() {
  return new Line(this.point, this.direction)
}

Line.prototype.setPoint = function setPoint(point) {
  this.point = point

  return this
}

Line.prototype.setDirection = function setDirection(direction) {
  this.direction = direction

  return this
}

Line.prototype.closestPointTo = function(line) {
  // http://morroworks.com/Content/Docs/Rays%20closest%20point.pdf
  var temp = line.point.clone().subtract(this.point)
  var thisDotLine = this.direction.dot(line.direction)
  var thisDotThis = this.direction.dot(this.direction)
  var thisDotThat = this.direction.dot(temp)
  var lineDotThat = line.direction.dot(temp)
  var lineDotLine = line.direction.dot(line.direction)

  var t = (thisDotThat * lineDotLine - thisDotLine * lineDotThat)
        / (thisDotThis * lineDotLine - thisDotLine * thisDotLine)

  temp.copy(this.direction).scalarMultiply(t).add(this.point)

  return temp
}

Line.prototype.toString = function toString() {
  return "point: " + this.point.toString()
     + ", direction" + this.direction.toString()
}

function Plane(point, pointOrNormal, pointOrUndefined) {
  if (!pointOrUndefined) {
    // Assume point + normal
    if (!pointOrNormal) {
      pointOrNormal = new Vector(0, 0, 1)
    }

    if (!point) {
      point = new Vector(0, 0, 0)
    }
  } else {
    // Assume all arguments are vectors, in anticlockwise order
    pointOrNormal = pointOrNormal.clone().subtract(point)
    pointOrUndefined = pointOrUndefined.clone().subtract(point)
    pointOrNormal = pointOrNormal.cross(pointOrUndefined)
                                 .normalize()
  }

  this.point = point
  this.normal = pointOrNormal
}

Plane.prototype.intersectsLine = function intersectsLine(line) {
  var vector = this.point.clone().subtract(line.point)
  var hit = this.normal.dot(vector) 
          / this.normal.dot(line.direction)
  vector.copy(line.point)
        .add(line.direction.clone()
                           .scalarMultiply(hit))

  return vector
}

Plane.prototype.toString = function toString() {
  return "{ point: " + this.point.toString()
       + ", normal: " + this.normal.toString() + " }"
}

;(function tests(){
  
  // v = new Vector()
  // console.log("v =", "v =", v.toString())
  // w = new Vector(3, 4, 12)
  // console.log("w =", w)
  // v.copy(w)
  // console.log("v.copy(w): v =", v.toString())
  // u = new Vector(1, 0, 0)
  // console.log("u =", u.toString())
  // v.set(0, 1, 0)
  // console.log("v =", v.toString())
  // u.cross(v)
  // console.log("u.cross(v): u =", u.toString())
  // console.log("magnitudes: "
  //            , u.magnitude()
  //            , v.magnitude()
  //            , w.magnitude())

  // console.log("u.dot(v) =", u.dot(v))

  // w.normalize()
  // console.log("w.normalize(): w =", w.toString())
  // console.log(w.magnitude())
  // w.setLength(13)
  // console.log("w.setLength(13)", w.toString(), w.magnitude())

  // u.add(v)
  // console.log("u.add(v) [0, 1, 1]", u.toString(), u.magnitude())

  // u.normalize()
  // console.log("u.normalize(): u=", u.toString(), u.magnitude())

  // console.log("u.dot(v) =", u.dot(v))

  // var a = new Line(new Vector(0, 0, 0), new Vector(1, 1, 0))
  // var b = new Line(new Vector(2, 0, 0), new Vector(0, 1, 0))
  // var c = a.closestPointTo(b)

  // console.log(c.toString())

  // var u = new Vector(10, 0, 0)
  // var v = new Vector(0, 10, 0)
  // var w = new Vector(Math.cos(Math.PI/6), 0, Math.sin(Math.PI/6))
  // var angle = u.angleBetween(v)
  // console.log(angle, angle *180 / Math.PI)
  // angle = u.angleBetween(w)
  // console.log(angle, angle *180 / Math.PI)
  // angle = v.angleBetween(w)
  // console.log(angle, angle *180 / Math.PI)
  // console.log(u.distanceTo(v), u.toString(), v.toString())
  
  // var plane = new Plane(new Vector(0, 0, 0)
  //                        , new Vector(0, 0, 1))
  // var line = new Line(new Vector(1, 1, 1)
  //                       , new Vector(1, 1, 1))
  // console.log(plane.toString(), line.toString())
  // console.log(plane.intersectsLine(line))
})()


module.exports = {
  Vector: Vector
, Line: Line
, Plane: Plane
}