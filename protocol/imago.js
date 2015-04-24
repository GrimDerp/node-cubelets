var Protocol = require('../protocol')
var xtend = require('xtend/mutable')

var messages = {
  SetBlockValueCommand: require('../command/setBlockValue'),
  SetLEDColorCommand: require('../command/setLEDColor'),
  SetLEDRGBCommand: require('../command/setLEDRGB'),
  GetConfigurationRequest: require('../request/getConfiguration'),
  GetConfigurationResponse: require('../response/getConfiguration'),
  GetModeRequest: require('../request/getMode'),
  GetModeResponse: require('../response/getMode'),
  SetModeRequest: require('../request/setMode'),
  SetModeResponse: require('../response/setMode'),
  GetBlockValueRequest: require('../request/getBlockValue'),
  GetBlockValueResponse: require('../response/getBlockValue'),
  SetBlockValueRequest: require('../request/setBlockValue'),
  SetBlockValueResponse: require('../response/setBlockValue'),
  RegisterBlockValueEventRequest: require('../request/registerBlockValueEvent'),
  RegisterBlockValueEventResponse: require('../response/registerBlockValueEvent'),
  GetAllBlocksRequest: require('../request/getAllBlocks'),
  GetAllBlocksResponse: require('../response/getAllBlocks'),
  GetNeighborBlocksRequest: require('../request/getNeighborBlocks'),
  GetNeighborBlocksResponse: require('../response/getNeighborBlocks'),
  WriteBlockMessageRequest: require('../request/writeBlockMesage'),
  WriteBlockMessageResponse: require('../response/writeBlockMesage'),
  EchoRequest: require('../request/echo'),
  EchoResponse: require('../response/echo'),
  GetHandshakeRateRequest: require('../request/getHandshakeRate'),
  GetHandshakeRateResponse: require('../response/getHandshakeRate'),
  DebugEvent: require('../event/debug'),
  BlockValueEvent: require('../event/blockValue'),
  ReadBlockMessageEvent: require('../event/readBlockMessage'),
  FlashProgressEvent: require('../event/flashProgressEvent')
}

module.exports = new Protocol({
  commands: [
    [0x41, messages.SetBlockValueCommand],
    [0x42, messages.SetLEDColorCommand],
    [0x43, messages.SetLEDRGBCommand]
  ],
  requests: [
    [0x01, messages.GetConfigurationRequest],
    [0x02, messages.GetModeRequest],
    [0x03, messages.SetModeRequest],
    [0x04, messages.GetBlockValueRequest],
    [0x05, messages.SetBlockValueRequest],
    [0x06, messages.RegisterBlockValueEventRequest],
    [0x07, messages.GetAllBlocksRequest],
    [0x08, messages.GetNeighborBlocksRequest],
    [0x09, messages.WriteBlockMessageRequest],
    [0x10, messages.EchoRequest],
    [0x11, messages.GetHandshakeRateRequest],
    [0x20, messages.GetMemoryTableRequest],
    [0x21, messages.UploadToMemoryRequest],
    [0x22, messages.FlashMemoryToBlockRequest]
  ],
  responses: [
    [0x81, messages.GetConfigurationResponse],
    [0x82, messages.GetModeResponse],
    [0x83, messages.SetModeResponse],
    [0x84, messages.GetBlockValueResponse],
    [0x85, messages.SetBlockValueResponse],
    [0x86, messages.RegisterBlockValueEventResponse],
    [0x87, messages.GetAllBlocksResponse],
    [0x88, messages.GetNeighborBlocksResponse],
    [0x89, messages.WriteBlockMessageResponse],
    [0x90, messages.EchoResponse],
    [0x91, messages.GetHandshakeRateResponse],
    [0xA0, messages.GetMemoryTableResponse],
    [0xA1, messages.UploadToMemoryResponse],
    [0xA2, messages.FlashMemoryToBlockResponse]
  ],
  events: [
    [0xE0, messages.DebugEvent],
    [0xE1, messages.BlockValueEvent],
    [0xE2, messages.ReadBlockMessageEvent],
    [0xE3, messages.FlashProgressEvent]
  ]
})

module.exports.merge = function (obj) {
  var merged = xtend(obj, messages)
  module.exports.messages = messages
  return merged
}
