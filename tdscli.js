'use strict';

let Q = require('q'),
	path = require('path'),
	os = require('os'),
	spawn = require('child_process').spawn;

const DEFAULT_VERSION = 11.4,
	SUPORTED_VERSIONS = [11.3, 11.4];

const DEFAULT_OPTIONS = {
	silent: false,
	debug: false,
	version: DEFAULT_VERSION
};

class TDS {

	constructor(options) {
		this.findJava();

		this.options = Object.assign({}, DEFAULT_OPTIONS, options || {});
		this.stdout = "";
		this.stderr = "";

		if (SUPORTED_VERSIONS.indexOf(this.options.version) === -1) {
			this.options.version = DEFAULT_VERSION;
		}
	}

	compile(options) {
		return this._exec('compile', options);
	}

	remove(options) {
		return this._exec('deleteProg', options);
	}

	generatePatch(options) {
		return this._exec('patchgen', options);
	}

	applyPatch(options) {
		return this._exec('patchapply', options);
	}

	listPatch(options) {
		return this._exec('patchinfo', options);
	}

	defragRPO(options) {
		return this._exec('defragRPO', options);
	}

	clearLog(options) {
		return this._exec('clearLog', options);
	}

	_exec(command, options) {
		var _this = this,
			deferred = Q.defer(),
			args = this._get_args(command, options),
			proc = null;

		this.stdout = "";
		this.stderr = "";

		if (this.options.debug) {
			console.log("COMMAND:\n" + this.java + ' ' + args.join(' '));
		}

		proc = spawn(this.java, args, {
			cwd: path.normalize(__dirname + path.sep),
			stdio: ['ignore', 'pipe', 'pipe']
		});

		proc.stdout.on('data', function(data) {
			var out = data.toString('utf8');
			out = out.replace(/^>>>>> Compil.*(.|[\r\n])*?>>>>\s*$/gm, "0");
			out = out.replace(/^>>>>.*(.|[\r\n])*?>>>>\s*$/gm, "");

			this.stdout += out;

			if ((!_this.options.silent) && (out.trim())) {
				console.log(out);
			}
		});

		proc.stderr.on('data', function(data) {
			var err = data.toString('utf8');
			err = err.replace(/^Warning: NLS unused message: (.*)$/gm, "");

			this.stderr += err;

			if ((!_this.options.silent) && (err.trim())) {
				console.error(err);
			}
		});

		proc.on('close', function(code) {
			if (code !== 0) {
				deferred.reject(new Error("Tdscli process exited with code " + code));
			}
			else {
				deferred.resolve();
			}
		});

		return deferred.promise;
	}

	_get_args(target, options) {
		let args = [
			'-Dfile.encoding=UTF-8',
			'-jar',
			path.join(__dirname, `tdscli-${this.options.version}.jar`)
		];

		args.push(target);

		this.changeOptions(options);

		var keys = Object.keys(options);
		var index = keys.indexOf("workspace");
		if (index > -1) {
			keys.splice(index, 1);
		}

		keys.forEach(function(key, index) {
			var value = key + "=";

			if (Array.isArray(options[key])) {
				value += options[key].join(";");
			}
			else {
				value += options[key];
			}

			args.push(value);
		});

		return args;
	}

	findJava() {
		switch (os.platform()) {
			case 'win32':
				if (process.env.JAVA_HOME) {
					this.java = path.join(process.env.JAVA_HOME, 'bin', 'java');
				}
				else if (process.env.JRE_HOME) {
					this.java = path.join(process.env.JRE_HOME, 'bin', 'java');
				}

				this.java += '.exe';

				break;
			case 'darwin':
			case 'linux':
				this.java = 'java';

				break;
		}

	}

	changeOptions(options) {
		if (options.serverType !== undefined) {
			if (options.serverType.toUpperCase() !== 'ADVPL')
				options.serverType = '4GL';
		}

		if (typeof options.recompile === 'boolean') {
			options.recompile = options.recompile ? 't' : 'f';
		}
	}

}

module.exports = TDS;
