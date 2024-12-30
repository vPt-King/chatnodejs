const id = "a57c9c83-9bec-4840-93b1-12c56f21ab86";
const id_2 = "9202c300-66b3-4ad3-925e-1bf4c68dec15";
const socket = io('http://localhost:9001'); 
const hash = maHoa(id, id_2);

socket.on(`call_${hash}`, (caller)=>{
    console.log("From user to call: ", caller);
    reply = {
        "user_id": id,
    }

    const acceptButton = document.getElementById('accept');
    acceptButton.addEventListener('click', () => {
        reply['user_name'] = 'Thanh vu'
        reply['user_avatar_path'] = '/avatar_path'
        reply['ip'] = "192.168.50.99";
        reply['hash'] = hash
        reply['status'] = "accept"
        socket.emit(`response`, reply);
        console.log('User A accepted the call');
    });


    const rejectButton = document.getElementById('deny');
    rejectButton.addEventListener('click', () => {
        reply['status'] = "deny"
        reply['hash'] = hash
        socket.emit(`response`, reply);
        console.log('User A rejected the call');
    });
})

socket.on('connection', () => {
    console.log('Connected to server with ID:', id);
});

socket.on(`response_${hash}`,(message) => {
    alert(message.status);
    console.log(message.status)
})

//1. Bam nut call
const sendMessageButton = document.getElementById('sendMessage');
sendMessageButton.addEventListener('click', () => {
    const caller ={
        "user_id" : id,
        "user_name":"Thanh vu",
        "user_avatar_path":"/avatar_path",
        "ip":"192.168.50.99",
        "hash": hash
    }
    socket.emit('call', (caller));
    console.log('Sent message to server:', caller);
});


socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

function maHoa(id1, id2){
    const sortedIds = [id1, id2].sort();
    const combined = sortedIds.join('-');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash * 31 + char) % 1e9;
    }
    return hash;
};
