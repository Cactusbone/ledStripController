//var _ = require('underscore');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
var async = require('async');

var strip = require("./strip8806.js");

var led_quantity = 240;
var buffer = [];

//todo ensure only one is playing
//todo add callback to playFile for when it's over. or fallback to either last color or random
module.exports = {
    playFile: playFile,
    playColor: playColor,
    playRandom: playRandom,
    getStatus: getStatus,
};

var status = {};

function getStatus() {
    return status;
}

function playFile(fileName) {
    var data = fs.readFileSync(path.join(__dirname, fileName + ".json.gz"), {});
    zlib.gunzip(data, function (err, decoded) {
        if (err)
            console.error(err);
        else {
            var json = JSON.parse(decoded);
            var frame = 0;
            var framecount = json.data.length / json.framelength;
            var sleepTime = json.duration * 1000 / framecount;
            async.whilst(function () {
                return frame < framecount
            }, function (cb) {
                var delta = frame * json.framelength;
                buffer = prepareData(json.data.slice(delta, delta + json.framelength), json.framelength);
                strip.write(buffer);
                frame++;
                setTimeout(cb, sleepTime);
            }, function (err) {
                if (err)
                    console.error(err);
                console.info("playback complete");
            });
        }
    });

    function prepareData(data, framelength) {
        if (framelength != led_quantity)
            throw new Error('change length not yet supported');
        //todo extend array to led_quantity
        return data;
    }
}

function playColor(color) {
    function fillBuffer(color) {
        for (var i = 0; i < led_quantity; i++) {
            buffer[i] = {r: color.r, g: color.g, b: color.b};
        }
    }

    fillBuffer(color);
    setInterval(function () {
        strip.write(buffer);
    }, 500);
}

function playRandom() {
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
        for (var i = 0; i < led_quantity; i++) {
            buffer[i] = toRandomColor();
        }
    }

    setInterval(function () {
        fillRandomBuffer();
        strip.write(buffer);
    }, 500);
}
