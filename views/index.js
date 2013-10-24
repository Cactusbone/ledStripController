var $ = require('jquery');
//var _ = require('underscore');
var moviesTemplate = require("./movies.jade");
var portsTemplate = require("./ports.jade");

function displayStatus(status) {
    $('#status').text(JSON.stringify(status));
}

function displayError(error) {
    $('#error').text(error || '');
}

$(function () {
    $.ajax({
        url: '/status',
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("ajax error", textStatus);
            displayError(errorThrown);
        },
        success: function (result) {
            displayStatus(result);
        }
    });

    loadMovies();

    loadPorts();

    $("#playRandom").on("click", function () {
        var color = $("#color").val();
        $.ajax({
            url: '/playRandom',
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError(errorThrown);
            },
            success: function (result) {
                displayError(null);
                displayStatus(result);
            }
        });
    });

    $("#applyColor").on("click", function () {
        var color = $("#color").val();
        $.ajax({
            url: '/setColor',
            data: {color: color},
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError(errorThrown);
            },
            success: function (result) {
                displayError(null);
                displayStatus(result);
            }
        });
    });

    $('body').on("click", ".playMovie", function (event) {
        var movieName = $(event.currentTarget).text();
        $.ajax({
            url: '/playFile',
            data: {file: movieName},
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("ajax error", textStatus);
                displayError(errorThrown);
            },
            success: function (result) {
                displayError(null);
                displayStatus(result);
            }
        });
    });
});

function loadMovies() {
    $.ajax({
        url: '/getMovies',
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("ajax error", textStatus);
            displayError(errorThrown);
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
            displayError(errorThrown);
        },
        success: function (ports) {
            $("#availablePorts").empty().append(portsTemplate({ports: ports}));
        }
    });
}