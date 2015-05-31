function read(options) {
	return {
		"Sid": "public",
		"Effect": "Allow",
		"Principal": "*",
		"Action": "s3:GetObject",
		"Resource": "arn:aws:s3:::" + options.bucket + "/*"
	};
}

function write(options) {
	return {
		"Sid": "publish-" + options.principal,
		"Effect": "Allow",
		"Principal": {
			"AWS": options.principal
		},
		"Action": [
			"s3:GetObjectAcl",
			"s3:DeleteObject",
			"s3:GetObject",
			"s3:PutObjectAcl",
			"s3:ListMultipartUploadParts",
			"s3:PutObject"
		],
		"Resource": "arn:aws:s3:::" + options.bucket + "/*"
	};
}

module.exports = {
	public: read,
	publish: write
};
