var express = require('express');
var _ = require('underscore');
var logule = require('logule').init(module);
var optimist = require('optimist');
var async = require('async');
var path = require('path');
var browserify = require('browserify');
var jadeify = require('simple-jadeify');
var jade = require('jade');
var stylus = require('stylus');
var nib = require('nib');

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
        .set('paths', [viewsDir, path.join(viewsDir, 'bootstrap-stylus')])
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

////////////////////////////////////////////////////////////////////////////////
app.get('^/setColor', function (req, res) {
    //todo
    var color = req.param("color");
    logule.info(color);
    res.send({});
});


app.listen(port, function () {
    logule.info("Listening on localhost:%d", port);
});