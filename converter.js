var zlib = require('zlib');
var path = require('path');
var async = require('async');
var Canvas = require('canvas');
var Image = Canvas.Image;
var fs = require('fs');

var ffmpeg = require("fluent-ffmpeg");

var Metalib = ffmpeg.Metadata;

// make sure you set the correct path to your video file
new Metalib(path.join(__dirname, "..", 'Sunrise.mp4'), function (metadata, err) {
    if (err)
        console.error(err);
    else {
        console.log(path.join(__dirname, "..", 'Sunrise.mp4'));
        var position = 0;
        var result = [];
        async.whilst(
            function () {
                return position < metadata.durationsec;//avoid last second since it probably wont be complete
            },
            function (callback) {
                position++;
                processSecond(position, function (err, data) {
                    if (err)
                        console.error("error processing %d / %d : %s", position, metadata.durationsec, err);
                    else {
                        console.log(position + "/" + metadata.durationsec);
                        result = result.concat(data);
                    }
                    callback(err);
                })
            },
            function (err) {
                if (err)
                    console.error(err);
                else {
                    zlib.gzip(JSON.stringify({
                        name: "Sunrise",
                        duration: metadata.durationsec,
                        framelength: 240,
                        data: result
                    }), function (err, data) {
                        if (err)
                            console.error(err);
                        else {
                            var filename = path.join(__dirname, "..", "sunrise.json.gz");
                            fs.writeFile(filename, data, {}, function (err) {
                                if (err)
                                    console.error(err);
                                else
                                    console.log("conversion complete !, saved as %s", filename);
                            })
                        }
                    });
                }
            }
        );
    }
});

function processSecond(second, cb) {
    var frameQuantity = 25;

    var timemarks = [];
    var delta = 1.0 / frameQuantity;
    for (var i = 0; i < frameQuantity; i++) {
        timemarks.push("" + (delta + second))
    }

    new ffmpeg({ source: path.join(__dirname, "..", 'Sunrise.mp4') })
        .withFps(frameQuantity)
        .withSize('400x240')
        .takeScreenshots({
            count: 25,
            timemarks: timemarks,
            filename: 'screenshot_%i',
            fileextension: ".png"
        }, path.join(__dirname, "..", 'screenshots'), function (err, filenames) {
            if (err) {
                cb(err);
            } else {
                var result = [];
                var i = 0;
                async.whilst(
                    function () {
                        return i < frameQuantity;
                    },
                    function (callback) {
                        var filename = filenames[ i ];
                        i++;
                        if (filename) {
                            var img = new Image;
                            img.onerror = function (err) {
                                console.error("error reading", img.src, err);
                            };
                            img.onload = function () {
                                var canvas = new Canvas(img.width, img.height);
                                var ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                var imageData = ctx.getImageData(0, 0, img.width, img.height);
                                for (var line = 0; line < img.height; line++) {
                                    var pos = line * img.width * 4;
                                    /*var r = 0;
                                     var g = 0;
                                     var b = 0;
                                     for (var i = 0; i < img.width; i += 4) {
                                     r += imageData.data[pos + i + 0];
                                     g += imageData.data[pos + i + 1];
                                     b += imageData.data[pos + i + 2];
                                     //+3 is alpha
                                     }
                                     result.push({
                                     r: Math.round(r / img.width),
                                     g: Math.round(g / img.width),
                                     b: Math.round(b / img.width)
                                     });          */
                                    var column = 200;
                                    result.push({
                                        r: imageData.data[pos + column + 0],
                                        g: imageData.data[pos + column + 1],
                                        b: imageData.data[pos + column + 2]
                                    });
                                }
                                callback(null, result);
                            };
                            img.src = path.join(__dirname, "..", 'screenshots', filename);
                        } else
                            callback(null, result);
                    },
                    function (err) {
                        cb(err, result);
                    }
                );
            }
        });
}


