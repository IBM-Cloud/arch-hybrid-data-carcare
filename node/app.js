require('./polyfill');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
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
var FacebookStrategy = require('passport-facebook').Strategy;
var sanitizeFilename = require('sanitize-filename');
var config = require('./config');

var app = express();

var debug = require('debug')('medicar');
var sessionAndPassport = true; // set to true if session and passport is required

// return true if the string passed is a good file name
function saneFilename(fileName) {
    var sane = sanitizeFilename(fileName, {replacement: '_'});
    return sane === fileName;
}

// return the hostname derived from the initial request.  This is used for passwords and ids so https is appropriate
function hostnameFromReq(req) {
    if (req.headers.host === 'localhost') {
        return String(req.protocol) + "://" + req.headers.host;
    } else {
        return 'https://' + req.headers.host;
    }
}

/**
 *
 * @param facebookConf {object} clientId and clientSecret
 * @param appPath {string} GET path that this app wants to use to initiate a login with facebook
 * @param hostname {string} http://localhost:3000 is an example this is used for the callback from facebook url
 * @param facebookCallbackPath {string} second part of the callback from facebook url
 */
function facebookConfigure(facebookConf, appPath, hostname, facebookCallbackPath) {

    var callbackUrl = hostname + facebookCallbackPath;
    debug('facebook callbackUrl: ' + callbackUrl);
    // Use the FacebookStrategy within Passport.
    //   Strategies in Passport require a `verify` function, which accept
    //   credentials (in this case, an accessToken, refreshToken, and Facebook
    //   profile), and invoke a callback with a user object.
    passport.use(new FacebookStrategy({
            clientID: facebookConf.clientId,
            clientSecret: facebookConf.clientSecret,
            callbackURL: callbackUrl,
            profileFields: ['id'] // only need the facebook id
        }, function (accessToken, refreshToken, profile, done) {
            // asynchronous verification, for effect...
            process.nextTick(function () {
                // keep it simple use the facebook id
                var userId = "FB_" + profile.id;
                if (! saneFilename(userId)){throw Error('Facebook user ID is not a valid directory name: ' + userId);}
                return done(null, {
                    id: userId
                });
            });
        }
    ));

    // GET /auth/facebook generated from this application (see view/login) to request a login to facebook
    // Use passport.authenticate() with facebook app.
    // The first step in Facebook authentication will involve
    // redirecting the user to facebook.com.  After authorization, Facebook will
    // redirect the user back to this application at /auth/facebook/callback
    app.get(appPath, passport.authenticate('facebook'), function (req, res) {
        // The request will be redirected to Facebook for authentication, so this
        // function will not be called.
        console.error('unexpected facebook callback');
    });

    // GET /auth/facebook/callback - called after facebook validation.
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  If authentication fails, the user will be redirected back to the
    //   login page.  Otherwise, the primary route function function will be called,
    //   which, in this example, will redirect the user to the home page.
    app.get(facebookCallbackPath,
        passport.authenticate('facebook', {failureRedirect: '/login'}), function (req, res) {
            res.redirect('/');
        });

}

/**
 *
 * @param ssoConfig {object} configuration from VCAP_SERVICES
 * @param appPath {string} GET path that this app wants to use to initiate a login with sso
 * @param hostname {string} http://localhost:3000 is an example this is used for the callback from sso url
 * @param ibmSsoCallbackPath {string} second part of the callback from sso url
 */
