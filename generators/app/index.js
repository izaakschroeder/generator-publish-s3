
var AWS = require('aws-sdk');
var generators = require('yeoman-generator');
var Promise = require('bluebird');
var _ = require('lodash');

var util = require('../../lib/util');
var policies = require('../../lib/policies');


module.exports = generators.Base.extend({
	initializing: function() {
    this.s3 = new AWS.S3();
	},
	prompting: function () {
		var done = this.async();
		this.prompt({
			type: 'input',
			name: 'name',
			message: 'Bucket name',
			choices: this.profiles
		}, function (answers) {
			this.name = answers.name;
			done();
		}.bind(this));
	},
	bucket: function() {
    var name = this.name;
    var done = this.async();
    var _this = this;

    var s3 = util.promised(this.s3, [
      'headBucket',
      'createBucket',
      'putBucketWebsite',
      'putBucketPolicy'
    ]);


    Promise.resolve().then(function() {
      _this.log('Creating bucket.');
      return s3.createBucket({
      	Bucket: name,
      	ACL: 'private',
      	CreateBucketConfiguration: {
      		LocationConstraint: 'us-west-2'
      	}
      }).catch(util.error({ code: 'Forbidden' }), function(err) {
        return Promise.reject();
      }).catch(util.error({ code: 'BucketAlreadyOwnedByYou' }), function() {
        return Promise.resolve();
      });
    }).then(function() {
      _this.log('Enabling website configuration.');
      return s3.putBucketWebsite({
        Bucket: name,
        WebsiteConfiguration: {
          ErrorDocument: {
            Key: 'index.html'
          },
          IndexDocument: {
            Suffix: 'index.html'
          }
        }
      });
    }).then(function() {
      _this.log('Enabling bucket read.');
      return util.ensurePolicy(_this.s3, {
        Bucket: name,
        Statement: policies.public({ bucket: name })
      });
    }).nodeify(done);
	},
	end: function() {

	}
});
