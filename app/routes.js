/**
 * Require all the modules needed which are are downloaded by npm
 */
let fs = require('fs');
let mariadb = require('mariadb/callback');
let path = require('path');
let nodemailer = require('nodemailer');
let async = require("async");
let crypto = require("crypto");
var bcrypt = require('bcrypt-nodejs');
let moment = require("moment");

/**
 * Require local modules
 */
let dbconfig = require('../config/database');
let calculator = require('./scoreCalculator');
const pool = mariadb.createPool(dbconfig);

/** Create database if it doesn't exist. **/
function readFiles(dirname) {
    results = [];
    filenames = fs.readdirSync(dirname, {withFileTypes: true});
    filenames.forEach(filename => {
        var content = fs.readFileSync(dirname + "/" + filename, 'utf-8');
        results.push(content);
    });
    return results;
}
const dbconfigpath = path.resolve(__dirname, "../dbconfig/");
let allfiles = readFiles(dbconfigpath);
allfiles.forEach(file => {
    file = file.split("__DB").join(dbconfig.database);
    pool.query(file, (err, res) => {
        if (err) {
            console.log(err);
        }
    });
});

/** Create tasks if some don't exist. **/
const taskpath = path.resolve(__dirname, "../config/tasks.json");
const all_tasks = JSON.parse(fs.readFileSync(taskpath, 'utf-8'));

function typeFor(type) {
    if (type == "regression") {
        return '0';
    } else if (type == "classification") {
        return '1';
    } else {
        return '-1';
    }
}

all_tasks.forEach(task => {
    let isql = "INSERT INTO tasks  (name, type, ground_truth, submissions) VALUES (?, ?, ?, ?)";
    pool.query(isql, [task.name, typeFor(task.type), task.ground_truth, task.submissions.toString()], (err, res) => {
        if (err && err.code != "ER_DUP_ENTRY") {
            console.log(err);
        }
    });
});

/**
 * Everything here is going to be exported
 */
