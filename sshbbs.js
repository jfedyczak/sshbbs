// ssh-keygen -f host.key -N '' -t rsa

const
	crypto = require('crypto'),
	ssh2 = require('ssh2'),
	utils = ssh2.utils,
	blessed = require('blessed')

const processConnection = (screen, login) => {
	let display = blessed.box({
		parent: screen,
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		border: {
			type: 'line',
		},
		content: `Hello ${login}!`,
		style: {
			fg: 'white',
			bg: 'black',
			border: {
				fg: 'grey',
			}
		}
	})
	
	screen.key(['C-c', 'q'], (ch, key) => {
		screen.destroy()
	})
	
	screen.render()
}

module.exports = (options = {}, connectionCallback, callback = null) => {
	options.host = options.host || '127.0.0.1'
	options.port = options.port || '52222'
	options.passwords = options.passwords || {}
	options.keys = options.keys || {}
	connectionCallback = connectionCallback || processConnection
	Object.keys(options.keys).forEach(k => {
		options.keys[k] = utils.genPublicKey(utils.parseKey(options.keys[k]))
	})
	return new Promise((resolve, reject) => {
		new ssh2.Server({
			hostKeys: [options.hostKey]
		}, client => {
			let login
			client.on('authentication', ctx => {
				if (ctx.method === 'password') {
					if ((ctx.username in options.passwords) && (ctx.password === options.passwords[ctx.username])) {
						ctx.accept()
						login = ctx.username
					} else {
						ctx.reject()
					}
				} else if (ctx.method === 'publickey' && (ctx.username in options.keys)) {
					if (
						ctx.key.algo === options.keys[ctx.username].fulltype &&
						crypto.timingSafeEqual(ctx.key.data, options.keys[ctx.username].public)
					) {
						if (ctx.signature) {
							if (crypto.createVerify(ctx.sigAlgo).update(ctx.blob).verify(options.keys[ctx.username].publicOrig, ctx.signature)) {
								ctx.accept()
								login = ctx.username
							} else {
								ctx.reject()
							}
						} else {
							ctx.accept()
						}
					} else {
						ctx.reject()
					}
				} else {
					ctx.reject()
				}
			})
			client.on('end', () => {
				// console.log(' -- client disconnected')
			})
			client.on('error', (e) => {
				console.log(e)
			})
			client.on('ready', () => {
				// console.log(' -- client authenticated')
				client.on('session', (accept, reject) => {
					let screen
					let term
					let stream
					let session = accept()
					session.on('shell', (accept, reject) => {
						stream = accept()
						stream.columns = +term.cols
						stream.rows = +term.rows
						screen = blessed.screen({
							smartCSR: true,
							terminal: term.term,
							fullUnicode: true,
							input: stream,
							output: stream,
						})
						screen.on('destroy', () => {
							stream.exit(0)
							stream.end()
						})
						connectionCallback(screen, login)
					})
					session.on('pty', (accept, reject, info) => {
						term = info
						accept()
					})
					session.on('window-change', (accept, reject, info) => {
						if (accept) accept()
						if (screen) {
							stream.columns = +info.cols
							stream.rows = +info.rows
							stream.emit('resize')
						}
					})
				})
				client.on('close', () => {
					if (screen && !screen.destroyed) {
						screen.destroy()
					}
				})
			})
		}).listen(options.port, options.host, function() {
			resolve(this.address().port)
			if (callback !== null) {
				callback(null, this.address().port)
			}
		})
	})
}

