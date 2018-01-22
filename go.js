// ssh-keygen -f host.key -N '' -t rsa

const
	fs = require('fs'),
	crypto = require('crypto'),
	inspect = require('util').inspect,
	ssh2 = require('ssh2'),
	utils = ssh2.utils,
	blessed = require('blessed')

let pubKey = utils.genPublicKey(utils.parseKey(fs.readFileSync('authorized_keys')))

const processConnection = screen => {
	screen.data.main = blessed.box({
		parent: screen,
		width: '80%',
		height: '90%',
		border: 'line',
		content: 'Hello!',
		style: {
			fg: 'white',
			bg: 'red',
		}
	})
	
	screen.key('i', () => {
		screen.data.main.style.bg = 'blue'
		screen.render()
	})
	
	screen.key(['C-c', 'q'], (ch, key) => {
		screen.destroy()
	})
	
	screen.render()
}

new ssh2.Server({
	hostKeys: [fs.readFileSync('host.key')]
}, client => {
	console.log(' -- new connection')
	client.on('authentication', ctx => {
		if (ctx.method === 'password') {
			console.log(` -- login: ${ctx.username} / password: ${ctx.password}`)
			// publickey only
			ctx.reject()
		} else if (
			ctx.method === 'publickey' &&
			ctx.key.algo === pubKey.fulltype &&
			crypto.timingSafeEqual(ctx.key.data, pubKey.public)
		) {
			if (ctx.signature) {
				console.log(` -- pubkey signature check: ${ctx.username}`)
				if (crypto.createVerify(ctx.sigAlgo).update(ctx.blob).verify(pubKey.publicOrig, ctx.signature)) {
					ctx.accept()
				} else {
					ctx.reject()
				}
			} else {
				ctx.accept()
			}
		} else {
			console.log(' -- pubkey check')
			ctx.reject()
		}
	})
	client.on('end', () => {
		console.log(' -- client disconnected')
	})
	client.on('ready', () => {
		console.log(' -- client authenticated')
		client.on('session', (accept, reject) => {
			let screen
			let term
			let session = accept()
			session.on('shell', (accept, reject) => {
				console.log(` -- shell request`)
				let stream = accept()
				screen = blessed.screen({
					smartCSR: true,
					terminal: 'xterm-256color',
					fullUnicode: true,
					input: stream,
					output: stream,
				})
				screen.on('destroy', () => {
					stream.exit(0)
					stream.end()
				})
				processConnection(screen)
			})
			session.on('pty', (accept, reject, info) => {
				console.log(` -- pty requested: ${JSON.stringify(info)}`)
				term = info.term
				accept()
			})
			session.on('window-change', (accept, reject, info) => {
				if (accept) accept()
				console.log(`${info.cols} x ${info.rows}`)
				if (screen) {
					screen.cols = info.cols
					screen.rows = info.rows
				}
				session.emit('resize')
			})
		})
		client.on('close', () => {
			if (screen && !screen.destroyed) {
				screen.destroy()
			}
		})
		// client.on('request', (accept, reject, name, info) => {
		// 	console.log(` -- request: ${name}`)
		// 	console.log(info)
		// 	reject()
		// })
	})
}).listen(50505, '127.0.0.1', function() {
	console.log(` -- server ready at port ${this.address().port}`)
})