module.exports = function(app, passport) {

  /**
   * Display the home page
   */
 app.get('/', function(req, res){
  res.render('index.ejs');
 });

 /**
  * Display the login page with the flash message 'loginMessage'
  */
 app.get('/login', function(req, res){
  res.render('login.ejs', {message:req.flash('loginMessage')});
 });

 /**
  * To check the user is authenticated or not by using authenticate method of passport,
  * the detail implementation can be checked in passport.js. Passport uses 'local-login' method.
  *
  * If the user is autenticated, it redirects to the user profile page
  * if not, it would stay in the login page
  *
  * Set the maxAge of the cookies in miliseconds
  */
 app.post('/login', passport.authenticate('local-login', {
  successRedirect: '/profile',
  failureRedirect: '/login',
  failureFlash: true
 }),
  function(req, res){
   if(req.body.remember){
    req.session.cookie.maxAge = 1000 * 60 * 3;
   }else{
    req.session.cookie.expires = false;
   }
   res.redirect('/');
  });

  /**
   * Display the signup page with the flash message 'signupMessage'
   */
 app.get('/signup', function(req, res){
  res.render('signup.ejs', {message: req.flash('signupMessage')});
 });

 /**
  * To check the user is authenticated or not by using authenticate method of passport,
  * the detail implementation can be checked in passport.js. Passport uses 'local-signup' method.
  *
  * If the user is autenticated, it redirects to the user profile page
  * if not, it would stay in the login page
  */
 app.post('/signup', passport.authenticate('local-signup', {
  successRedirect: '/profile',
  failureRedirect: '/signup',
  failureFlash: true
 }));

 /**
  * Display the page if the user forgot the password, with the messages.
  */
 app.get('/forget', function(req, res){
   res.render('forgetPassword.ejs', {message: req.flash('forgetMessage')});
 });

 /**
  * Use waterfall model which allows nested callbacks
  */
 app.post('/forget', function(req, res, next) {

  async.waterfall([
    /**
     * Generate a random bytes with length 20
     * Then store the random string to 'token' variable
     * @param done take the values as the parameters to the next step of the waterfall
     */
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
      var token = buf.toString('hex');
      done(err, token);
      });
    },

    /**
     * Search in the database to find the user who wants to reset the password
     * @param token - the random string generated from previous step of the waterfall
     * @param done - take the values as the parameters to the next step of the waterfall
     */
    function(token, done) {
      let username = req.body.username;
      let query = "SELECT * FROM users WHERE username = ?";
      pool.query(query, [username], function(err, rows) {
        if (err) {
          throw err;
        }
        // Check if the user is existed
        if (rows.length) {
          rows[0].resetPasswordToken = token;
          // The token is valid for 1 hour, which is 3600000 miliseconds
          rows[0].resetPasswordExpires = Date.now() + 3600000;

          // Querys to set the resetPasswordToken and resetPasswordExpires of user
          let query2 = "UPDATE users SET resetPasswordToken = '" +  rows[0].resetPasswordToken + "' WHERE username = ?";
          let query3 = "UPDATE users SET resetPasswordExpires = " + rows[0].resetPasswordExpires + " WHERE username = ?";

          //Perform the queires
          pool.query(query2, [username], function(err, result1) {
            if (err) {
              throw err;
            }
            pool.query(query3, [username], function(err, result2) {
              if (err) {
                throw err;
              }
               done (err, token, rows);
            });
          });
        } else {
          // If the user is not found in the database
          req.flash('forgetMessage', 'User email not found');
          res.redirect('/forget');
        }
      });
    },
    /**
     * This function is to send the password reset email to their university email
     * @param token - the random string generated from previous step of the waterfall
     * @param rows - the user founded from the previous step
     * @param done - Pass to the next function
     */
    function(token, rows, done) {
      // Create the transport, that holds the host email and its password
      var Transport = nodemailer.createTransport({
        service: '*** HOST SERVICE ***',
        auth: {
          user: '*** HOST EMAIL ***',
          pass: '*** HOST EMAIL PASSWORD ***'
        }
      });

      // The content sent to the user's university email
      var mailOptions = {
        to: rows[0].email,
        from: '*** HOST EMAIL ***',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      // Flash to notifies the user that the email has been sent
      Transport.sendMail(mailOptions, function(err) {
        req.flash('forgetMessage', 'An e-mail has been sent to ' + rows[0].email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ],
   function(err) {
    if (err) return next(err);
    // Stay in the forgot password page
    res.redirect('/forget');
  });
});


 /**
  * Take user to the reset password web page
  * If the token of the user is same as the token of the request then
  * display the password reset page to the user
  */
 app.get('/reset/:token', function(req, res){
   let sql1 = "SELECT * FROM users WHERE resetPasswordToken = ?";
   pool.query(sql1, [req.params.token], function(err, result) {
     if (result.length) {
       //This makes sure that token is not expired yet
      if (result[0].resetPasswordExpires > Date.now()) {
        res.render('reset', {token: req.params.token, message: req.flash('resetMessage')});
      } else {
        console.log("Token is expired");
      }
    } else {
      console.log("Token is invalid");
    }
   });
 });


 /**
  * Reset the password on the password reset page
  */
 app.post('/reset/:token', function(req, res) {
        // Find the user with the token of the request
       let sql1 = "SELECT * FROM users WHERE resetPasswordToken = ?";
       pool.query(sql1, [req.params.token], function(err, result) {
         // Check that the token is valid and not expired
         if (result.length) {
          if (result[0].resetPasswordExpires > Date.now()) {
            // Check that two passwords entered are same, and the length is equal
            // or greater than 8
            if (req.body.newPassword === req.body.rePassword && req.body.newPassword.length >= 8) {
              // Set the encrypted password to the database
              pool.query("UPDATE users SET password = '" + bcrypt.hashSync(req.body.newPassword, null, null) + "' WHERE resetPasswordToken = ?", [req.params.token], function(err) {
                if (err) {
                  throw err;
                }
                //console.log("Password changed successfully");
                //req.flash('resetMessage', "Password changed successfully");
              });
              // The query that set the resetPasswordToken of the user to NULL
              pool.query("UPDATE users SET resetPasswordToken = NULL WHERE username = ?", [result[0].username], function(err) {
                if (err) {
                  throw err;
                }
              });
              // The query that set the resetPasswordExpires of the user to NULL
              pool.query("UPDATE users SET resetPasswordExpires = NULL WHERE username = ?", [result[0].username], function(err) {
                if (err) {
                  throw err;
                }
              });
              // Redirects to home page
              res.redirect('/');
            }
            else {
              console.log("Invalid password (Length must be equal or greater than 8) or Passwords are not the same");
              req.flash('resetMessage', "Invalid password (Length must be equal or greater than 8) or Passwords are not the same");
              res.render('reset', {token: req.params.token, message: req.flash('resetMessage')});
            }
          } else {
            console.log("Token is expired");
            req.flash('resetMessage', "Token is expired");
            res.render('reset', {token: req.params.token, message: req.flash('resetMessage')});
          }
         } else {
           console.log("Token is invalid");
           req.flash('resetMessage', "Token is invalid");
           res.render('reset', {token: req.params.token, message: req.flash('resetMessage')});
         }
       });
 });


 /**
  * Display the user profile page with the flash messages
  * isLoggedIn checks the user is logged in or not
  */
 app.get('/profile', isLoggedIn, function(req, res){
     pool.query("SELECT * FROM tasks", (err, tasks) => {
         pool.query("SELECT * FROM submissions where user_id=?", [req.user.username], (err, submissions) => {
             for (var i = 0; i < tasks.length; i++) {
                 tasks[i].icon = tasks[i].type == 1 ? 'fa fa-sitemap' : 'fa fa-signal';
                 tasks[i].metric = tasks[i].type == 1 ? 'Accuracy' : "RMSE";
                 tasks[i].user_submissions = [];
                 submissions.forEach(s => {
                     if (s.task_id == tasks[i].name) {
                         s.moment = moment(s.timestamp).fromNow();
                         tasks[i].user_submissions.push(s);
                     }
                 });
                 tasks[i].attempts_remaining = tasks[i].submissions - tasks[i].user_submissions.length;
             }
             res.render('profile.ejs', {
                 user:req.user,
                 tasks: tasks,
                 submissions: submissions,
                 message: req.flash('profileMessage')
             });
         });
     });
 });


    /**
     * Submit a new results file to the server.
     */
    app.post('/:taskid/submit', isLoggedIn, function(req, res) {
        // check the number of submissions left of the user who requested
        let checkSubmissionsQuery = "SELECT * FROM submissions INNER JOIN tasks ON submissions.task_id=tasks.name WHERE user_id=? AND task_id=?;"
        pool.query(checkSubmissionsQuery, [req.user.username, req.params.taskid], (err, subs) => {
            if (err) {
                console.log(err);
                res.redirect("/profile");
            }
            // If the user still have the submissions left, then read in the file submitted
            // Otherwise, reject the user to upload file
            if (subs.length != 0 && subs.length >= subs[0].submissions) {
                req.flash('profileMessage',
                          "You cannot submit more files");
                res.redirect('/profile');
            }

            try{
                let file = req.files.fileUpload;

                /** Check file extension **/
                if (path.extname(file.name) != ".txt") {
                    req.flash('profileMessage',
                              "Not a valid file format. Please sumbit a txt file");
                    res.redirect('/profile');
                }

                let filecontents = file.data.toString();

                let elements = filecontents.split('\n').filter(w => w.length > 0);
                // The regular expression that checks the content input is correct or not
                // It can only be the numbers
                let validator = /^[+-]?((\d+(\.\d*)?)|(\.\d+))$/;
                let valid = true;

                // Get the number of elements of observed results
                let task = all_tasks.find(t => t.name == req.params.taskid);
                let filepath = path.resolve(__dirname, "../data/" + task.ground_truth);

                let taskfile = fs.readFileSync(filepath, 'utf-8');
                let task_gt = taskfile.split("\n").filter(w => w.length >  0);

                // Check every line in the file follow the regular expression or not
                for (let i = 0; i < elements.length; i++) {
                    if (!validator.test(elements[i])) {
                        valid = false;
                    }
                }

                // If predicted data and observed data have different number of elements
                // then set 'valid' to false
                if (task_gt.length != elements.length) {
                    valid = false;
                }

                // If the 'valid' attribute is still true here, then accept the file uploaded
                // Reduce the number of submissions left for the user by 1, then calculate the accuracy of
                // the data uploaded
                if (!valid) {
                    req.flash('profileMessage',
                              "The content of the file is not right formatted");
                    res.redirect('/profile');
                }

                let score = calculator.calculate(task.type, task_gt, elements);

                let isql = "INSERT INTO submissions  (user_id, task_id, score, file) VALUES (?, ?, ?, ?)";
                pool.query(isql, [req.user.username, req.params.taskid, score, filecontents]);

                req.flash('profileMessage',
                          "Your score for your new submission is " + score);
                res.redirect('/profile');
            } catch(err) {
                if (err instanceof TypeError) {
                    console.log(err);
                    console.log("Please do not submit an empty file");
                    req.flash('profileMessage', "Please do not submit an empty file");
                    res.redirect('/profile');
                }
            }
        });
    });

    /**
     * Display the result page
     */
    app.get('/:taskid/leaderboard', isLoggedIn, function(req, res){
        let task = all_tasks.find(t => t.name == req.params.taskid);
        let metric = task.type == 'classification' ? 'Accuracy' : "RMSE";
        let sqlmetric = task.type == 'classification' ? "MAX" : "MIN";

        let sql = "SELECT user_id, " + sqlmetric + "(score) as max_score from submissions WHERE task_id=? GROUP BY user_id";
        pool.query(sql, [req.params.taskid], function(err, result) {
            if (task.type == 'classification') {
                result.sort( (a,b) => b.max_score - a.max_score);
            } else {
                result.sort( (a,b) => a.max_score - b.max_score);
            }
            if (err) throw err;
            res.render('result.ejs', {
                user:req.user,
                result:result,
                metric: metric,
                title: task.name
            });
        });
    });

 /**
  * Return to profile page from the result page
  */
  app.post('/backProfile', isLoggedIn, function(req, res){
    res.redirect('/profile');
  });

  /**
   * Redirect to the home page
   * And removes the authentication
   */
 app.get('/logout', function(req,res){
  req.logout();
  res.redirect('/');
 });

 /**
  * Check the user is logged in or not, if it is not logged in, then redirects to home page
  */
function isLoggedIn(req, res, next){
 if(req.isAuthenticated())
  return next();

 res.redirect('/');
  }
}
