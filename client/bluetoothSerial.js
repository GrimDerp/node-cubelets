var util = require('util')
var BluetoothSerialPort = require('bluetooth-serial-port').BluetoothSerialPort
var Scanner = require('../scanner')
var Connection = require('../connection')
var Client = require('../client')

var BluetoothSerialScanner = function (opts) {
  Scanner.call(this)

  this._getDevices = function (callback) {
    var serialPort = new BluetoothSerialPort()
    serialPort.listPairedDevices(function (pairedDevices) {
      var devices = []
      pairedDevices.forEach(function (pairedDevice) {
        var name = pairedDevice.name
        if (name.indexOf('Cubelet') === 0) {
          devices.push(pairedDevice)
        }
      })
      callback(devices)
    })
  }

  this._compareDevice = function (device, otherDevice) {
    return device.address == otherDevice.address
  }
}

util.inherits(BluetoothSerialScanner, Scanner)

var BluetoothSerialConnection = function (device, opts) {
  Connection.call(this, device, opts)
  
  var address = device['address'] || '00:00:00:00:00:00'
  var channelID = 0
  var services = device['services']
  if (typeof device['channelID'] !== 'undefined') {
    channelID = device.channelID
  } else if (Array.isArray(services) && services.length > 0) {
    channelID = services[0].channelID
  }

  var stream = this
  var serialPort = null
  var isOpen = false

  this._read = function (n) {
    // do nothing
  }

  this._write = function (chunk, enc, next) {
    if (serialPort) {
      serialPort.write(chunk, next)
    }
  }

  this._open = function (callback) {
    callback = callback || Function()
    if (serialPort) {
      callback(null)
    } else {
      serialPort = new BluetoothSerialPort()

      serialPort.on('error', function (err) {
        stream.emit('error', err)
      })

      serialPort.connect(address, channelID, function (err) {
        if (err) {
          callback(err)
        } else {
          isOpen = true

          serialPort.on('data', function (chunk) {
            stream.push(chunk)
          })

          serialPort.once('closed', function () {
            isOpen = false
            stream.close()
          })

          serialPort.once('failure', function () {
            isOpen = false
            stream.close()
          })

          callback(null)
        }
      })
    }
  }

  this._close = function (callback) {
    callback = callback || Function()
    if (!serialPort) {
      callback(null)
    } else {
      var sp = serialPort
      serialPort = null
      sp.removeAllListeners('data')
      sp.removeAllListeners('closed')
      sp.removeAllListeners('failure')
      sp.removeAllListeners('error')
      if (isOpen) {
        sp.once('closed', cleanup)
        sp.close()
      } else {
        cleanup()
      }
      function cleanup() {
        isOpen = false
        sp = null
        callback(null)
      }
    }
  }
}

util.inherits(BluetoothSerialConnection, Connection)

module.exports = Client(new BluetoothSerialScanner(), BluetoothSerialConnection)
