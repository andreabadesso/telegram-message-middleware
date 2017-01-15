'use strict';

const request = require('request-json'),
        async = require('async'),
        moment = require('moment'),
        uuid = require('node-uuid'),
        _ = require('lodash'),
        bunyan = require('bunyan');


const logger = bunyan.createLogger({
    name: 'ExternalInterface'
});

/* This will expose http methods and connect
 * them to the available bots
 */
class ExternalInterface {

    constructor(server, botList) {
        this.server = server;
        this.registeredPeers = {};
        this.botList = botList;
        this.methodList = ['private_message', 'group_message'];

        this.registerRoutes();
        this.registerListeners();
    }

    handleEvent(method, data) {
        let time = moment().toDate();

        // Set date to today
        data.time = time;
        data.text = data.body;

        delete data.body;

        if (method === 'private_message') {
            console.log('Private message', data);
            async.parallel(_.map(this.registeredPeers,
                (peer => {
                    return callback => {
                        peer.post('private_message', message, err => {
                            if (err) logger.error(err);
                            callback(err);
                        });
                    };
                }), (err, results) => {
                    if (!err) {
                        logger.debug('OK');
                    } else {
                        logger.error('ERROR COMMUNICATING WITH PEER', err);
                    }
                }
            ));
        } else if (method === 'group_message') {
            async.parallel(
                _.map(this.registeredPeers,(peer => {
                    return callback => {
                        peer.post(`groups/${data.id}/messages`, data, (err, req) => {
                            if (err) logger.error(err);
                            callback(err);
                        });
                    };
                }), (err, results) => {
                    if (!err) {
                        logger.debug('OK');
                    } else {
                        logger.error('ERROR COMMUNICATING WITH PEER', err);
                    }
                }
            ));
        } else {
            logger.error('Unknown method');
        }
    }

    registerPeer(req, res, next) {
        let url = req.body.url,
            hash = uuid.v4();
        this.registeredPeers[hash] = request.createClient(url);
        logger.info(`Peer registered. ${url}`);

        res.send({
            'status': 200,
            'hash': hash
        });

        next();
    }

    checkPeer (req, res, next) {
        let isPeerRegistered = this.registeredPeers[req.params.hash];


        if (isPeerRegistered) {
            res.send({
                'status': 200
            });
        } else {
            res.send({
                'status': 404
            });
        }
    }

    updateUserGroup(req, res, next) {
        logger.info('[X] Updating user group');
        let service         = req.params.service, // telegram, whatsapp, messenger...
            serviceInstance = this.botList.find(x => {
                return x.name == service;
            });

        // Call the method
        serviceInstance.renameUserGroup(req.body.name, req.body.newName, (err, data) => {
            if (err) {
                return res.send({
                    status: 403,
                    message: 'Error while renaming the group.'
                });
            }

            res.send(data.body);
        });

        return next();
    }

    updateUserGroupById(req, res, next) {
        console.log('updating user group');
        let service         = req.params.service, // telegram, whatsapp, messenger...
            serviceInstance = this.botList.find(x => {
                return x.name == service;
            });

        // Call the method
        serviceInstance.renameUserGroupById(req.params.id, req.body.newName, (err, data) => {
            if (err) {
                return res.send({
                    status: 403,
                    message: 'Error while renaming the group.'
                });
            }

            res.send(data.body);
        });

        return next();
    }

    createUserGroup(req, res, next) {
        let service         = req.params.service, // telegram, whatsapp, messenger...
            serviceInstance = this.botList.find(x => {
                return x.name == service;
            });

        // Call the method
        serviceInstance.createUserGroup(req.body.name, req.body.users, (err, group) => {
            if (err) {
                return res.send({
                    status: 403,
                    message: 'Error while creating the group.'
                });
            }

            res.send(group.body);
        });

        return next();
    }

    deleteUserGroup(req, res, next) {
        let service         = req.params.service, // telegram, whatsapp, messenger...
            groupId         = req.params.id,
            groupDeleted    = false,
            serviceInstance = this.botList.find(x => {
                return x.name == service;
            });

        // Call the method
        groupDeleted = serviceInstance.deleteUserGroup(groupId);

        if (groupDeleted) {
            res.send({
                status: 204
            });
        } else {
            res.send({
                status: 403,
                message: 'Not able to delete the group.'
            });
        }

        next();
    }