function ssoConfigure(ssoConfig, appPath, hostname, ibmSsoCallbackPath) {
    var client_id = ssoConfig.credentials.clientId;
    var client_secret = ssoConfig.credentials.secret;
    var authorization_url = ssoConfig.credentials.authorizationEndpointUrl;
    var token_url = ssoConfig.credentials.tokenEndpointUrl;
    var issuer_id = ssoConfig.credentials.issuerIdentifier;
    var callback_url = hostname + ibmSsoCallbackPath;
    debug('sso callback_url: ' + callback_url);

    var OpenIDConnectStrategy = require('./lib/passport-idaas-openidconnect').IDaaSOIDCStrategy;
    var ssoStrategy = new OpenIDConnectStrategy({
            authorizationURL: authorization_url,
            tokenURL: token_url,
            clientID: client_id,
            scope: 'openid',
            response_type: 'code',
            clientSecret: client_secret,
            callbackURL: callback_url,
            skipUserProfile: true,
            issuer: issuer_id
        },
        function (accessToken, refreshToken, profile, done) {
            process.nextTick(function () {
                profile.accessToken = accessToken;
                profile.refreshToken = refreshToken;
                var userId = "IBM_" + profile.id;
                // if (! saneFilename(userId)){throw Error('IBM user ID is not a valid directory name: ' + userId);}
                return done(null, {
                    id: userId
                });
            })
        });

    passport.use(ssoStrategy);

    // GET /auth/ibmssologin generated from this application (see view/login) to request a login via IBM sso
    // Use passport.authenticate() with ibm sso.
    // redirecting the user to ibm.com.  After authorization, ibm will
    // redirect the user back to this application at /auth/sso/callback
    app.get(appPath, passport.authenticate('openidconnect', {}), function (/*req, res*/) {
        // The request will be redirected to sso for authentication, so this
        // function will not be called.
        console.error('unexpected sso callback');
    });

    // GET /auth/sso/callback - called after ibm sso validation.
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  If authentication fails, the user will be redirected back to the
    //   login page.  Otherwise, the primary route function function will be called,
    //   which, in this example, will redirect the user to the home page.
    app.get(ibmSsoCallbackPath,
        passport.authenticate('openidconnect', {failureRedirect: '/login'}), function (req, res) {
            res.redirect('/');
        });

    // user hit the DONT ALLOW button instead of Allow or Allow and Remember
    app.post(ibmSsoCallbackPath, function (req, res) {
        res.redirect('/');
    });
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(__dirname + '/public/favicon.ico'));
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

/*jslint unparam: true*/
function waitForContactThenPushSessionAndPassport(req, res, next) {
    if (hasBeenContacted) return next();
    var hostname = hostnameFromReq(req);
    console.log('hostname: ' + hostname);
    hasBeenContacted = true;
    var sesionParameters = {
        resave: 'false',
        saveUninitialized: 'false',
        secret: 'secretusedtosignthesessionidcookie'
    };
    var vcapMongo = config.findVcapMemberOfServiceByName('serviceSessionStore');
    if (vcapMongo) {
        sesionParameters.store = new MongoStore({url: vcapMongo.credentials.uri});
    } else {
        console.warn('WARNING: No session storage database service has been configured so sessions are persisted in the default memory storage.  Cloud Foundry autoscale, Container Groups session data will not work well');
    }

    app.use(session(sesionParameters));
    app.use(passport.initialize());
    app.use(passport.session());

    // Passport login configuration
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });
    passport.deserializeUser(function (obj, done) {
        done(null, {id: obj});
    });

    var users = {root: {password: 'rpw', id:'0'}, powell: {password: 'ppw', id:'1'}};
    function getIdForUserPassword(username, password, done) {
        var user = users[username];
        process.nextTick(function () {  // make sure the call backs are working correctly
            if (user && user.password === password) {
                if (! saneFilename(user.id)){throw Error('Basic ID is not a valid directory name: ' + user.id);}
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

    var facebookConf = config.nconf.get('CAR_FACEBOOK');
    if (facebookConf) {
        facebookConfigure(facebookConf, '/auth/facebook', hostname, '/auth/facebook/callback');
    }

    // Single Sign On IBM:
    var ssoConfig  = config.findVcapMemberOfServiceByName('serviceSingleSignOn');
    if (ssoConfig) {
        ssoConfigure(ssoConfig, '/auth/ibmssologin', hostname, '/auth/sso/callback');
    }

    // The /login page will post a login with user credentials
    app.use('/login', login);
    app.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login'}));

    app.get('/logout', function(req, res){
        req.logout();
        req.session.destroy();
        res.redirect('/');
    });


    // Mark the request as private (req.medicar.private == true)
    // if the session has not been authenticated via a passport session then give basic a try
    function privateCheckAuthorized(req, res, next) {
        req.medicar = {private: true};
        if (req.isAuthenticated()) {
            return next();
        }
        // basic authentication is good for curl commands, jmeter, etc, do not persist in the session.
        passport.authenticate('basic', {session: false})(req, res, next);
    }

    // REST API - private portion
    // configure private paths identically
    function appUseCheckAuthorized(path, handler) {
        app.all(path, privateCheckAuthorized);
        app.all(path  + '/*', privateCheckAuthorized);
        app.use(path, handler);
    }
    appUseCheckAuthorized('/api/vol/private', volumeFileRoute);
    appUseCheckAuthorized('/api/obj/private', osv2);
    appUseCheckAuthorized('/api/onprem/private', onprem);

    pushTopLayerRoutes();
    return next();
}

module.exports = app;