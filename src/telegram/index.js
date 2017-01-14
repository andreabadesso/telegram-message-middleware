'use strict';

const MessageInterface = require('../models/MessageInterface'),
        request = require('request-json'),
            async = require('async');

class Telegram extends MessageInterface {
    constructor(server, host, port, protocol) {
        super(server);
        this.name = 'telegram';
        this.serverUrl = `http://localhost:${process.env.MIDDLEWARE_PORT || 3001}/telegram/`;
        this.configure(host, port, protocol);
        this.registerRoutes();
        this.register();
    }

    privateMessageReceived(req, res, next) {
        let message = req.body;

        this.emit('private_message', req.body);

        res.send({
            status: 200
        });
        next();
    }

    groupMessageReceived(req, res, next) {
        let message = req.body;

        this.emit('group_message', req.body);

        res.send({
            status: 200
        });
        next();
    }

    renameUserGroup(name, newName, callback) {
        this.client.put('telegram/groups', {
            name: name,
            newName: newName
        }, callback);
    }

    renameUserGroupById(id, newName, callback) {
        this.client.put(`telegram/groups/${id}`, {
            newName: newName
        }, callback);
    }

    sendBulkUserMessages(messages, callback) {
        this.client.post('telegram/users/messages', messages, callback);
    }

    sendGroupMessage(id, message, callback) {
        let url = `telegram/groups/${id}/messages`;
        this.client.post(url, message, callback);
    }

    createUserGroup(groupName, users, callback) {
        this.client.post('telegram/groups', {
            name: groupName,
            users: users
        }, callback);
    }

    deleteUserGroup(groupId) {
        return true;
    }

    deleteUserFromGroup(groupId, userId) {
        return true;
    }

    addUsersToGroup(groupId, users, callback) {
        async.mapSeries(users, (user, cb) => {
            this.client.post(`telegram/groups/${groupId}/users`, {
                user: user.id
            }, cb);
        }, (err, results) => {
            callback(err, results);
        });
    }

    removeUsersFromGroup(groupId, users, callback) {
        async.mapSeries(users, (user, cb) => {
            this.client.post(`telegram/groups/${groupId}/users/remove`, {
                user: user.id
            }, cb);
        }, (err, results) => {
            callback(err, results);
        });
    }

    registerRoutes() {
        this.server.post('/telegram/private_message', this.privateMessageReceived.bind(this));
        this.server.post('/telegram/group_message', this.groupMessageReceived.bind(this));
    }
}

module.exports = Telegram;
