var _ = require('underscore');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
var async = require('async');
var FFT = require('fft');
var onecolor = require('onecolor');
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
    playMusic: playMusic,
    getStatus: getStatus,
    getMovies: getMovies,
    getPorts: strip.getPorts,
    initLeds: initLeds,
    initSerialPort: initSerialPort,
    setMinDelay: setMinDelay,
    setMinValue: setMinValue,
    setRandomColorDelay: setRandomColorDelay,
    onBuffer: onBuffer,
    setSoundConf: setSoundConf,
    getSoundDevices: sound.getDevices,
};

var status = {
    ledQuantity: 240,
    mode: 'music',
    minDelay: 75,
    minValue: 64,
    color: 'random',//for color mode and music
    randomColorDelay: 500,
    stableMode: 'music',//to resume to when file mode ends.
    soundConf: {
        inputChannels: 1,
        outputChannels: 1,
        interleaved: false,
        framesPerBuffer: 2048,
    },
};

sound.applyConf(status.soundConf);
initLeds(status.ledQuantity);

function initLeds(quantity) {
    status.ledQuantity = quantity;
    strip.initLeds(quantity);
}

function initSerialPort(port) {
    status.port = port;
    strip.initSerialPort(port);
}

function setMinValue(value) {
    status.minValue = value;
}

function setRandomColorDelay(value) {
    status.randomColorDelay = value;
}

function setMinDelay(delay) {
    status.minDelay = delay;
}

function setSoundConf(conf) {
    status.soundConf = conf;
    return sound.applyConf(status.soundConf);
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

setInterval(regularCheck, 500);

function regularCheck() {
    switch (status.mode) {
        case 'color':
            fillColorBuffer();
            writeBuffer();//act as a strip keepalive
            break;
        case 'music':
            //bufferLoop handled music side
            break;
        case 'file':
            //do nothing
            break;
    }
}

function fillColorBuffer() {
    if (status.color == "random") {
        fillBuffer(toRandomColor());
    } else if (status.color == "fullRandom") {
        fillRandomBuffer();
    } else {
        fillBuffer(status.color);
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
var timestamp = Date.now();
var lastRandomColor = toOneColor(toRandomColor());
var lastRandomColorTime = Date.now();
sound.onData(function () {
    if (status.mode == "music") {
        var currentTime = Date.now();
        if (currentTime - timestamp < status.minDelay)
            return;//rate limiting
        //115200 baud
        //44100 sampleRate
        //240*3*8=5760 bits pour la lumière par buffer.
        //115200/5760=20 mesures par seconde
        //donc au moins 50ms
        fillMusicBuffer();
        writeBuffer();
        timestamp = currentTime;
    }
});


function fillMusicBuffer() {
    var soundBuffer = sound.getBuffer();
    var fftData = [];
    var preparedData = [];
    var color = status.color;
    if (status.color == "random") {
        color = lastRandomColor;
        var currentTime = Date.now();
        if (currentTime - lastRandomColorTime > status.randomColorDelay) {
            lastRandomColor = toOneColor(toRandomColor());
            lastRandomColorTime = currentTime;
        }
    } else if (status.color != "fullRandom") {
        color = toOneColor(color);
    }
    var fft = new FFT.complex(status.ledQuantity, false);
    fft.simple(fftData, soundBuffer, 'real');
//    fftData = fftData.slice(0, 64);
    _.each(fftData, function (val) {
        var finalValue = Math.abs(val) * 256;
        finalValue = Math.max(0, finalValue);
        finalValue = Math.min(255, finalValue);
        if (finalValue < status.minValue)
            finalValue = 0;
        if (status.color == "fullRandom")
            preparedData.push(fromOneColor(toOneColor(toRandomColor()).value(finalValue / 256)));
        else
            preparedData.push(fromOneColor(color.value(finalValue / 256)));
    });
    var dualDirection = [];
    _.each(preparedData, function (val) {
        dualDirection.push(val);
        dualDirection.unshift(val);
    });
    buffer = extendOrRetractData(dualDirection);
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
    if (data.length == status.ledQuantity)
        return data;

    var result = [];
    if (data.length == 0)
        return result;
    else if (data.length < status.ledQuantity) {
        var ledsPerData = status.ledQuantity / data.length;
        var currentProgression = 0;
        var currentPos = 0;
        for (var i = 0; i < status.ledQuantity; i++) {
            if (currentProgression + 1 < ledsPerData) {
                result.push({
                    r: data[currentPos].r,
                    g: data[currentPos].g,
                    b: data[currentPos].b
                });
                currentProgression++;
            } else {
                var fromCurrent = ledsPerData - currentProgression;
                var fromNext = 1 - fromCurrent;
                var current = data[currentPos];
                var next = data[currentPos + 1] || {r: 0, g: 0, b: 0};
                result.push({
                    r: current.r * fromCurrent + next.r * fromNext,
                    g: current.g * fromCurrent + next.g * fromNext,
                    b: current.b * fromCurrent + next.b * fromNext
                });
                currentPos++;
                currentProgression = fromNext;
            }
        }
    } else {
        var dataLengthPerLed = Math.floor(data.length / status.ledQuantity);
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
    }
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

function rand255() {
    return Math.floor(Math.random() * 255);
}

function toRandomColor() {
    return {
        r: rand255(),
        g: rand255(),
        b: rand255()
    }
}

function toOneColor(color) {
    return onecolor("rgb(" + color.r + "," + color.g + "," + color.b + ")");
}

function fromOneColor(color) {
    return {
        r: Math.round(color.red() * 255),
        g: Math.round(color.green() * 255),
        b: Math.round(color.blue() * 255),
    };
}

function fillRandomBuffer() {
    for (var i = 0; i < status.ledQuantity; i++) {
        buffer[i] = toRandomColor();
    }
}