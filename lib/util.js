
var Promise = require('bluebird');
var _ = require('lodash');

function promised(obj, keys) {
  return _.mapValues(_.pick(obj, keys), function(f) {
      return Promise.promisify(f, obj);
    }, this);
}

function error(predicate) {
  return function(object) {
    return _.isMatch(object, predicate);
  }
}

function applyPolicyStatement(policy, statement) {
	policy = _.clone(policy);
	var entry = _.find(policy.Statement, { Sid: statement.Sid });
	if (!entry) {
		entry = { };
		policy.Statement.push(entry);
	}
	_.assign(entry, statement);
	return policy;
}

function ensurePolicy(s3, options) {
	s3 = promised(s3, [
		'getBucketPolicy',
		'putBucketPolicy'
	]);

	return Promise.resolve().then(function() {
		return s3.getBucketPolicy({
			Bucket: options.Bucket,
		}).then(function(result) {
			return JSON.parse(result.Policy);
		}).catch(error({ code: 'NoSuchBucketPolicy' }), function() {
			return Promise.resolve({
				"Version": "2012-10-17",
				"Statement": [ ]
			});
		});
	}).then(function(policy) {
		return applyPolicyStatement(policy, options.Statement);
	}).then(function(policy) {
		return s3.putBucketPolicy({
			Bucket: options.Bucket,
			Policy: JSON.stringify(policy)
		});
	});
}

module.exports = {
	promised: promised,
	error: error,
	applyPolicyStatement: applyPolicyStatement,
	ensurePolicy: ensurePolicy
};
