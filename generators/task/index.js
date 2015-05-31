
var generators = require('yeoman-generator');
var path = require('path');

module.exports = generators.Base.extend({
	initializing: function() {
		var taskPath = 'tasks';
		this.file = this.destinationPath(
			path.join(taskPath, 'publish' + '.task.js')
		);
	},
	prompting: function () {

	},
	writing: function() {
		var template = 'publish.task.js';

		// TODO: ensure gulp + vinyl-s3 in package.json

		if (!this.fs.exists(this.file)) {
			this.fs.copyTpl(
				this.templatePath(template),
				this.file,
				{
					name: this.name
				}
			);
		}
	},
	end: function() {
		open(this.file);
	}
});
