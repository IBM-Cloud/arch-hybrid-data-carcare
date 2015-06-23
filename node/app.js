var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passportLocal = require('passport-local');
var busboy = require('connect-busboy');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');

var routes = require('./routes/index');
var login = require('./routesgui/login');
var file = require('./routes/file');
var osv2 = require('./routes/osv2');
var onprem = require('./routes/onprem');
var app = express();

var debug = require('debug')('medicar');
var sessionAndPassport = false; // set to true if session and passport is required

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
if(sessionAndPassport) {
    app.all('*', waitForContact);
} else {
    pushTopLayerRoutes();
}

function pushTopLayerRoutes() {
    app.use(busboy());
    app.use(express.static(path.join(__dirname, 'public')));
// GUI
    app.use('/', routes);

// REST API
    app.use('/api/vol/public', file);
    app.use('/api/vol/private', file);
    app.use('/api/obj/public', osv2);
    app.use('/api/obj/private', osv2);
    app.use('/api/onprem/public', onprem);

// catch 404 and forward to error handler
    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

// error handlers

// development error handler
// will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }

// production error handler
// no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}

// The routes to the database may not be available when the container begins executing
// code.  The first outside request will indicate that is is possible to get to the container
// so it is likely that it will be possible to get outside the container as well.
var hasBeenContacted = false;
function waitForContact(req, res, next) {
    if (hasBeenContacted) return next();
    hasBeenContacted = true;
    app.use(session({
        store: new MongoStore({db: 'test'}),
        resave: 'false',
        saveUninitialized: 'false',
        secret: 'secretusedtosignthesessionidcookie'
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    pushTopLayerRoutes();

// Passport login configuration
    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });
    var users = {root: 'rpw', powell: 'ppw'};
    passport.use(new passportLocal(
        function (username, password, done) {
            if (users[username] !== password) {
                return done(null, false, {message: 'Incorrect username/password.'});
            } else {
                return done(null, {
                    username: username
                });
            }
        }
    ));

    app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login'}));
    app.use('/login', login);

    // todo remove this play stuff
    app.get('/play', function (req, res) {
        if (req.session) {
            console.log(req.session);
        } else {
            console.log('no session');
        }
        if (req.user) {
            console.log(req.user);
        }
        res.send('play: got it');
    });
    return next();
}

module.exports = app;
