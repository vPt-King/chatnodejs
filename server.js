const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const socketio = require('socket.io');
const port = 9001;
const pool = require('./db');
// const db = require("./db")
const util = require('util');
const io = socketio(server, {
  cors: {
    origin: "*", // Cho phép tất cả các nguồn (hoặc thay thế bằng URL frontend cụ thể)
    methods: ["GET", "POST"]
  }
});

app.get("/chat/:user_id", async (req,res)=>{
  user_id = req.params['user_id']
  try{
    const sql = `SELECT session_message.id as message_id , session_message.message, session_message.user2_id as user2_id, session_message.user_sent_name as user_sent_name, session_message.user_sent as user_sent_id, user.username as user2_name, user.avatar_path as user2_avatar_path from session_message, user where session_message.user_id = ? and user.id = session_message.user2_id order by session_message.sent_at DESC;`;
    const results = await pool.query(sql, [user_id]);
    res.status(200).json(results[0]);
  }catch (error) {
    console.error('Lỗi khi truy vấn:', error.message);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu.' });
  }
}) 


app.get('/detail-chat/:user1_id/:user2_id', async (req,res)=>{
  user1_id = req.params['user1_id']
  user2_id = req.params['user2_id']
  try {
    // //const query = util.promisify(db.query).bind(db);

    const sql = `
      SELECT * FROM private_message 
      WHERE 
        (sender_id = ? AND receiver_id = ?) 
        OR (sender_id = ? AND receiver_id = ?) 
      ORDER BY private_message.sent_at DESC
    `;

    const results = await pool.query(sql, [user1_id, user2_id, user2_id, user1_id]);

    res.status(200).json(results[0]); // Trả về kết quả dạng JSON
  } catch (error) {
    console.error('Lỗi khi truy vấn:', error.message);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi truy vấn cơ sở dữ liệu.' });
  }
})



const formatDateForMySQL = (isoDate) => {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('send_mess', ({ hash, message }) => {
      //const query = util.promisify(db.query).bind(db);
      (async () => {
        let session_exit_1 = 0;
        let session_exit_2 = 0;
        try {
          const formattedSentAt = formatDateForMySQL(message.sent_at);
          const sqlInsertMessage = `
            INSERT INTO private_message (content, sent_at, receiver_id, sender_id)
            VALUES (?, ?, ?, ?)
          `;
          const values = [
            message.content,
            formattedSentAt, // Thời gian đã được format
            message.receiver_id,
            message.sender_id,
          ];
          await pool.query(sqlInsertMessage, values);
          const sessionQuery1 = `
            SELECT * FROM session_message WHERE user_id = ? AND user2_id = ?
          `;
          const results1 = await pool.query(sessionQuery1, [message.sender_id, message.receiver_id]);
          session_exit_1 = results1.length > 0 ? 1 : 0;
      

          const sessionQuery2 = `
            SELECT * FROM session_message WHERE user_id = ? AND user2_id = ?
          `;
          const results2 = await pool.query(sessionQuery2, [message.receiver_id, message.sender_id]);
          session_exit_2 = results2.length > 0 ? 1 : 0;
      
          console.log("test: " + session_exit_1, session_exit_2);
          if (session_exit_1 === 0 && session_exit_2 === 0) {
            const sqlInsertSession = `
              INSERT INTO session_message (user_id, message, user2_id, sent_at, user_sent, user_sent_name)
              VALUES (?, ?, ?, ?, ?)
            `;
            const values1 = [
              message.sender_id,
              message.content,
              message.receiver_id,
              message.sent_at,
              message.sender_id,
              message.user_sent_name
            ];
            const values2 = [
              message.receiver_id,
              message.content,
              message.sender_id,
              message.sent_at,
              message.sender_id,
              message.user_sent_name
            ];
            await pool.query(sqlInsertSession, values1);
            await pool.query(sqlInsertSession, values2);
          } else if (session_exit_1 === 1 && session_exit_2 === 1) {
            const sqlUpdateSession = `
              UPDATE session_message
              SET message = ?, sent_at = ?, user_sent = ? , user_sent_name = ?
              WHERE user_id = ? AND user2_id = ?
            `;
            const updateValues1 = [
              message.content,
              message.sent_at,
              message.sender_id,
              message.user_sent_name,
              message.sender_id,
              message.receiver_id,
            ];
            const updateValues2 = [
              message.content,
              message.sent_at,
              message.sender_id,
              message.user_sent_name,
              message.receiver_id,
              message.sender_id,
            ];
            await pool.query(sqlUpdateSession, updateValues1);
            await pool.query(sqlUpdateSession, updateValues2);
          }
      
          console.log(`Message:`, message);
          io.emit(`send_${hash}`, message.content);
        } catch (err) {
          console.error('Error:', err);
        }
      })();

    });


    socket.on('call', async (caller) => {
      try{
        console.log(caller);
        const results = await pool.query("select user.call_status from user where user.id = ?", [caller.receiverId]);
        receiver_status = parseInt(results[0][0].call_status);
        if(receiver_status === 0)
        {
          const updateCallStatus = `UPDATE user SET call_status = ? WHERE user.id = ?`;
          await pool.query(updateCallStatus,[1,caller.callerId]);
          await pool.query(updateCallStatus,[1,caller.receiverId]);
          io.emit(`call_${caller.hash}`, caller);
        }
        else{
          const mess = "Người dùng đang bận";
          console.log("Nguoi dung ban: ", mess);
          io.emit(`call_${caller.callerId}`, mess);
        }
      }catch (err) {
        console.error('Error:', err);
      }
    });

    socket.on(`response`, async (message) => {
      console.log("message response: ", message);
      try{
        if(message.response_status == "accept"){
          io.emit(`response_${message.hash}`, message);
        } else if(message.response_status == "deny")
        {
          const updateCallStatus = `UPDATE user SET call_status = ? WHERE user.id = ?`;
          await pool.query(updateCallStatus,[0,message.callerId]);
          await pool.query(updateCallStatus,[0,message.receiverId]);
          const mess = "Người dùng 2 từ chối nghe máy";
          io.emit(`call_${message.callerId}`, mess);
        }
      }catch (err){
        console.error('Error:', err);
      }
    });


    socket.on('call_ended', async (data) => {
      console.log('Call ended: ', data);
      try{
        const updateCallStatus = `UPDATE user SET call_status = ? WHERE user.id = ?`;
        await pool.query(updateCallStatus,[0,data.callerId]);
        await pool.query(updateCallStatus,[0,data.receiverId]);
        io.emit(`call_ended_${data.hash}`, { message: 'Cuộc gọi đã kết thúc', callerId: data.callerId, receiverId: data.receiverId });
      }catch (err){
        console.error('Error:', err);
      }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});


server.listen(port, () => {
    console.log(`Server is listening at the port: ${port}`);
});
