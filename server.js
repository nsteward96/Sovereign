var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');

app.use(express.static(path.join(__dirname, '/Client/Public')));

app.get('/Client/Views/index.html', function(req, res){
    res.sendFile(__dirname + '/Client/Views/index.html');
});

io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('chat_message', (data) => {
        console.log(data.username + ': ' + data.message);
        io.emit('chat_message_from_server', data);
    });
    socket.on('namechange', (data) => {
        console.log('\'' + data.previous_username + '\'' + ' changed name to ' + 
            '\'' + data.new_username + '\'');
    })
    socket.on('disconnect', function() {
       console.log('a user disconnected'); 
    });
});

server.listen(8080, function(){
    console.log('listening on *:8080');
});