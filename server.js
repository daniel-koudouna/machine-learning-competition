/**
 * Require all the modules needed from npm
 */
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var app = express();
var port = process.env.PORT || 8000;

var passport = require('passport');
var flash = require('connect-flash');

const fileUpload = require('express-fileupload');

/**
 * This allows the user to upload the file
 */
app.use(fileUpload());

//Use the function exported by passport.js, with the parameter passport
require('./app/passport')(passport);

//Create a new morgan logger middleware function using the given format
// 'dev' format - Concise output colored by response status for development use.
app.use(morgan('dev'));
//Parse Cookie header and populate req.cookies with an object keyed by the cookie names.
app.use(cookieParser());
//Parse incoming request bodies in a middleware
//Returns middleware that only parses urlencoded bodies
app.use(bodyParser.urlencoded({
 extended: true
}));

//Set the view engine of the app
app.set('view engine', 'ejs');

//saveUninitialized: Forces a session that is "uninitialized" to be saved to the store.
//A session is uninitialized when it is new but not modified
app.use(session({
 secret: 'justasecret',
 resave:true,
 saveUninitialized: true
}));

//a middle-ware that initialises Passport
app.use(passport.initialize());
//a middleware to alter the req object and change the 'user' value
//that is currently the session id into the true deserialized user object.
app.use(passport.session());
// The app can use flash
app.use(flash());

// Use the function exported by routes module, with the parameters app and passport passed in
require('./app/routes.js')(app, passport);

// Listen to the port
app.listen(port, '127.0.0.1', function(){
    console.log('Listening to port: ' + port)
});
console.log("Port: " + port);
