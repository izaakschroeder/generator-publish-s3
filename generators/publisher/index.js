
var AWS = require('aws-sdk');
var generators = require('yeoman-generator');
var Promise = require('bluebird');
var _ = require('lodash');
var util = require('../../lib/util');
var policies = require('../../lib/policies');



AWS.config.update({"region": "us-west-2"});

module.exports = generators.Base.extend({
	initializing: function() {
    this.s3 = new AWS.S3();
		this.iam = new AWS.IAM();
	},
	prompting: function () {
		var done = this.async();
		this.prompt([{
			type: 'input',
			name: 'name',
			message: 'Bucket name',
			choices: this.profiles
		}, {
			type: 'input',
			name: 'publisher',
			message: 'Publisher name'
		}], function (answers) {
			this.name = answers.name;
			this.publisher = answers.publisher;
			done();
		}.bind(this));
	},
	bucket: function() {
    var name = this.name;
    var publisher = this.publisher;
    var done = this.async();
    var _this = this;

		var iam = util.promised(this.iam, [
      'getUser',
			'createUser',
			'createAccessKey'
		]);

    Promise.resolve().then(function() {
      _this.log('Setting up user.');
      return iam.getUser({
        UserName: publisher
      }).catch(util.error({ code: 'NoSuchEntity' }), function() {
        return iam.createUser({
          UserName: publisher
        });
      }).then(function(response) {
        return response.User
      });;
    }).then(function(user) {
      _this.log('Enabling bucket write.');
      return util.ensurePolicy(_this.s3, {
        Bucket: name,
        Statement: policies.publish({
          bucket: name,
          principal: user.Arn
        })
      });
    }).nodeify(done);
	},
	end: function() {

	}
});
