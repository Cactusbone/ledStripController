/*
 http://learningthreejs.com/blog/2012/05/08/sound-visualisation-vuemeter-in-webgl/
 https://github.com/jeromeetienne/webaudio.js
 https://github.com/azeem/webvs

 https://github.com/sebpiq/AudioBuffer
 https://npmjs.org/package/node-core-audio

 http://www.wikihow.com/Make-Your-Christmas-Lights-Flash-to-Music

 http://arc.id.au/SpectrumAnalyser.html
 */


var logule = require('logule').init(module);
var _ = require('underscore');
var coreAudio = require("node-core-audio");
var engine = coreAudio.createNewAudioEngine();

var numDevices = engine.getNumDevices();

var inputDeviceId;
var outputDeviceId;
for (var i = 0; i < numDevices; i++) {
    var name = engine.getDeviceName(i);
    logule.info("%d: %s", i, name);
    if (null == inputDeviceId && /Line in|Entr.*e ligne/i.test(name)) {
        inputDeviceId = i;
    }
    if (null == outputDeviceId && /Haut-parleurs/.test(name)) {
        outputDeviceId = i;
    }
//    if (null == outputDeviceId && /Digital Output|sortie num.*riqu/i.test(name)) {
//        outputDeviceId = i;
//    }
}
logule.info("initial options", engine.options);
logule.info("in: %d, out: %d", inputDeviceId, outputDeviceId);

var options = {
    inputChannels: 1,
    outputChannels: 1,
    interleaved: false,
    framesPerBuffer: 4096,
};
if (inputDeviceId != null)
    options.inputDevice = inputDeviceId;
if (outputDeviceId != null)
    options.outputDevice = outputDeviceId;

options.inputDevice = 3;
_.defer(function () {
    try {
        engine.setOptions(options);
    } catch (err) {
        logule.error(err);
    }
    logule.info("applied options", engine.options);
});

if (engine.options.inputDevice == null) {
    logule.error("missing input device");
    process.exit(2);
}

if (engine.options.outputDevice == null) {
    logule.error("missing input device");
    process.exit(3);
}

function zero(buffer) {
    for (var iChannel = 0; iChannel < buffer.length; ++iChannel)
        for (var iSample = 0; iSample < buffer[iChannel].length; ++iSample)
            buffer[iChannel][iSample] = 0.0;
}

var callbacks = [];
var outputBuffer;
engine.addAudioCallback(function (inputBuffer) {
    outputBuffer = _.clone(inputBuffer[0]);
    _.each(callbacks, function (cb) {
        cb();
    });
//    zero(inputBuffer[0]);
    return inputBuffer;
});

module.exports = {
    getBuffer: function () {
        return outputBuffer;
    },
    onData: function (cb) {
        callbacks.push(cb);
    }
};
