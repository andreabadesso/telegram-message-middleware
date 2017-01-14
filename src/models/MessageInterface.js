'use strict';

/* This serves as a extensible base for connecting
 * message services
 *
 * Should support multiple protocols, HTTP, AMQP, MQTT
 */

const restify = require('restify'),
        events = require('events'),
        request = require('request-json'),
        bunyan = require('bunyan');

const logger = bunyan.createLogger({
    name: 'MessageInterface'
});

class MessageInterface extends events.EventEmitter {
    constructor(server) {
        super();

        this.name = '';
        this.host = '';
        this.protocol = 'http';
        this.port = null; 
        this.client = null;
        this.server = server;
        this.serverUrl = `http://localhost:${process.env.TELEGRAM_PORT || 3002}/`;
    }

    _getUrlString() {
        return `${this.protocol}://${this.host}:${this.port}`;
    }

    _getServerUrlString() {
        return this.serverUrl;
    }

    registerComplete(err) {
        logger.info('Register complete');   
        if (err) {
            logger.info('ERROR => ', err);
        } else {
            logger.info(`Registered middleware on ${this.name} bot`);
        }
    }

    configure(host, port, protocol) {
        this.host = host;
        this.port = port;
        if (protocol) {
            this.protocol = protocol;
        }

        if (this.protocol === 'http') {
            this.client = request.createClient(this._getUrlString());
        }
    }

    register() {
        if (this.protocol === 'http') {
            logger.info('Http protocol, registering');
            let url = `${this._getUrlString()}/${this.name}/middleware`;
            this.client.post(url, {
                url: this._getServerUrlString()
            }, this.registerComplete.bind(this));
        }
    }
}

module.exports = MessageInterface;
