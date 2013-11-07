var _ = require('underscore');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
var async = require('async');
var logule = require('logule').init(module);

var strip = require("./strip8806.js");

var buffer = [];

var movieFolder = path.join(__dirname, "movies");
//todo check if it exists

module.exports = {
    playFile: playFile,
    playColor: playColor,
    playRandom: playRandom,
    getStatus: getStatus,
    getMovies: getMovies,
    getPorts: strip.getPorts,
    initLeds: initLeds,
    initSerialPort: initSerialPort,
    onBuffer: onBuffer,
};

var status = {
    ledQuantity: 240,
    mode: 'random',
    color: null,//for color mode
    stableMode: 'random',//to resume to when file mode ends.
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

setInterval(regularCheck, 50);

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
        case 'file':
            //do nothing
            break;
    }
}

function getStatus() {
    return status;
}

function cancelFileIfNeeded() {
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

function playFile(fileName) {
    cancelFileIfNeeded();
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
                buffer = prepareData(json.data.slice(delta, delta + json.framelength), json.framelength);
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

    function prepareData(data, framelength) {
        if (framelength != status.ledQuantity)
            throw new Error('change length not yet supported');
        //todo extend array to status.ledQuantity
        return data;
    }
}

function playColor(color) {
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
    cancelFileIfNeeded();
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