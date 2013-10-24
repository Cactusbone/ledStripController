var $ = require('jquery');
//var _ = require('underscore');

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

    //todo retrieve #availableFiles && #availablePorts

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

    $("#applyFile").on("click", function () {
        $.ajax({
            url: '/playFile',
            data: {file: "sunrise"},
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