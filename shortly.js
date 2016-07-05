var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');
var morgan = require('morgan');
// var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(partials());

// app.use(cookieParser());

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'keyboard cat',
  // cookie: { secure: true },
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(__dirname + '/public'));

app.get('/', 
function(req, res) {
  util.isLoggedIn(req, res, function() {
    res.render('index');
  });
});

app.get('/create', 
function(req, res) {
  util.isLoggedIn(req, res, function() {
    res.render('index');
  });
});

app.get('/links', 
function(req, res) {
  util.isLoggedIn(req, res, function() {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });
  }); 
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

app.post('/signup',
  function(req, res) {
    var username = req.body.username;
    var password = req.body.password;

    new User({username: username}).fetch().then(function(found) {
      if (found) {
        alert('That Username already exists!');
        res.redirect('signup');
      } else {
        Users.create({
          username: username,
          password: password,
        })
        .then(function(newUser) {
          newUser.set('sessionId', req.session.id);
          util.setCookieHelper(newUser, res);
          res.redirect('/');
        });
      }
    });
  });

app.post('/login',
  function(req, res) {
    var username = req.body.username;
    var password = req.body.password;

    new User({username: username}).fetch().then(function(found) {
      if (found) {
        bcrypt.compare(password, found.attributes.password, function(err, match) {
          if (match) {
            found.set({'sessionId': req.session.id}).save();
            console.log('sessionId on user set to: ', found.get('sessionId'));
            util.setCookieHelper(found, res);            
            res.redirect('/');
          } else {
            alert('wrong username or password!');
            res.redirect('/login'); 
          }
        });
      } else {
        res.redirect('/login');
      }
    });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/logout', function(req, res) {
  res.clearCookie('cookie');
  req.session.destroy(function(err) {
    if (err) {
      throw err;
    }
    res.redirect('/login');
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