    deleteUsersFromGroup(req, res, next) {
        logger.info('[X] Removing users from group.');

        let service         = req.params.service, // telegram, whatsapp, messenger...
            groupId         = req.params.id,
            users           = req.body,
            userDeleted     = false,
            serviceInstance = this.botList.find(x => {
                return x.name == service;
            });

        serviceInstance.removeUsersFromGroup(groupId, users, (err, x) => {
            res.send({
                status: 200
            });

            next();
        });
    }

    sendBulkGroupMessages(req, res, next) {
        let service             = req.params.service, // telegram, whatsapp, messenger...
            message             = req.body.message,
            users               = req.body.users,
            serviceInstance     = this.botList.find(x => {
                return x.name == service;
            });

        users = users.map(user => {
            return `chat#${user}`;
        });

        let messages = users.map(user => {
            return {
                userId: user,
                message: message
            };
        });

        serviceInstance.sendBulkUserMessages(messages, (err, x) => {
            res.send({
                status: 200,
                message: 'Messages sent.'
            });

            next();
        });
    }

    sendBulkUserMessages(req, res, next) {
        let service             = req.params.service, // telegram, whatsapp, messenger...
            message             = req.body.message,
            users               = req.body.users,
            serviceInstance     = this.botList.find(x => {
                return x.name == service;
            });

        users = users.map(user => {
            return `user#${user}`;
        });

        let messages = users.map(user => {
            return {
                userId: user,
                message: message
            };
        });

        serviceInstance.sendBulkUserMessages(messages, (err, x) => {
            res.send({
                status: 200,
                message: 'Messages sent.'
            });

            next();
        });
    }

    sendGroupMessage(req, res, next) {
        let service         = req.params.service, // telegram, whatsapp, messenger...
            groupId         = `${req.params.id}`,
            message         = req.body,
            serviceInstance = this.botList.find(x => {
                return x.name == service;
            });

        // Call the method
        serviceInstance.sendGroupMessage(groupId, message, (err, x) => {
            res.send({
                status: 200
            });

            next();
        });
    }

    addUserToUserGroup(req, res, next) {
        let service         = req.params.service, // telegram, whatsapp, messenger...
            groupId         = req.params.id,
            users           = req.body,
            serviceInstance = this.botList.find(x => {
                return x.name == service;
            });

        // Call the method
        serviceInstance.addUsersToGroup(groupId, users, (err, x) => {
            res.send({
                status: 200,
                responses: x.map(status => {
                    return status.body
                })
            });

            next();
        });
    }

    sendMessageToUserGroup(req, res, next) {}

    registerListeners() {
        this.methodList.forEach(method => {
            this.botList.forEach(bot => {
                bot.on(method.trim(), data => {
                    this.handleEvent(method, data);
                });
            });
        });
    }

    registerRoutes() {
        this.server.post('/:service/groups/:id/users', this.addUserToUserGroup.bind(this));
        this.server.post('/:service/groups/:id/users/remove', this.deleteUsersFromGroup.bind(this));

        this.server.post('/:service/groups/:id/messages', this.sendGroupMessage.bind(this));

        this.server.post('/:service/users/messages', this.sendBulkUserMessages.bind(this));
        this.server.post('/:service/groups/messages', this.sendBulkGroupMessages.bind(this));

        this.server.get('/:service/peer/:hash', this.checkPeer.bind(this));
        this.server.post('/:service/register', this.registerPeer.bind(this));
        this.server.post('/:service/groups/:id/messages', this.sendMessageToUserGroup.bind(this));
        // CREATE
        this.server.post('/:service/groups/', this.createUserGroup.bind(this));
        // UPDATE
        this.server.put('/:service/groups/', this.updateUserGroup.bind(this));
        this.server.put('/:service/groups/:id', this.updateUserGroupById.bind(this));

        this.server.del('/:service/groups/:id', this.deleteUserGroup.bind(this));

    }
}

module.exports = ExternalInterface;
