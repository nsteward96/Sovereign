var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var number_of_current_users = {};
var current_host_user = {};
var player_list = {};

app.use(express.static(path.join(__dirname, '/Client/Public')));

app.get('/Client/Views/index.html', function(req, res){
    res.sendFile(__dirname + '/Client/Views/index.html');
});

io.on('connection', function(socket){
    console.log('a user connected');

    var current_room = '';

    socket.on('data_update', (data) => {
        socket.to(current_room).broadcast.emit('server_update_data', data);
    });
    
    socket.on('chat_message', (data) => {
        if (current_room != '') {
            io.to(current_room).emit('chat_message_from_server', data);
        }
    });
    
    socket.on('set_username', (data) => {
        socket.username = data.new_username;
        if (data.previous_username) {
            console.log('\'' + data.previous_username + '\'' + ' changed name to ' +
                '\'' + data.new_username + '\'');
        }
    });
    
    socket.on('namespace_change', (data) => {
        resetNamespace(socket, current_room, data.player_name);
        socket.join(data.room, function () {
            socket.to(data.room).emit('new_player_joined_room', data.player_name);
            current_room = data.room;
        });
        
        // If the room has no users, make joining user the host
        if (!(data.room in number_of_current_users) || number_of_current_users[data.room] === 0) {
            number_of_current_users[data.room] = 0;
            current_host_user[data.room] = socket;
            player_list[data.room] = [socket];
            socket.emit('become_host');
        } else {
            var socket_is_not_already_in_room = true;
            for (var i = 0; i < player_list[data.room].length; i++) {
                if (player_list[data.room][i].id === socket.id) {
                    socket_is_not_already_in_room = false;
                }
            }
            if (socket_is_not_already_in_room) {
                player_list[data.room].push(socket);
            }
            socket.emit('become_client');
        }
        number_of_current_users[data.room]++;
    });
    
    socket.on('reset_namespace', (data) => {
        resetNamespace(socket, current_room, data);
        current_room = '';
    });
    
    socket.on('update_current_room_name', (data) => {
        var room = null;
        if (current_room !== '') {
            room = current_room;
        }
        socket.emit('server_return_current_room_name', room);
    });
    
    socket.on('retrieve_list_of_players', (data) => {
        var username_list = [];
        for (var i = 0; i < player_list[current_room].length; i++) {
            username_list.push(player_list[current_room][i].username);
        }
        socket.emit('list_of_players', { username_list: username_list, host_username: current_host_user[current_room].username }); 
    });
    
    socket.on('host_broadcast_output_to_flavor_text_area', (data) => {
        socket.to(current_room).broadcast.emit('server_output_to_flavor_text_area', data); 
    });
    
    socket.on('allocate_worker', (data) => {
        io.to(current_host_user[current_room].id).emit('server_says_allocate_worker', data);
    });
    socket.on('deallocate_worker', (data) => {
        io.to(current_host_user[current_room].id).emit('server_says_deallocate_worker', data);
    });
    socket.on('buy_building', (data) => {
        io.to(current_host_user[current_room].id).emit('server_says_buy_building', data);
    });
    socket.on('generate_resource', (data) => {
        io.to(current_host_user[current_room].id).emit('server_says_generate_resource');
    });
    
    socket.on('disconnect', function() {
        console.log('a user disconnected');
        var host_left = true;
        resetNamespace(socket, current_room);
        io.of(current_room).clients((error, clients) => {
            if (error) throw error;
            for (var i = 0; i < clients.length; i++) {
                if (current_host_user[current_room] && clients[i] === current_host_user[current_room].id) {
                    host_left = false;
                }
            }
            if (host_left) {
                socket.disconnect();
            }
        });
    });
});

function resetNamespace(socket, current_room) {
    if (current_host_user[current_room] && socket.id === current_host_user[current_room].id) {
        console.log('resetting all');
        socket.to(current_room).broadcast.emit('kick_from_room');
    }
    socket.leave(current_room);
    // Find index of username in username list array for current room, and remove it
    if (player_list[current_room]) {
        var socket_index;
        for (var i = 0; i < player_list[current_room].length; i++) {
            if (player_list[current_room][i].username === socket.username) {
                socket_index = i;
            }
        }
        // Remove socket from list of connected sockets
        if (socket_index) {
            player_list[current_room].splice(socket_index, 1);
        }
    }
    
    number_of_current_users[current_room]--;
}

server.listen(8080, function(){
    console.log('listening on *:8080');
});
