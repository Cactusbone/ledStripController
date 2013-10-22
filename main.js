//var _ = require('underscore');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
var async = require('async');

var strip = require("./strip8806.js");

var led_quantity = 240;
var buffer = [];

var data = fs.readFileSync(path.join(__dirname, "..", "sunrise.json.gz"), {});
zlib.gunzip(data, function (err, decoded) {
    if (err)
        console.error(err);
    else {
        var json = JSON.parse(decoded);
        var frame = 0;
        var framecount = json.data.length / json.framelength;
        var sleepTime = json.duration * 1000 / framecount;
        console.log(framecount, sleepTime);
        async.whilst(function () {
            return frame < framecount
        }, function (cb) {
            if (frame % 10 == 0)
                console.log(frame);
            var delta = frame * json.framelength;
            buffer = prepareData(json.data.slice(delta, delta + json.framelength));
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

function prepareData(data) {
    //todo extend array to led_quantity
    return data;
}
/*
 function fillBuffer(color) {
 for (var i = 0; i < led_quantity; i++) {
 buffer[i] = {r: color.r, g: color.g, b: color.b};
 }
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
 for (var i = 0; i < led_quantity; i++) {
 buffer[i] = toRandomColor();
 }
 }

 var colors = [
 {r: 255, g: 0, b: 0},
 {r: 0, g: 255, b: 0},
 {r: 0, g: 0, b: 255},
 {r: 255, g: 255, b: 0},
 {r: 255, g: 0, b: 255},
 {r: 0, g: 255, b: 255},
 {r: 255, g: 255, b: 255}
 ];
 var current = 0;

 setInterval(function () {
 fillRandomBuffer();
 //    fillBuffer(colors[current]);
 strip.write(buffer);
 //    current = (current + 1) % colors.length;
 }, 500);


 */