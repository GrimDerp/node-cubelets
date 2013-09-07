if (process.argv.length < 3) {
    console.log('Usage: node console.js SERIALPORT');
    return;
}

var SerialPort = require('serialport').SerialPort;
var ResponseParser = require('./parser');

var device = process.argv[2];
var connection = new SerialPort(device, { baudrate: 38400 });

connection.on('open', function() {
    console.log('Connected.');

    // Create a parser to interpret responses.
    var parser = new ResponseParser();

    // Process responses
    parser.on('response', function(response) {
        console.log('Response:', response);
    });

    // Process extra data
    parser.on('extra', function(data) {
        console.log('Extra:', data);
    });

    // Process raw data
    parser.on('raw', function(data) {
        console.log('Raw:', data);
    });

    // Once connection is open, begin listening for data.
    connection.on('data', function(data) {
        parser.parse(data);
    });

    // Write data to serial connection.
    keyboard.on('data', function(data) {
        connection.write(data);
    });

    // Respond to control events
    keyboard.on('data', function(data) {
        var key = data.readUInt8(0);
        switch (key) {
            case 0x04:
                // Disconnect
                connection.close();
                break;
            case 0x12:
                // Toggle raw
                var raw = !parser.getRawMode();
                console.log('Raw Mode:', raw ? 'On' : 'Off');
                parser.setRawMode(raw);
                break;
        }
    });
});

connection.on('close', function() {
    console.log('Goodbye.');
    process.exit(0);
});

connection.on('error', function(e) {
    console.error(e);
    process.exit(1);
});

// Take keyboard input one character at a time.
var keyboard = process.stdin;
keyboard.setRawMode(true);
keyboard.resume();