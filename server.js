var _ = require('underscore');
var express = require('express');
var logule = require('logule').init(module);
var optimist = require('optimist');
var path = require('path');
var browserify = require('browserify');
var jadeify = require('simple-jadeify');
var jade = require('jade');
var stylus = require('stylus');
var nib = require('nib');
var onecolor = require('onecolor');
var fs = require('fs');
var ytdl = require('ytdl');

var controller = require("./controller");
var converter = require("./converter");

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
    var status = controller.getStatus();
    res.send(status);
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
app.get('^/playRandom', function (req, res) {
    controller.playRandom();
    sendStatus(res);
});

////////////////////////////////////////////////////////////////////////////////
app.get('^/getMovies', function (req, res) {
    controller.getMovies(function (err, files) {
        if (err)
            res.send(err, 500);
        else
            res.send(files);
    });
});

////////////////////////////////////////////////////////////////////////////////
app.get('^/getPorts', function (req, res) {
    controller.getPorts(function (err, ports) {
        if (err)
            res.send(err, 500);
        else
            res.send(ports);
    });
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

app.post('^/sendFileOrUrl', function (req, res) {
    var filepath = path.join(__dirname, "temp.mp4");
    var outputName = "temp";

    var url = req.param('url');
    if (url) {
        res.send("working on url", url);
        var outputStream = fs.createWriteStream(filepath);
        var error;
        ytdl(url, {
            quality: 'lowest',
            filter: function (format) {
                return format.container === 'mp4';
            }
        }).on('info',function (info, format) {
                logule.info("found file:", info.title, format.container, format.resolution);
                outputName = info.title;
            }).on("error",function (err) {
                logule.error(err);
                if (!error)
                    res.send(err, 500);
                error = err;
            }).pipe(outputStream);
        outputStream.on("error", function (err) {
            logule.error(err);
            if (!error)
                res.send(err, 500);
            error = err;
        });
        outputStream.on("finish", function () {
            if (!error)
                finish();
        });
    } else if (req.files && _.size(req.files) > 0 && req.files.file) {
        filepath = req.files.file.path;
        outputName = req.files.file.name;
        outputName = outputName.substr(0, outputName.lastIndexOf('.'));
        res.send("working on file", outputName);
        finish();
    } else {
        res.send("missing file", 400);
    }

    function finish() {
        converter.convertVideo(filepath, outputName, function (err, filename) {
            if (err)
                logule.error(err);
            else
                logule.info("done", filename);
            fs.unlink(filepath);
        })
    }
});

app.listen(port, function () {
    logule.info("Listening on localhost:%d", port);
});