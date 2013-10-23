var $ = require('jquery');
var _ = require('underscore');

require('./lib/bootstrap.min.js');


$(function () {
    $("#applyColor").on("click", function () {
        var color = $("#color").val();
        $.ajax({
            url: '/setColor',
            dataType: 'json',
            data: {color: color},
            error: function (jqXHR, textStatus) {
                console.error("ajax error", textStatus);
            },
            success: function (result) {
                console.info("ok!");
            }
        });
    });
});