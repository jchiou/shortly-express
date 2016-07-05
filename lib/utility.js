var request = require('request');
var session = require('express-session');
// var cookieParse = require('cookie-parser');
var User = require('../app/models/user');

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/


exports.isLoggedIn = function(req, res, callback) {
  var session = req.session;
  var match, cookie;
  var cookieHeaders = req.headers['cookie'];

  if (cookieHeaders) {
    match = req.headers['cookie'].match(/cookie=([^;]*)/);
  }
  cookie = match ? match[1] : undefined;

  console.log('sessionId in the "isLoggedIn" function is: ', session.id);
  console.log('request headers cookies: ', cookie);

  if (cookie) {
    console.log('cookie exists: ', cookie);
    new User({username: cookie}).fetch().then(function(found) {
      if (found) {
        if (found.get('sessionId') === session.id) {
          console.log('sessionId matches, login successful!');
          callback();
        } else {
          console.log('sessionId does not match, redirect to login!');
          res.redirect('login');
        }
      } else {
        console.log('Username from cookie not found in database! Redirecting to login page');
        res.redirect('login');
      }
    });
  } else {
    console.log('cookies does not exist');
    res.redirect('login');
  }
};

exports.setCookieHelper = function(User, response) {
  // console.log('username is: ', User.get('username'));
  response.cookie('cookie', User.get('username'), {maxAge: 900000, httpOnly: false});
  // console.log('response cookie set to: ', response.headers);
};