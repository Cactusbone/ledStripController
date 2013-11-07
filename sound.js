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
    if (!inputDeviceId && /Line in/.test(name)) {
        inputDeviceId = i;
    }
//    if (!outputDeviceId && /Haut-parleurs/.test(name)) {
//        outputDeviceId = i;
//    }
    if (!outputDeviceId && /Digital Output/.test(name)) {
        outputDeviceId = i;
    }
}

var options = {
    inputChannels: 2,
    outputChannels: 2,
//    framesPerBuffer: 4096,
    inputDevice: inputDeviceId,
    outputDevice: outputDeviceId,
    interleaved: true,//allow for single depth buffer to get clone to work
};

engine.setOptions(options);

logule.info(engine.options);

function windowHamming( coeff, iSample, numTotalCoeffs ) {
    return coeff * 0.08 + 0.46 * ( 1 + Math.cos(2*Math.PI*iSample/numTotalCoeffs) );
}

function getSineSample( iSamp, freq ) {
    return Math.sin( Math.PI * freq * 0.5 * iSamp / options.sampleRate );
}

function zero(buffer) {
    for (var iChannel = 0; iChannel < buffer.length; ++iChannel)
        for (var iSample = 0; iSample < buffer[iChannel].length; ++iSample)
            buffer[iChannel][iSample] = 0.0;
}

var outputBuffer;
//engine.addAudioCallback(function (inputBuffer) {
//    outputBuffer = _.clone(inputBuffer);
//    zero(inputBuffer);
//
//    return inputBuffer;
//});

var totalSamples = 0;
var fftBuffer = [];
engine.addAudioCallback( function(inputBuffer) {
    outputBuffer = [];

    //for( var iSample=0; iSample<outputBuffer[0].length; ++iSample ) {
    //        outputBuffer[0][iSample] = iSample / outputBuffer[0].length;
    //}

    for( var iSample=0; iSample<inputBuffer.length; ++iSample ) {
        outputBuffer[iSample] = getSineSample( totalSamples, 6000 );
        outputBuffer[iSample] += getSineSample( totalSamples, 420 );

        outputBuffer[iSample] = windowHamming( inputBuffer[iSample], iSample, inputBuffer.length );
        totalSamples++;
    }

    engine.fft.simple( fftBuffer, outputBuffer, "real" );

    zero( inputBuffer );

    return inputBuffer;
});

module.exports = {
    getBuffer: function () {
        return fftBuffer;
    }
};
