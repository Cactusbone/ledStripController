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

var options = {};
function zero(buffer) {
    for (var iSample = 0; iSample < buffer.length; ++iSample)
        buffer[iSample] = 0.0;
}

var callbacks = [];
var outputBuffer;
engine.addAudioCallback(audioCallback);

function audioCallback(inputBuffer) {
    if (options.interleaved) {
        outputBuffer = _.clone(inputBuffer);
        _.each(callbacks, function (cb) {
            cb();
        });
        if (options.zero)
            zero(inputBuffer);
        return inputBuffer;
    } else {
        //todo handle other channels ?
        outputBuffer = _.clone(inputBuffer[0]);
        _.each(callbacks, function (cb) {
            cb();
        });
        if (options.zero)
            zero(inputBuffer[0]);
        return inputBuffer;
    }
}

function getDevices() {
    var result = [];
    var numDevices = engine.getNumDevices();
    for (var i = 0; i < numDevices; i++) {
        var name = engine.getDeviceName(i);
        result.push({id: i, name: name})
    }
    return result;
}

module.exports = {
    getBuffer: function () {
        return outputBuffer;
    },
    onData: function (cb) {
        callbacks.push(cb);
    },
    applyConf: function (conf) {
        options = conf;
        try {
            engine.setOptions(options);
            engine.addAudioCallback(audioCallback);
        } catch (err) {
            logule.error(err);
            return err;
        }
        return "";
    },
    getDevices: getDevices,
};
