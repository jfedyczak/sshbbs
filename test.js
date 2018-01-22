const 
	fs = require('fs'),
	blessed = require('blessed'),
	sshbbs = require('./sshbbs.js')

sshbbs({
	host: '127.0.0.1',
	port: '52222',
	passwords: {
		hello: 'world',
	},
	keys: {
		test: fs.readFileSync('authorized_keys'),
	},
	hostKey: fs.readFileSync('host.key'),
}, (screen, login) => {
	// This will be called on every successful connection
	let mainScreen = blessed.box({
		parent: screen,
		top: 0,
		left: 0,
		width: '100%',
		height: '50%',
		align: 'center',
		valign: 'middle',
		border: {
			type: 'line',
		},
		content: `Welcome, ${login}! Press 'q' to quit.`,
		style: {
			fg: 'yellow',
			bg: 'black',
			border: {
				fg: 'grey',
			}
		}
	})
	
	let counter = blessed.box({
		parent: screen,
		top: '50%',
		left: 0,
		width: '100%',
		height: '50%',
		align: 'center',
		valign: 'middle',
		border: {
			type: 'line',
		},
		content: `Here we go!`,
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
	
	let cnt = 0
	let intrv = setInterval(() => {
		if (screen.destroyed) {
			clearInterval(intrv)
			return
		}
		cnt++
		counter.setContent(`Counter ${cnt}`)
		console.log(cnt)
		screen.render()
	}, 1000)

	screen.render()
}).then((port) => {
	console.log(` -- listening at ${port}`)
})