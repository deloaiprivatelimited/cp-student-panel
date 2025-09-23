// utils/toast.js
import { toast } from "react-hot-toast";

// Generate a unique toast ID based on type + message
const getToastId = (type, message) => `${type}-${message}`;

export const showSuccess = (message) => {
  toast.success(message, {
    duration: 3000,
    position: "top-right",
    id: getToastId("success", message), // prevents duplicates
  });
};

export const showError = (message) => {
  toast.error(message, {
    duration: 3000,
    position: "top-right",
    id: getToastId("error", message), // prevents duplicates
  });
};

export const showInfo = (message) => {
  toast(message, {
    duration: 3000,
    position: "top-right",
    id: getToastId("info", message), // prevents duplicates
  });
};
