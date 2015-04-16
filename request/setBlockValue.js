var util = require('util')
var Message = require('../message')

var SetBlockValueRequest = function (id, value) {
  Message.call(this)
  this.id = id
  this.value = value
}

util.inherits(SetBlockValueRequest, Message)

SetBlockValueRequest.prototype.encodeBody = function () {
  var encodedID = Encoder.encodeID(this.id)
  return new Buffer([
    encodedID.readUInt8(0),
    encodedID.readUInt8(1),
    encodedID.readUInt8(2),
    this.value
  ])
}

module.exports = SetBlockValueRequest
