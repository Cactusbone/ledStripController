//https://github.com/voodootikigod/node-serialport

var logule = require('logule').init(module);
var SerialPort = require("serialport");

/*
 a renvoyer a chaque fois.

 buffer[0] = 'A';                                // Magic word
 buffer[1] = 'd';
 buffer[2] = 'a';
 buffer[3] = byte((N_LEDS - 1) >> 8);            // LED count high byte
 buffer[4] = byte((N_LEDS - 1) & 0xff);          // LED count low byte
 buffer[5] = byte(buffer[3] ^ buffer[4] ^ 0x55); // Checksum

 puis RGB/RGB/RGB/RGB & co
 */

var led_quantity;
var buffer;

var lastAck;
var serialPort;

module.exports = {
    write: write,
    initLeds: initLeds,
    initSerialPort: initSerialPort,
    getPorts: function (cb) {
        SerialPort.list(cb)
    },
};

function initLeds(quantity) {
    led_quantity = quantity;
    buffer = new Buffer(led_quantity * 3 + 6);
    buffer[0] = 0x41;//A                                // Magic word
    buffer[1] = 0x64;//d
    buffer[2] = 0x61;//a
    buffer[3] = (led_quantity - 1) >> 8;            // LED count high byte
    buffer[4] = (led_quantity - 1) & 0xff;          // LED count low byte
    buffer[5] = buffer[3] ^ buffer[4] ^ 0x55; // Checksum
}

function initSerialPort(port) {
    if (serialPort)
        serialPort.close();
    lastAck = null;
    serialPort = new SerialPort.SerialPort(port, {
        baudRate: 115200
    });
    serialPort.on("open", function () {
        logule.info('open on', port);
        serialPort.on('data', function (data) {
            if (/^Ada/.test(data)) {
                lastAck = Date.now();
            }
        });
    });
    serialPort.on('error', function (err) {
        logule.error(err);
    });
    serialPort.on("close", function (data) {
        logule.info("serial port closed", data);
    });
}

function write(data) {
    if (!lastAck || !serialPort || !buffer)
        return;

    // it looks like (empirically) format is bgr
    for (var i = 0; i < led_quantity; i++) {
        var pos = 6 + i * 3;
        var r = pos + 0;
        var b = pos + 1;
        var g = pos + 2;
        if (data[i]) {
            buffer[r] = data[i].r;
            buffer[g] = data[i].g;
            buffer[b] = data[i].b;
        } else {
            buffer[r] = 0;
            buffer[g] = 0;
            buffer[b] = 0;
        }
    }

    serialPort.write(buffer, function (err, results) {
        if (err)
            logule.error('err ' + err);
        else
            logule.debug(results);
    });
}