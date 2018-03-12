var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var number_of_current_users = {};
var current_host_user_id = {};
var player_saved_data = {};

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
    socket.on('namechange', (data) => {
        console.log('\'' + data.previous_username + '\'' + ' changed name to ' +
            '\'' + data.new_username + '\'');
    });
    socket.on('namespace_change', (data) => {
        resetNamespace(socket, current_room);
        socket.join(data.room, function () {
            socket.to(data.room).emit('new_player_joined_room', data.player_name);
            current_room = data.room;
        });
        
        // If the room has no users, make joining user the host
        if (!(data.room in number_of_current_users) || number_of_current_users[data.room] === 0) {
            console.log('became host!');
            number_of_current_users[data.room] = 0;
            current_host_user_id[data.room] = socket.id;
            socket.emit('become_host');
        } else {
            socket.emit('become_client');
        }
        number_of_current_users[data.room]++;
    });
    socket.on('reset_namespace', (data) => {
        resetNamespace(socket, current_room);
        current_room = '';
    });
    socket.on('get_current_room', (data) => {
        var room = null;
        if (current_room !== '') {
            room = current_room;
        }
        socket.emit('server_return_current_room', room);
    });
    socket.on('host_broadcast_output_to_flavor_text_area', (data) => {
        socket.to(current_room).broadcast.emit('server_output_to_flavor_text_area', data); 
    });
    socket.on('allocate_worker', (data) => {
        io.to(current_host_user_id[current_room]).emit('server_says_allocate_worker', data);
    });
    socket.on('deallocate_worker', (data) => {
        io.to(current_host_user_id[current_room]).emit('server_says_deallocate_worker', data);
    });
    socket.on('buy_building', (data) => {
        io.to(current_host_user_id[current_room]).emit('server_says_buy_building', data);
    });
    socket.on('generate_resource', (data) => {
        io.to(current_host_user_id[current_room]).emit('server_says_generate_resource');
    });
    socket.on('disconnect', function() {
        console.log('a user disconnected');
        var host_left = true;
        io.of(current_room).clients((error, clients) => {
            if (error) throw error;
            for (var i = 0; i < clients.length; i++) {
                if (clients[i] === current_host_user_id[current_room]) {
                    host_left = false;
                }
            }
            if (host_left) {
                socket.disconnect();
            }
        });
        number_of_current_users[current_room]--;
    });
});

function resetNamespace(socket, current_room) {
    if (socket.id === current_host_user_id[current_room]) {
        console.log('resetting all');
        socket.to(current_room).broadcast.emit('kick_from_room');
    }
    socket.leave(current_room);
    number_of_current_users[current_room]--;
}

server.listen(8080, function(){
    console.log('listening on *:8080');
});
