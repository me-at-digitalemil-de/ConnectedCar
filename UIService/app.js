var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


let versionobj= require(process.env.APPDIR+'/version.json'); 
var app = express();

// view engine setup
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.get("/", function(req, res, next) {
  res.end();
});

app.get("/version", function(req, res, next) {
  console.log("version: "+versionobj.version);
    let appsecret= process.env.APPSECRET;
    if(appsecret==undefined) {
      appsecret="No Secret.";
    }

    res.send(versionobj.version+","+appsecret);
    res.end();
  });
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.end();
});

module.exports = app;
