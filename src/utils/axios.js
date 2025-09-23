import axios from "axios";

// Ngrok URL
// const NGROK_URL = "https://cp-admin-panel-backend.onrender.com";
const NGROK_URL = "http://127.0.0.1:5000";
 
// Public Axios instance
export const publicAxios = axios.create({
  baseURL: NGROK_URL,
  headers: {
    "Content-Type": "application/json",
"ngrok-skip-browser-warning": "69420"
,  },
});

// Private Axios instance with auth
export const privateAxios = axios.create({
  baseURL: NGROK_URL,
  headers: {
"ngrok-skip-browser-warning": "69420"
  },
});

// Attach token manually
export const attachPrivateAxios = (token) => {
  if (token) {
    privateAxios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete privateAxios.defaults.headers.common["Authorization"];
  }
};

// Automatically attach token from localStorage on every request
privateAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    } else {
      delete config.headers["Authorization"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);
