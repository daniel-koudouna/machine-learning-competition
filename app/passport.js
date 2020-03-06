// LocalStrategy that requires
var LocalStrategy = require("passport-local").Strategy;

// Require the modules from npm
var mariadb = require('mariadb/callback');
var bcrypt = require('bcrypt-nodejs');

// Require the local modules
var dbconfig = require('../config/database');
const pool = mariadb.createPool(dbconfig);

module.exports = function(passport) {

  /**
   * the method that is called on the login request(during the authentication) and
   * if login is successful then it decides what user information should get stored in the session
   * and a cookie is sent to the browser for the same to maintain the session
   */
 passport.serializeUser(function(user, done){
  done(null, user.username);
 });

 /**
  * the method that is called on all subsequent request and is called by the passport.session middleware.
  * It enables us to load additional user information on every request.
  */
 passport.deserializeUser(function(id, done){
  pool.query("SELECT * FROM users WHERE username = ? ", [id],
   function(err, rows){
    done(err, rows[0]);
   });
 });

 /**
  * Name 'local-signup' local strategy
  */
 passport.use(
  'local-signup',
  new LocalStrategy({
   usernameField : 'username',
   passwordField: 'password',
   passReqToCallback: true
  },
  function(req, username, password, done){
    // The regular expression for the username
    // Start with the letters and end with the numbers.
  let format = /^[a-z]{3,}[0-9]{0,4}$/;
   // Check if the username passed the regular expression test
   // If it did not passed the test then it is an unvalid username
   if (!format.test(username) ) {
        return done(null, false, req.flash('signupMessage', 'Invalid username'));
   }
   // Check if the length of password is smaller than 8 or not
   // If the length of the password is smaller than 8 then it is an unvalid password
   if (password.length < 8) {
       return done(null, false, req.flash('signupMessage', 'Unvalid password (At least 8 characters)'));
   }

   // Search in the database to check the user is existed in the database or not
   // If the user is not existed with the given username, then insert the username, encryped password
   // and email (username + @st-andrews.ac.uk) into the database
   pool.query("SELECT * FROM users WHERE username = ? ",
   [username], (err, rows) => {
    if(err){
     return done(err);}
     // If there is an user existed with the entered username, then it would not continue
     if(rows.length){
     return done(null, false, req.flash('signupMessage', 'That is already taken'));
    }else{
     var newUserMysql = {
      username: username,
      password: bcrypt.hashSync(password, null, null),
      email: username + "@st-andrews.ac.uk"
     };

    var insertQuery = "INSERT INTO users (username, password, email) values (?, ?, ?)";

    pool.query(insertQuery, [newUserMysql.username, newUserMysql.password, newUserMysql.email], (err, res) => {
        if (err) throw err;
        console.log(res);

        newUserMysql.id = res.insertId;
        return done(null, newUserMysql);
        });
      }
    });
  }
 ));

 /**
  * Name 'local-login'; local strategy
  */
 passport.use(
  'local-login',
  new LocalStrategy({
   usernameField : 'username',
   passwordField: 'password',
   passReqToCallback: true
  },
  function(req, username, password, done){
    /**
     * Check if the user is existed in the database or not.
     * If there is the entered username in the database then it would
     * check the entered password is same as the password in the database or not.
     * If the user is existed and the password is correct, then passed into the user profile page
     */
   pool.query("SELECT * FROM users WHERE username = ? ", [username],
   function(err, rows){
    if(err)
     return done(err);
    if(!rows.length){
     return done(null, false, req.flash('loginMessage', 'No User Found'));
    }
    if(!bcrypt.compareSync(password, rows[0].password))
     return done(null, false, req.flash('loginMessage', 'Wrong Password'));

    return done(null, rows[0]);
   });
  })
 );
};
