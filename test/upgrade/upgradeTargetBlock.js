var test = require('tape')
var fs = require('fs')
var config = require('../config')
var cubelets = require('../../index')
var Upgrade = require('../../upgrade')
var Block = require('../../block')
var MCUTypes = require('../../mcuTypes')
var UpgradeProtocol = require('../../protocol/bootstrap/upgrade')
var ClassicProtocol = require('../../protocol/classic')
var ClassicProgram = require('../../protocol/classic/program')
var ClassicFlash = require('../../protocol/classic/flash')
var ImagoProtocol = require('../../protocol/imago')
var InfoService = require('../../services/info')
var __ = require('underscore')

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      var upgrade = new Upgrade(client)

      test('detect bootstrap', function (t) {
        t.plan(3)
        upgrade.detectIfNeeded(function (err, needsUpgrade, firmwareType) {
          t.ifError(err, 'no err')
          t.ok(needsUpgrade, 'needs upgrade')
          t.equal(firmwareType, 2, 'has bootstrap firmware')
        })
      })

      var ignoreBatteryFaceIndex = 4
      var targetFaceIndex = -1

      test('discover an os3 target', function (t) {
        t.plan(1)
        client.on('event', waitForBlockEvent)
        var timer = setTimeout(function () {
          client.removeListener('event', waitForBlockEvent)
          t.fail('no block found events')
        }, 1000)
        function waitForBlockEvent(e) {
          if (e instanceof UpgradeProtocol.messages.BlockFoundEvent) {
            if (e.firmwareType === 0 && e.faceIndex !== ignoreBatteryFaceIndex) {
              targetFaceIndex = e.faceIndex
              clearTimeout(timer)
              client.removeListener('event', waitForBlockEvent)
              t.pass('found os3 target at face ' + targetFaceIndex)
            }
          }
        }
      })

      test('jump to os3', function (t) {
        t.plan(2)
        client.setProtocol(UpgradeProtocol)
        client.sendRequest(new UpgradeProtocol.messages.SetBootstrapModeRequest(0), function (err, response) {
          t.ifError(err)
          client.setProtocol(ClassicProtocol)
          setTimeout(function () {
            t.equals(response.mode, 0, 'jumped to os3')
          }, 2000)
        })
      })

      var targetBlock = null

      test('find os3 blocks', function (t) {
        t.plan(3)
        client.fetchNeighborBlocks(function (err, neighborBlocks) {
          t.ifError(err, 'req ok')
          targetBlock = __(neighborBlocks).find(function (block) {
            return block._faceIndex === targetFaceIndex
          })
          t.ok(targetBlock, 'found target block')
          t.pass('target block id is ' + targetBlock.getBlockId())
        })
      })

      test('look up block info', function (t) {
        t.plan(5)
        var info = new InfoService()
        info.fetchBlockInfo([targetBlock], function (err, infos) {
          t.ifError(err, 'fetch ok')
          t.equal(infos.length, 1, 'has info')
          var info = infos[0]
          targetBlock._blockType = Block.blockTypeForId(info.blockTypeId)
          targetBlock._mcuType = Block.mcuTypeForId(info.mcuTypeId)
          targetBlock._applicationVersion = info.currentFirmwareVersion
          t.ok(targetBlock.getBlockType() !== MCUTypes.UNKNOWN, 'target type is ' + targetBlock.getBlockType().name)
          t.ok(targetBlock.getMCUType() === MCUTypes.PIC, 'target is PIC')
          t.pass('target app version is ' + targetBlock.getApplicationVersion().toString())
        })
      })

      test('bootstrap os3 target', function (t) {
        t.plan(2)
        var hex = fs.readFileSync('./upgrade/hex/drive_bootstrap.hex')
        var program = new ClassicProgram(hex)
        t.ok(program.valid, 'program is valid')
        var flash = new ClassicFlash(program, client)
        flash.toBlock(targetBlock, function (err) {
          t.ifError(err)
        })
        flash.on('progress', function (e) {
          console.log('progress', Math.floor(100 * e.progress / e.total) + '%')
        })
      })

      test('jump to discovery', function (t) {
        t.plan(1)
        client.sendCommand(new ClassicProtocol.messages.ResetCommand())
        setTimeout(function () {
          client.setProtocol(UpgradeProtocol)
          t.pass('upgrade mode')
        }, 500)
      })

      test('discover an os4 target', function (t) {
        t.plan(1)
        client.on('event', waitForBlockEvent)
        var timer = setTimeout(function () {
          client.removeListener('event', waitForBlockEvent)
          t.fail('no block found events')
        }, 1000)
        function waitForBlockEvent(e) {
          if (e instanceof UpgradeProtocol.messages.BlockFoundEvent) {
            if (e.firmwareType === 1 && e.faceIndex === targetFaceIndex) {
              clearTimeout(timer)
              client.removeListener('event', waitForBlockEvent)
              t.pass('found os4 target at face ' + targetFaceIndex)
            }
          }
        }
      })

      test('jump to os4', function (t) {
        t.plan(2)
        client.setProtocol(UpgradeProtocol)
        client.sendRequest(new UpgradeProtocol.messages.SetBootstrapModeRequest(1), function (err, response) {
          t.ifError(err)
          client.setProtocol(ImagoProtocol)
          setTimeout(function () {
            t.equals(response.mode, 1, 'jumped to os4')
          }, 2000)
        })
      })

      var bootstrappedTargetBlock = null

      test('find os4 target block', function (t) {
        t.plan(2)
        client.fetchNeighborBlocks(function (err, neighborBlocks) {
          t.ifError(err, 'req ok')
          bootstrappedTargetBlock = __(neighborBlocks).find(function (block) {
            return targetBlock.getBlockId() === block.getBlockId()
          })
          t.equals(bootstrappedTargetBlock.getFaceIndex(), targetBlock.getFaceIndex(), 'should be same face index')
          t.ok(bootstrappedTargetBlock, 'found bootstrapped target block')
        })
      })

      test('bootstrap os4 target', function (t) {
        t.plan(2)
        var hex = fs.readFileSync('./upgrade/hex/drive_application.hex')
        var program = new ImagoProgram(hex)
        t.ok(program.valid, 'program is valid')
        client.on('event', onProgress)
        function onProgress(e) {
          if (e instanceof ImagoProtocol.messages.FlashProgressEvent) {
            console.log('progress', e.progress + '/?')
          }
        }
        console.log('flashing program to block...')
        client.flashProgramToBlock(program, bootstrappedTargetBlock, function (err) {
          t.ifError(err)
        })
      })

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})