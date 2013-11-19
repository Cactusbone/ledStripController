var $ = require('jquery');
var _ = require('underscore');
require('../node_modules/bootstrap-stylus/js/button');

var moviesTemplate = require("./movies.jade");
var portsTemplate = require("./ports.jade");
var devicesTemplate = require("./devices.jade");

function displayError() {
    $('#error').text(arguments.length ? _.toArray(arguments).join(":") : "");
}

$(function () {
    $.ajax({
        url: '/status',
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("ajax error", textStatus);
            displayError("status", errorThrown);
        },
        success: function (result) {
            status = result;
            applyStatusToScreen();
        }
    });

    loadMovies();
    loadPorts();
    loadDevices();

    var status = {};

    $('.modeButtons').button();
    $(".setMode").on("change", function (event) {
        status.mode = $(event.currentTarget).attr("data-mode");
        saveStatus();
    });

    $('.colorButtons').button();
    $(".setColor").on("change", function (event) {
        status.color = $(event.currentTarget).attr("data-color");
        if (status.color != "fade" && status.color != "random" && status.color != "fullrandom") {
            status.color = $("#color").val();
            $("#color").show();
        } else {
            $("#color").hide();
        }
        saveStatus();
    });
    $("#color").on("change", function () {
        status.color = $("#color").val();
        saveStatus();
    });

    $("#minDelay,#randomColorDelay,#minValue,#fadeDelay").on("change", function (event) {
        var key = $(event.currentTarget).attr("id");
        status[key] = $(event.currentTarget).val();
        saveStatus();
    });

    function applyStatusToScreen() {
        $(".setMode").parent().removeClass("active");
        $(".setMode[data-mode=" + status.mode + "]").parent().addClass("active");

        $(".colorPanel").hide();
        $(".musicPanel").hide();
        $(".videoPanel").hide();
        //noinspection FallthroughInSwitchStatementJS
        switch (status.mode) {
            case 'music':
                $(".musicPanel").show();
            case 'color':
                $(".colorPanel").show();
                break;
            case 'video':
                $(".videoPanel").show();
        }

        $(".setColor").parent().removeClass("active");
        $(".setColor[data-color=" + status.color + "]").parent().addClass("active");
        if (status.color != "fade" && status.color != "random" && status.color != "fullrandom") {
            $(".setColor[data-color=specific]").parent().addClass("active");
            $("#color").show();
        } else {
            $("#color").hide();
        }

        if (status.color == "fade")
            $("#fadeDelay").parent().show();
        else
            $("#fadeDelay").parent().hide();

        if (status.color == "random" && status.mode == "music")
            $("#randomColorDelay").parent().show();
        else
            $("#randomColorDelay").parent().hide();

        applyObject(status);
    }

    function applyObject(obj) {
        _.each(obj, function (val, key) {
            if (_.isObject(val)) {
                applyObject(val)
            } else {
                $("#" + key).val(val.toString());
            }
        });
    }

    function saveStatus() {
        $.ajax({
            url: '/setStatus',
            type: 'POST',
            data: {status: status},
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("sendFile error", textStatus);
                displayError("saveStatus", errorThrown);
            },
            success: function (newStatus) {
                displayError();
                status = newStatus;
                applyStatusToScreen();
            }
        });
    }

    $("#setSoundConf").on("click", function () {
        status.soundConf = {
            sampleRate: +$("#sampleRate").val(),
            framesPerBuffer: +$("#framesPerBuffer").val(),
            interleaved: $("#interleaved").val() == "true",
            inputDevice: +$("#inputDevice").val(),
            inputChannels: +$("#inputChannels").val(),
            outputDevice: +$("#outputDevice").val(),
            outputChannels: +$("#outputChannels").val(),
            zero: $("#zero").val() == "true",
        };
        saveStatus();
    });

    $("#sendFileOrUrl").on("click", function () {
        var data = new FormData();
        var files = $('#file').get(0).files;
        if (files.length > 0) {
            data.append('file', files[0]);
            $.ajax({
                url: '/sendFileOrUrl',
                type: 'POST',
                data: data,
                cache: false,
                contentType: false,
                processData: false,
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error("sendFile error", textStatus);
                    displayError("sendFileOrUrl", errorThrown);
                },
                success: function (/*filename*/) {
                    displayError();
                    loadMovies();
                }
            });
        } else {
            $.ajax({
                url: '/sendFileOrUrl',
                type: 'POST',
                data: {
                    url: $("#url").val()
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error("sendUrl error", textStatus);
                    displayError("sendFileOrUrl", errorThrown);
                },
                success: function (/*filename*/) {
                    displayError();
                    loadMovies();
                }
            });
        }
    });

    $("#initLeds").on("click", function () {
        $.ajax({
            url: '/initLeds',
            data: {
                ledquantity: $("#ledquantity").val()
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("initLeds", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });

    var $body = $('body');
    $body.on("click", ".setPort", function (event) {
        var port = $(event.currentTarget).attr("data-name");
        $.ajax({
            url: '/initSerialPort',
            data: {port: port},
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("setPort", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });

    $body.on("click", ".playMovie", function (event) {
        var movieName = $(event.currentTarget).text();
        $.ajax({
            url: '/playFile',
            data: {file: movieName},
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("playFile", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });

    var socket = io.connect();
    var baseSize = 4;
    var height = baseSize;
    var maxWidth = $(window).width();
    var ledPerLine = 240;
    var canvas = $("#canvas").get(0);

    computeSize(ledPerLine);

    var timestamp = Date.now();
    socket.on('buffer', function (data) {
        var newTime = Date.now();
        $("#time").text(newTime - timestamp);
        timestamp = newTime;
        computeSize(data.length);

        var ctx = canvas.getContext("2d");
        _.each(data, function (color, index) {
            ctx.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
            var x = (index % ledPerLine) * (baseSize + 1);
            var y = Math.floor(index / ledPerLine) * (baseSize + 1);
            ctx.fillRect(x, y, baseSize, baseSize);
        });
    });

    function computeSize(nbLeds) {
        var width = nbLeds * (baseSize + 1);
        if (width > maxWidth) {
            var nbLines = Math.ceil(width / maxWidth);
            ledPerLine = Math.ceil(nbLeds / nbLines);
            height = nbLines * (baseSize + 1);
            width = maxWidth;
        }
        $("#canvas").attr({width: width, height: height});
    }

    function loadDevices() {
        $.ajax({
            url: '/getSoundDevices',
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("getSoundDevices", errorThrown);
            },
            success: function (devices) {
                $(".devices").empty().append(devicesTemplate({devices: devices}));
                applyStatusToScreen();
            }
        });
    }
});


function loadMovies() {
    $.ajax({
        url: '/getMovies',
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("ajax error", textStatus);
            displayError("getMovies", errorThrown);
        },
        success: function (movies) {
            $("#availableFiles").empty().append(moviesTemplate({movies: movies}));
        }
    });
}

function loadPorts() {
    $.ajax({
        url: '/getPorts',
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("ajax error", textStatus);
            displayError("getPorts", errorThrown);
        },
        success: function (ports) {
            $("#availablePorts").empty().append(portsTemplate({ports: ports}));
        }
    });
}
