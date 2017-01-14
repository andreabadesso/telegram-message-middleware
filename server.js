'use strict';

const   morgan              = require('morgan'),
        restify             = require('restify'),
        errorhandler        = require('errorhandler'),
        ExternalInterface   = require('./src/models/ExternalInterface'),
        bunyan              = require('bunyan');

const logger = bunyan.createLogger({
    name: 'MiddlewareBot'
});

// Connect different chat interfaces
const Telegram = require('./src/telegram');

const server = restify.createServer();

server.use(restify.bodyParser({
    mapParams: false
}));

server.use(morgan('dev', {
    skip: function (req, res) {
        return res.statusCode < 400;
    }
}));

if (process.env.NODE_ENV === 'development') {
    //server.use(errorhandler());
}

let telegram = new Telegram(server, '127.0.0.1', process.env.TELEGRAM_PORT || 3002);
let externaInterface = new ExternalInterface(server, [telegram]);

server.listen(process.env.MIDDLEWARE_PORT || 3001, x => {
    logger.info('%s listening at %s', server.name, server.url);
    /*server.router.routes.POST.forEach(x => {
        logger.info(x.spec.path);
    });*/
});
