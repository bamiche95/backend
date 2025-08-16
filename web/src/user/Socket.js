import { io } from "socket.io-client";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJrZWxpIiwiZW1haWwiOiJrZWxpQGdtYWlsLmNvbSIsInR5cGUiOiJ1c2VyIiwiaWF0IjoxNzUzNDUxOTIwLCJleHAiOjE3NTQwNTY3MjB9.pVFINXE3QOE9gNxt4XLOt_X6uufOmiFowDVMtCVyqCE"
; // get this from your login response or storage

export const socket = io("http://localhost:5000", {
  auth: {
    token: token,
  },
});
