
var AWS = require('aws-sdk');
var generators = require('yeoman-generator');
var Promise = require('bluebird');
var _ = require('lodash');
var open = require('open');
var util = require('../../lib/util');
var policies = require('../../lib/policies');
var url = require('url');
var tld = require('tldjs');

AWS.config.update({"region": "us-west-2"});

module.exports = generators.Base.extend({
	initializing: function() {
		this.s3 = new AWS.S3();
		this.route53 = new AWS.Route53();
	},
	prompting: function () {
		var done = this.async();
		this.prompt([{
			type: 'input',
			name: 'url',
			message: 'URL'
		}, {
			type: 'input',
			name: 'name',
			message: 'Bucket name',
			default: function(answers) {
				return url.parse(answers.url).hostname;
			}
		}], function (answers) {
			this.name = answers.name;
			this.url = answers.url;
			done();
		}.bind(this));
	},

	/**
	 * Setup an S3 bucket with sane permissions and a placeholder file.
	 */
	bucket: function() {
		var name = this.name;
		var done = this.async();
		var _this = this;
		var placeholder = this.fs.read(this.templatePath('coming-soon.html'));

		var s3 = util.promised(this.s3, [
			'headBucket',
			'createBucket',
			'putBucketWebsite',
			'putBucketPolicy',
			'headObject',
			'putObject'
		]);

		// FIXME: LOL DIS HARDCODED
		this.target = 's3-website-us-west-2.amazonaws.com';

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
		}).then(function(bucket) {
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
		}).then(function() {
			return s3.headObject({
				Bucket: name,
				Key: 'index.html'
			}).catch(util.error({ code: 'NotFound' }), function(err) {
				_this.log('Adding placeholder page.');
				return s3.putObject({
					Bucket: name,
					Key: 'index.html',
					ContentType: 'text/html',
					Body: placeholder
				})
			});
		}).nodeify(done);
	},

	/**
	 * Setup a cloudfront distribution that points to the previously setup bucket.
	 */
	cdn: function() {
		/*var done = this.async();
		Promise.resolve().then(function() {
			return cloudfront.putDistribution();
		}).nodeify(done);*/
	},

	/**
	 * Point a domain to either the previously setup bucket or CDN.
	 */
	domain: function() {
		var done = this.async();
		var domain = url.parse(this.url).hostname;
		var zone = tld.getDomain(domain);
		var target = this.target;

		var route53 = util.promised(this.route53, [
			'listHostedZonesByName',
			'changeResourceRecordSets'
		]);

		this.log('Mapping', domain, '->', target);

		// They are literally hardcoded.
		// http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region

		Promise.resolve().then(function() {
			return route53.listHostedZonesByName({
				DNSName: zone + '.',
				MaxItems: '1' // This actually has to be a string
			}).then(function(zones) {
				if (zones.HostedZones.length > 0) {
					var id = zones.HostedZones[0].Id;
					id = /^\/hostedzone\/(.+)$/.exec(id);
					if (id) {
						return id[1];
					} else {
						return Promise.reject();
					}
				} else {
					return Promise.reject();
				}
			});
		}).then(function(id) {
			return route53.changeResourceRecordSets({
				HostedZoneId: id,
				ChangeBatch: {
					Changes: [{
							Action: 'UPSERT',
							ResourceRecordSet: {
								Name: domain + '.',
								Type: 'A',
								AliasTarget: {
									DNSName: target,
									EvaluateTargetHealth: false,
									HostedZoneId: 'Z3BJ6K6RIION7M'
								}
							}
					}]
				}
			});
		}).nodeify(done);
	},
	end: function() {
		open(this.url);
	}
});
