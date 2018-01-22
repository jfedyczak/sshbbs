# sshbbs

Simple wrapper over [mscdex/ssh2](https://github.com/mscdex/ssh2) to make your in-app SSH server using [chjj/blessed](https://github.com/chjj/blessed) for presentation layer.

## Installation

	npm install sshbbs

or

	yarn add sshbbs

## Usage

Generate your host keys using:

	ssh-keygen -f host.key -N '' -t rsa

Use following example as a reference:

```js
const 
    fs = require('fs'),
    blessed = require('blessed'),
    sshbbs = require('sshbbs')

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
```
	
This will start a SSH server on `127.0.0.1:52222`, which accepts login `hello` with password `world` or login `test` with public key in `authorized_keys` file.

Connect using:

	ssh -p 52222 hello@127.0.0.1

Have fun!