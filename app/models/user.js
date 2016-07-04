var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,
  links: function() {
    return this.hasMany(Link);
  },
  // hash password
  // include salt property
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var salt = bcrypt.genSaltSync(10);
      model.set('salt', salt);
      var hash = bcrypt.hashSync(model.get('password'), salt);
      model.set('password', hash);
    });
  }
});

module.exports = User;

// new User(username)