var util = require('util')
var events = require('events')
var async = require('async')
var ImagoProtocol = require('../protocol/imago')
var ImagoProgram = ImagoProtocol.Program
var ImagoFlash = ImagoProtocol.Flash
var cubelets = require('../index')
var Protocol = cubelets.Protocol
var Block = cubelets.Block
var BlockTypes = cubelets.BlockTypes
var MCUTypes = cubelets.MCUTypes
var __ = require('underscore')
var fs = require('fs')

var UpgradeBootloader = function (client) {
  var self = this
  events.EventEmitter.call(this)

  var targetBlock = null
  var bootstrapHex = null
  var applicationHex = null
  var flashTypeId = null

  this.start = function (block, _bootstrapHex, _applicationHex) {
    applicationHex = _applicationHex
    bootstrapHex = _bootstrapHex
    targetBlock = block
    var tasks = [	flashUpgradeBootloader, // Flash the 'deep-memory bootloader'
      resetBT, // Reset the BT block to clear the RT table
      wait, // Wait for the BT block to reset
      waitForOs4Block, // Make sure the block shows up
      flashModifiedPicBootstrap, // Flash the latest bootloader and verification hex
      resetBT, // Reset to clear routing table
      wait, // Wait for the bluetooth block to reset
      waitForOs4Block, // Make sure the target block shows back up.
      flashOs4Application, // Flash the latest application
      resetBT,
      wait,
      waitForOs4Block,
      done]

    self.emit('upgradeBootloader', {'status': 'start'})
    async.waterfall(tasks, function (err, result) {
      if (err) {
        // Emit Finished with error
        self.emit('upgradeBootloader', {'status': 'error', 'error': err})
      }
      self.emit('upgradeBootloader', {'status': 'success'})
      return
    })
  }

  function flashUpgradeBootloader (callback) { // TODO
    // Emit starting flash deep memory bootloader
    self.emit('flashDeepMemoryBootloader', {'status': 'start'})

    // TODO: Find better way to manage hex path: Maybe these should be passed in?
    var hex = fs.readFileSync('./crc_upgrade/hex/crc_update_bootloader/crc_update_bootloader.hex')
    var program = new ImagoProgram(hex)
    var flash = new ImagoFlash(client, {
      skipSafeCheck: true
    })

    var totalSize = program.data.length
    var listener = function (e) {
      if (e instanceof Protocol.messages.FlashProgressEvent) {
        // Emit Flashing Progress events
        self.emit('flashDeepMemoryBootloader', {'status': 'flashProgress', 'progress': (e.progress / totalSize)})
      }
    }

    // Register listener to lookup for progress events
    client.on('event', listener)

    flash.programToBlock(program, targetBlock, function (err) {
      client.removeListener('event', listener)
      if (err) {
        callback(err)
        return
      }
      // Emit message successfully flashed deep memory bootloader
      self.emit('flashDeepMemoryBootloader', {'status': 'success'})
      callback(null)
    })

    flash.on('progress', function (e) {
      self.emit('flashDeepMemoryBootloader', {'status': 'uploadProgress', 'progress': (e.progress / totalSize)})
    })
  }

  function resetBT (callback) {
    client.sendCommand(new ImagoProtocol.messages.ResetCommand())
    callback(null, 1000)
  }
  function wait (howLong, callback) {
    setTimeout(function () {
      callback(null)
    }, howLong)
  }
  function waitForOs4Block (callback) {
    getAllBlocks(function (err, blocks) {
      if (err) {
        callback(err)
        return
      }

      var found = false

      __.each(blocks, function (block) {
        // console.log("Found: " + formatBlockName(block))

        // We have found the target block
        if (targetBlock.getBlockId() === block.getBlockId()) {
          if (flashTypeId === null && blocks[0].getBlockType() !== BlockTypes.UNKNOWN) {
            flashTypeId = block.getBlockType().typeId
          }
          found = true
          callback(null, block)
          return
        }
      })

      // Target block was not found, wait for a block added event before trying again
      if (found === false) {
        client.once('event', function (message) {
          if (message instanceof Protocol.messages.BlockAddedEvent) {
            waitForOs4Block(callback)
            return
          }
        })
      }
    })
  }
  function getAllBlocks (callback) {
    client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function (err, response) {
      if (err) {
        callback(err)
        return
      }
      if (response.blocks) {
        var blocks = []
        __.each(response.blocks, function (block) {
          var b = new Block(block.blockId, block.hopCount, Block.blockTypeForId(block.blockTypeId))
          b._mcuType = MCUTypes.PIC
          blocks.push(b)
        })
        callback(null, blocks)
      } else {
        callback(null, [])
      }
    })
  }
  function flashModifiedPicBootstrap (block, callback) {
    // Emit event flashing new bootloader and verification
    self.emit('flashBootloader', {'status': 'start'})

    var blockType = Block.blockTypeForId(flashTypeId)
    block._blockType = blockType

    var program = new ImagoProgram(bootstrapHex)
    var flash = new ImagoFlash(client, {
      skipSafeCheck: true
    })

    var totalSize = program.data.length
    var listener = function (e) {
      if (e instanceof Protocol.messages.FlashProgressEvent) {
        // Emit flashing progress event
        self.emit('flashBootloader', {'status': 'flashProgress', 'progress': (e.progress / totalSize)})
      }
    }

    client.on('event', listener)

    flash.programToBlock(program, block, function (err) {
      client.removeListener('event', listener)
      if (err) {
        callback(err)
        return
      }
      // Emit success
      self.emit('flashBootloader', {'status': 'success'})
      callback(null)
    })

    flash.on('progress', function (e) {
      // Emit upload progress
      self.emit('flashBootloader', {'status': 'uploadProgress', 'progress': (e.progress / e.total)})
    })
  }
  function flashOs4Application (block, callback) {
    self.emit('flashApplication', {'status': 'start'})

    var blockType = Block.blockTypeForId(flashTypeId)
    targetBlock._blockType = blockType

    // Flash the usual application
    var program = new ImagoProgram(applicationHex)
    var flash = new ImagoFlash(client)

    var totalSize = program.data.length
    var listener = function (e) {
      if (e instanceof Protocol.messages.FlashProgressEvent) {
        // Emit flashing progress event
        self.emit('flashApplication', {'status': 'flashProgress', 'progress': (e.progress / totalSize)})
      }
    }
    client.on('event', listener)

    flash.on('progress', function (e) {
      // Emit upload progress event
      self.emit('flashApplication', {'status': 'uploadProgress', 'progress': (e.progress / e.total)})
    })
    flash.programToBlock(program, targetBlock, function (err) {
      client.removeListener('event', listener)
      if (err) {
        callback(err)
        return
      }
      self.emit('flashApplication', 'success')
      callback(null)
    })
  }

  function done (block, callback) {
    callback(null, 'done')
  }
}

util.inherits(UpgradeBootloader, events.EventEmitter)
module.exports = UpgradeBootloader
