var _ = require('underscore');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
var async = require('async');
var logule = require('logule').init(module);

var strip = require("./strip8806.js");
var sound = require("./sound.js");

var buffer = [];

var movieFolder = path.join(__dirname, "movies");
fs.mkdir(movieFolder, function (err) {
    if (err && err.code != "EEXIST")
        logule.error(err);
});

module.exports = {
    playFile: playFile,
    playColor: playColor,
    playRandom: playRandom,
    playMusic: playMusic,
    getStatus: getStatus,
    getMovies: getMovies,
    getPorts: strip.getPorts,
    initLeds: initLeds,
    initSerialPort: initSerialPort,
    onBuffer: onBuffer,
};

var status = {
    ledQuantity: 240,
    mode: 'music',
    color: null,//for color mode
    stableMode: 'music',//to resume to when file mode ends.
};

initLeds(status.ledQuantity);

function initLeds(quantity) {
    status.ledQuantity = quantity;
    strip.initLeds(quantity);
}

function initSerialPort(port) {
    status.port = port;
    strip.initSerialPort(port);
}

var onBufferCb = [];

function onBuffer(cb) {
    onBufferCb.push(cb);
}

function writeBuffer() {
    strip.write(buffer);
    _.each(onBufferCb, function (cb) {
        cb(buffer);
    });
}

var timeout;//to cancel file mode when another mode is selected

setInterval(regularCheck, 10);

function regularCheck() {
    switch (status.mode) {
        case 'random':
            fillRandomBuffer();
            writeBuffer();
            break;
        case 'color':
            fillBuffer(status.color);
            writeBuffer();//act as a strip keepalive
            break;
        case 'music':
            fillMusicBuffer();
            writeBuffer();
            break;
        case 'file':
            //do nothing
            break;
    }
}

function getStatus() {
    return status;
}

function cancelDynamicIfNeeded() {
    if (timeout) {
        //i think i have a leak when clearing, with the async loop being incomplete
        clearTimeout(timeout);
        timeout = null;
    }
}

function getMovies(cb) {
    fs.readdir(movieFolder, function (err, files) {
        cb(err, _.flatten(_.map(files, function (file) {
            if (/\.json\.gz$/.test(file))
                return file.replace(/\.json\.gz$/, "");
            else
                return null;
        })));
    });
}

function playMusic() {
    cancelDynamicIfNeeded();
    status.mode = 'music';
    status.stableMode = 'music';
}

function fillMusicBuffer() {
    var soundBuffer = sound.getBuffer();
    //todo base current value on color
    var preparedData = [];
    _.each(soundBuffer, function (val) {
        var finalValue = Math.abs(Math.round(val * 256));
        finalValue = Math.max(0, finalValue);
        finalValue = Math.min(255, finalValue);
        if (val > 0)
            preparedData.push({r: finalValue, g: 0, b: 0});
        else
            preparedData.push({r: 0, g: finalValue, b: 0 });
    });
    buffer = extendOrRetractData(preparedData);
}

function playFile(fileName) {
    cancelDynamicIfNeeded();
    status.mode = 'file';
    var data = fs.readFileSync(path.join(movieFolder, fileName + ".json.gz"), {});
    zlib.gunzip(data, function (err, decoded) {
        if (err)
            logule.error(err);
        else {
            if (status.mode != 'file')
                return;
            var json = JSON.parse(decoded);
            var frame = 0;
            var framecount = json.data.length / json.framelength;
            var sleepTime = json.duration * 1000 / framecount;
            async.whilst(function () {
                return frame < framecount
            }, function (cb) {
                var delta = frame * json.framelength;
                buffer = extendOrRetractData(json.data.slice(delta, delta + json.framelength));
                writeBuffer();
                frame++;
                timeout = setTimeout(cb, sleepTime);
            }, function (err) {
                if (err)
                    logule.error(err);
                logule.info("playback complete");
                status.mode = status.stableMode;
                timeout = null;
            });
        }
    });
}

function extendOrRetractData(data) {
    //todo extend array to status.ledQuantity
    if (data.length < status.ledQuantity)
        throw new Error('retract not yet supported');
    if (data.length == status.ledQuantity)
        return data;

    var dataLengthPerLed = Math.floor(data.length / status.ledQuantity);
    var result = [];
    var currentValue = {r: 0, g: 0, b: 0};
    _.each(data, function (val, index) {
        currentValue.r += val.r;
        currentValue.g += val.g;
        currentValue.b += val.b;
        if (index % dataLengthPerLed == 0) {
            currentValue.r = Math.round(currentValue.r / dataLengthPerLed);
            currentValue.g = Math.round(currentValue.g / dataLengthPerLed);
            currentValue.b = Math.round(currentValue.b / dataLengthPerLed);
            result.push(currentValue);
            currentValue = {r: 0, g: 0, b: 0};
        }
    });

    return result;
}

function playColor(color) {
    cancelDynamicIfNeeded();
    status.stableMode = 'color';
    status.mode = 'color';
    status.color = color;
}

function fillBuffer(color) {
    for (var i = 0; i < status.ledQuantity; i++) {
        buffer[i] = {r: color.r, g: color.g, b: color.b};
    }
}

function playRandom() {
    cancelDynamicIfNeeded();
    status.mode = 'random';
    status.stableMode = 'random';
}

function rand255() {
    return Math.floor(Math.random() * 255);
}

function toRandomColor() {
    return{
        r: rand255(),
        g: rand255(),
        b: rand255()
    }
}

function fillRandomBuffer() {
    for (var i = 0; i < status.ledQuantity; i++) {
        buffer[i] = toRandomColor();
    }
}