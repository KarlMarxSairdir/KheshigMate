const path = require('path');
const express = require('express')
const http = require('http')
const moment = require('moment');
const socketio = require('socket.io');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose'); // Added mongoose

const PORT = process.env.PORT || 3000;

// MongoDB Connection URI (replace with your actual connection string)
const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Updated MongoDB URI

mongoose.connect(MONGO_URI) // Removed deprecated options
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Define a schema for session data
const sessionSchema = new mongoose.Schema({ // Added Session Schema
    roomId: String,
    drawings: Array, // To store drawing actions
    notes: String, // To store text notes (can be expanded)
    canvasState: String // To store the current state of the canvas
});

const Session = mongoose.model('Session', sessionSchema); // Added Session Model

const app = express();

const options = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};
const server = https.createServer(options, app);

const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};
let socketroom = {};
let socketname = {};
let micSocket = {};
let videoSocket = {};
let roomBoard = {};

io.on('connect', socket => {

    socket.on("join room", async (roomid, username) => { // Added async

        socket.join(roomid);
        socketroom[socket.id] = roomid;
        socketname[socket.id] = username;
        micSocket[socket.id] = 'on';
        videoSocket[socket.id] = 'on';

        if (rooms[roomid] && rooms[roomid].length > 0) {
            rooms[roomid].push(socket.id);
            socket.to(roomid).emit('message', `${username} joined the room.`, 'Bot', moment().format(
                "h:mm a"
            ));
            io.to(socket.id).emit('join room', rooms[roomid].filter(pid => pid != socket.id), socketname, micSocket, videoSocket);
        }
        else {
            rooms[roomid] = [socket.id];
            io.to(socket.id).emit('join room', null, null, null, null);
            // Create a new session if it doesn't exist
            try { // Added try-catch for session creation
                let session = await Session.findOne({ roomId: roomid });
                if (!session) {
                    session = new Session({ roomId: roomid, drawings: [], notes: '', canvasState: '' });
                    await session.save();
                    console.log(`Session created for room ${roomid}`);
                } else {
                    console.log(`Session found for room ${roomid}`);
                }
            } catch (err) {
                console.error('Error creating or finding session:', err);
            }
        }

        io.to(roomid).emit('user count', rooms[roomid].length);

    });

    socket.on('action', msg => {
        if (msg == 'mute')
            micSocket[socket.id] = 'off';
        else if (msg == 'unmute')
            micSocket[socket.id] = 'on';
        else if (msg == 'videoon')
            videoSocket[socket.id] = 'on';
        else if (msg == 'videooff')
            videoSocket[socket.id] = 'off';

        socket.to(socketroom[socket.id]).emit('action', msg, socket.id);
    })

    socket.on('video-offer', (offer, sid) => {
        socket.to(sid).emit('video-offer', offer, socket.id, socketname[socket.id], micSocket[socket.id], videoSocket[socket.id]);
    })

    socket.on('video-answer', (answer, sid) => {
        socket.to(sid).emit('video-answer', answer, socket.id);
    })

    socket.on('new icecandidate', (candidate, sid) => {
        socket.to(sid).emit('new icecandidate', candidate, socket.id);
    })

    socket.on('message', (msg, username, roomid) => {
        io.to(roomid).emit('message', msg, username, moment().format(
            "h:mm a"
        ));
    })

    socket.on('getCanvas', async () => { // Added async
        if (roomBoard[socketroom[socket.id]])
            socket.emit('getCanvas', roomBoard[socketroom[socket.id]]);
        else { // Added else block to fetch from DB
            try {
                const session = await Session.findOne({ roomId: socketroom[socket.id] });
                if (session && session.canvasState) {
                    roomBoard[socketroom[socket.id]] = session.canvasState;
                    socket.emit('getCanvas', session.canvasState);
                }
            } catch (err) {
                console.error('Error fetching canvas state from DB:', err);
            }
        }
    });

    socket.on('draw', async (newx, newy, prevx, prevy, color, size) => { // Added async
        socket.to(socketroom[socket.id]).emit('draw', newx, newy, prevx, prevy, color, size);
        // Save drawing action to DB
        try { // Added try-catch for saving drawing
            await Session.updateOne(
                { roomId: socketroom[socket.id] },
                { $push: { drawings: { newx, newy, prevx, prevy, color, size, timestamp: new Date() } } }
            );
        } catch (err) {
            console.error('Error saving drawing to DB:', err);
        }
    })

    socket.on('clearBoard', async () => { // Added async
        socket.to(socketroom[socket.id]).emit('clearBoard');
        // Clear drawings and canvas state in DB
        try { // Added try-catch for clearing board
            await Session.updateOne(
                { roomId: socketroom[socket.id] },
                { $set: { drawings: [], canvasState: '' } }
            );
            roomBoard[socketroom[socket.id]] = ''; // Clear in-memory cache as well
        } catch (err) {
            console.error('Error clearing board in DB:', err);
        }
    });

    socket.on('store canvas', async url => { // Added async
        roomBoard[socketroom[socket.id]] = url;
        // Save canvas state to DB
        try { // Added try-catch for storing canvas
            await Session.updateOne(
                { roomId: socketroom[socket.id] },
                { $set: { canvasState: url } }
            );
        } catch (err) {
            console.error('Error storing canvas state to DB:', err);
        }
    })

    socket.on('disconnect', () => {
        if (!socketroom[socket.id]) return;
        socket.to(socketroom[socket.id]).emit('message', `${socketname[socket.id]} left the chat.`, `Bot`, moment().format(
            "h:mm a"
        ));
        socket.to(socketroom[socket.id]).emit('remove peer', socket.id);
        var index = rooms[socketroom[socket.id]].indexOf(socket.id);
        rooms[socketroom[socket.id]].splice(index, 1);
        io.to(socketroom[socket.id]).emit('user count', rooms[socketroom[socket.id]].length);
        delete socketroom[socket.id];
        console.log('--------------------');
        console.log(rooms[socketroom[socket.id]]);

        //toDo: push socket.id out of rooms
    });
})


server.listen(PORT, '0.0.0.0', () => console.log(`HTTPS Server is up and running on port ${PORT}`));