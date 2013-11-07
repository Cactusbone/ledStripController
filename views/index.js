var $ = require('jquery');
var _ = require('underscore');
var moviesTemplate = require("./movies.jade");
var portsTemplate = require("./ports.jade");

function displayStatus(status) {
    $('#status').text(JSON.stringify(status));
}

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
            displayStatus(result);
        }
    });

    loadMovies();

    loadPorts();

    $("#playRandom").on("click", function () {
        $.ajax({
            url: '/playRandom',
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError("playRandom", errorThrown);
            },
            success: function (result) {
                displayError();
                displayStatus(result);
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
                displayStatus(result);
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
                displayStatus(result);
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
                displayStatus(result);
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
                displayStatus(result);
            }
        });
    });

    var socket = io.connect('http://localhost');
    socket.on('buffer', function (data) {
        var canvas = $("#canvas").get(0);
        var ctx = canvas.getContext("2d");

        _.each(data, function (color, index) {
            ctx.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
            var baseSize = 4;
            ctx.fillRect(index * (baseSize + 1), 0, baseSize, baseSize);
        });
    });
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