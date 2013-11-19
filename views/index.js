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
        applyStatusToScreen();
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

        applyObject(status);
    }

    function applyObject(obj) {
        _.each(obj, function (val, key) {
            if (_.isObject(val)) {
                applyObject(val)
            } else {
                $("#" + key).val(val);
            }
        });
    }

    function saveStatus() {
    }

    $("#playRandom").on("click", function () {
        $.ajax({
            url: '/setColor',
            data: {
                color: "random"
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("playRandom", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });

    $("#fullRandom").on("click", function () {
        $.ajax({
            url: '/setColor',
            data: {
                color: "fullRandom"
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("fullRandom", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });

    $("#applyColor").on("click", function () {
        $.ajax({
            url: '/setColor',
            data: {
                color: $("#color").val()
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("setColor", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });


    $("#playMusic").on("click", function () {
        $.ajax({
            url: '/playMusic',
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("playMusic", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
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

    $("#setDelay").on("click", function () {
        $.ajax({
            url: '/setMinDelay',
            data: {
                minDelay: $("#minDelay").val()
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("setMinDelay", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });

    $("#setRandomColorDelay").on("click", function () {
        $.ajax({
            url: '/setRandomColorDelay',
            data: {
                value: $("#randomColorDelay").val()
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("setRandomColorDelay", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });

    $("#setMinValue").on("click", function () {
        $.ajax({
            url: '/setMinValue',
            data: {
                minValue: $("#minValue").val()
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("setMinValue", errorThrown);
            },
            success: function (result) {
                displayError();
                status = result;
                applyStatusToScreen();
            }
        });
    });

    $("#setSoundConf").on("click", function () {
        var data = {
            sampleRate: +$("#sampleRate").val(),
            framesPerBuffer: +$("#framesPerBuffer").val(),
            inputChannels: +$("#inputChannels").val(),
            outputChannels: +$("#outputChannels").val(),
            inputDevice: +$("#inputDevice").val(),
            outputDevice: +$("#outputDevice").val(),
            interleaved: $("#interleaved").val() == "true",
            zero: $("#zero").val() == "true",
        };
        $.ajax({
            url: '/setSoundConf',
            data: {conf: data},
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("setSoundConf", errorThrown);
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
    var maxWidth = 1280;
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
