/*
 http://learningthreejs.com/blog/2012/05/08/sound-visualisation-vuemeter-in-webgl/
 https://github.com/jeromeetienne/webaudio.js
 https://github.com/azeem/webvs

 https://github.com/sebpiq/AudioBuffer
 https://npmjs.org/package/node-core-audio

 http://www.wikihow.com/Make-Your-Christmas-Lights-Flash-to-Music
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
//    if (!outputDeviceId && /Haut-parleurs/.test(name)) {
//        outputDeviceId = i;
//    }
    if (null == outputDeviceId && /Digital Output|sortie num.*riqu/i.test(name)) {
        outputDeviceId = i;
    }
}

logule.info("in: %d, out: %d", inputDeviceId, outputDeviceId);

var options = {
    inputChannels: 2,
    outputChannels: 2,
//    framesPerBuffer: 4096,
    interleaved: true,//allow for single depth buffer to get clone to work
};
if (inputDeviceId != null)
    options.inputDevice = inputDeviceId;
if (outputDeviceId != null)
    options.outputDevice = outputDeviceId;

try {
    engine.setOptions(options);
} catch (err) {
    logule.error(err);
}

logule.info(engine.options);

function zero(buffer) {
    for (var iChannel = 0; iChannel < buffer.length; ++iChannel)
        for (var iSample = 0; iSample < buffer[iChannel].length; ++iSample)
            buffer[iChannel][iSample] = 0.0;
}

var outputBuffer;
engine.addAudioCallback(function (inputBuffer) {
    engine.fft.simple(outputBuffer, inputBuffer, "real");
//    outputBuffer = _.clone(inputBuffer);
    zero(inputBuffer);
    return inputBuffer;
});

module.exports = {
    getBuffer: function () {
        return outputBuffer;
    }
};
