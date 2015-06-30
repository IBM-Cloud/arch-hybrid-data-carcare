require('./polyfill');

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
var login = require('./routes/login');
var volumeFileRoute = require('./routesapi/file').router;
var osv2 = require('./routesapi/osv2').router;
var onprem = require('./routesapi/onprem');
var BasicStrategy = require('passport-http').BasicStrategy;
var basicAuth = require('basic-auth'); // todo
var app = express();

var debug = require('debug')('medicar');
var sessionAndPassport = true; // set to true if session and passport is required

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); // these can be served without session

// REST API
app.use(busboy());
app.use('/api/vol/public', volumeFileRoute);
app.use('/api/obj/public', osv2);
app.use('/api/onprem/public', onprem);


// done with lower layers

if(sessionAndPassport) {
    // middle session/paspsport layers and top layers
    app.all('*', waitForContactThenPushSessionAndPassport);
} else {
    // top layers
    pushTopLayerRoutes();
}

// push the rest of the stack
function pushTopLayerRoutes() {
// GUI
    app.use('/', routes);

// catch 404 and forward to error handler
    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

// Top of the routing stack.  Anything that gets here will fail
    var errorProperty = (app.get('env') === 'development') ? function(err) {return err;} : function(){return {};};

    app.use(function (err, req, res /*, next */) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: errorProperty(err)
        });
    });
}

// The routes to the database may not be available when the container begins executing
// code.  The first outside request will indicate that is is possible to get to the container
// so it is likely that it will be possible to get outside the container as well.
var hasBeenContacted = false;
function waitForContactThenPushSessionAndPassport(req, res, next) {
    if (hasBeenContacted) return next();
    hasBeenContacted = true;
    app.use(session({
        // TODO store: new MongoStore({db: 'test'}),
        resave: 'false',
        saveUninitialized: 'false',
        secret: 'secretusedtosignthesessionidcookie'
    }));
    app.use(passport.initialize());
    app.use(passport.session());

// Passport login configuration
    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });

    var users = {root: {password: 'rpw', id:'0'}, powell: {password: 'ppw', id:'1'}};
    function getIdForUserPassword(username, password, done) {
        var user = users[username];
        process.nextTick(function () {  // make sure the call backs are working correctly
            if (user && user.password === password) {
                return done(null, {
                    id: user.id
                });
            } else {
                return done(null, false, {message: 'Incorrect username/password.'});
            }
        });
    }

    // load the strategies into passport
    passport.use(new passportLocal(getIdForUserPassword));
    passport.use(new BasicStrategy({}, getIdForUserPassword));
    // google, facebook, ...

    // The /login page will post a login with user credentials
    app.use('/login', login);
    app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login'}));

    // basic authentication is good for curl commands, jmeter, etc, do not persist in the session.
    basicAuthentication = passport.authenticate('basic', {session: false});

    // Mark the request as private (req.medicar.private == true)
    // if the session has not been authenticated via a passport session then give basic a try
     function privateCheckAuthorized(req, res, next) {
        req.medicar = {private: true};
        if (req.isAuthenticated()) { return next(null); }
        basicAuthentication(req, res, next);
    }

    // configure private paths identically
    function appUseCheckAuthorized(path, handler) {
        app.all(path, privateCheckAuthorized);
        app.all(path  + '/*', privateCheckAuthorized);
        app.use(path, handler);
    }

    // REST API - private portion
    appUseCheckAuthorized('/api/vol/private', volumeFileRoute);
    appUseCheckAuthorized('/api/obj/private', osv2);
    appUseCheckAuthorized('/api/onprem/private', onprem);

    pushTopLayerRoutes();
    return next();
}

module.exports = app;