// ssh-keygen -f host.key -N '' -t rsa

const
	fs = require('fs'),
	crypto = require('crypto'),
	inspect = require('util').inspect,
	ssh2 = require('ssh2'),
	utils = ssh2.utils

let pubKey = utils.genPublicKey(utils.parseKey(fs.readFileSync('authorized_keys')))
	
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
			let session = accept()
			session.once('shell', (accept, reject) => {
				console.log(` -- shell request`)
				let stream = accept()
				stream.on('data', (data) => {
					console.log(data.toString('utf8'))
				})
				stream.write(` -- hello, it is ${new Date()}\r\n\r\n`)
				setTimeout(() => {
					stream.exit(0)
					stream.end()
				}, 5000)
			})
			session.on('pty', (accept, reject, info) => {
				console.log(` -- pty requested: ${JSON.stringify(info)}`)
				accept()
			})
		})
		client.on('request', (accept, reject, name, info) => {
			console.log(` -- request: ${name}`)
			console.log(info)
			reject()
		})
	})
}).listen(50505, '127.0.0.1', function() {
	console.log(` -- server ready at port ${this.address().port}`)
})