var express = require('express');
//var _ = require('underscore');
var logule = require('logule').init(module);
var optimist = require('optimist');
//var async = require('async');
var path = require('path');
var browserify = require('browserify');
var jadeify = require('simple-jadeify');
var jade = require('jade');
var stylus = require('stylus');
var nib = require('nib');
var onecolor = require('onecolor');

var controller = require("./controller");

var opt = optimist
    .default({
        port: 80,
        debug: false
    })
    .boolean(['debug', 'help'])
    .describe({
        help: 'Display this help',
        port: 'This server port',
        debug: 'Log debug info'
    });
var argv = opt.argv;
if (argv.help) {
    opt.showHelp();
    process.exit();
}
if (argv.debug)
    logule.unmute('debug');
else
    logule.mute('debug');

var port = argv.port;

var viewsDir = path.join(__dirname, 'views');
var publicDir = path.join(__dirname, 'public');

var app = express();

function compileStylus(str, filename) {
    return stylus(str)
        .set('filename', filename)
        .set('compress', true)
        .set('paths', [
            viewsDir,
            path.join(__dirname, 'node_modules/bootstrap-stylus/stylus')
        ])
        .use(nib());
}

function makeBundle(name) {
    var bundle = browserify({
        mount: '/' + name + '.js',
        watch: true,
        debug: true,
        require: {
            jquery: 'jquery-browserify'
        }
    });
    bundle.use(jadeify);
    bundle.addEntry(path.join(viewsDir, name + '.js'));
    return bundle;
}

app.configure(function () {
    app.set('views', viewsDir);
    app.set('view engine', 'jade');
    app.use(makeBundle('index'));
    app.use(stylus.middleware({
        src: viewsDir,
        dest: publicDir,
        compile: compileStylus
    }));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(express.bodyParser());
    app.use(express.static(publicDir));
    app.use(app.router);
});
////////////////////////////////////////////////////////////////////////////////
app.get('^(/|/index.html)$', function (req, res) {
    res.render('index');
});

function sendStatus(res) {
    res.send(controller.getStatus());
}

////////////////////////////////////////////////////////////////////////////////
app.get('^/status', function (req, res) {
    sendStatus(res);
});

////////////////////////////////////////////////////////////////////////////////
app.get('^/setColor', function (req, res) {
    var color = req.param("color");
    var parsedColor = onecolor(color);
    if (!parsedColor) {
        res.send("invalid Color", 400);
        return;
    }
    controller.playColor({
        r: Math.round(parsedColor.red() * 255),
        g: Math.round(parsedColor.green() * 255),
        b: Math.round(parsedColor.blue() * 255),
    });
    sendStatus(res);
});

////////////////////////////////////////////////////////////////////////////////
app.get('^/playFile', function (req, res) {
    var file = req.param("file");
    if (!file) {
        res.send("invalid file name", 400);
        return;
    }
    controller.playFile(file);
    sendStatus(res);
});

app.listen(port, function () {
    logule.info("Listening on localhost:%d", port);
});