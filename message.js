var assert = require('assert')

var Message = function () {
  this.timestamp = (new Date).getTime()
}

Message.prototype.code = function () {
  return this.constructor.code
}

Message.prototype.decode = function (body) {
  assert(Buffer.isBuffer(body))
}

Message.prototype.encodeHeader = function (sizeOfBody) {
  return new Buffer([
    '<'.charCodeAt(0),
    this.code(),
    sizeOfBody,
    '>'.charCodeAt(0)
  ])
}

Message.prototype.encodeBody = function () {
  return new Buffer(0)
}

Message.prototype.encode = function () {
  var body = this.encodeBody()
  assert(Buffer.isBuffer(body))
  return Buffer.concat([
    this.encodeHeader(body.length),
    body
  ])
}

module.exports = Message
