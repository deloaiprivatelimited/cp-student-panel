import React, { createContext, useContext, useState, useCallback } from "react";

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null);

  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({
        type: "alert",
        message,
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
      });
    });
  }, []);

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({
        type: "confirm",
        message,
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        onCancel: () => {
          setModal(null);
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modal && <ModalRenderer {...modal} />}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);

const ModalRenderer = ({ type, message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
      <div className="bg-[#2D2D30] text-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="text-lg font-semibold mb-4">{type === "alert" ? "Alert" : "Confirm"}</div>
        <div className="text-[#CCCCCC] mb-6">{message}</div>

        <div className="flex justify-end gap-3">
          {type === "confirm" && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-[#4CA466] hover:bg-[#3c8551]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
