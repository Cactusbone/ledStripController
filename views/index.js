var $ = require('jquery');
//var _ = require('underscore');

$(function () {
    $("#applyColor").on("click", function () {
        var color = $("#color").val();
        $.ajax({
            url: '/setColor',
            data: {color: color},
            error: function (jqXHR, textStatus) {
                console.error("ajax error", textStatus);
            },
            success: function (result) {
                console.info("ok!", result);
            }
        });
    });

    $("#applyFile").on("click", function () {
        $.ajax({
            url: '/playFile',
            data: {file: "sunrise"},
            error: function (jqXHR, textStatus) {
                console.error("ajax error", textStatus);
            },
            success: function (result) {
                console.info("ok!", result);
            }
        });
    });
});