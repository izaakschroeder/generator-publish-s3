
var url = require('url'),
	gulp = require('gulp'),
	s3 = require('vinyl-s3');

// Publish everything to an S3 bucket.
gulp.task('publish', () =>
	gulp.src('build/**/*')
		.pipe(s3.dest(url.format({
			protocol: 's3',
			host: process.env['DEPLOY_BUCKET'],
			pathname: '/',
			query: {
				// Since this is a static site and all assets are versioned by
				// their hash, we effectively disable cache expiration (i.e.
				// things are cached forever). Anything that isn't versioned
				// (i.e. HTML files) is explicitly invalidated anyway.
				CacheControl: 'max-age=315360000',
				Expires: (new Date('Jan 1 2099')).toISOString()
			}
		})))
);
