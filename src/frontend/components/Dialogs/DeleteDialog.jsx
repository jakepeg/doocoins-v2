import React from "react";
import ConfirmationPopup from "../popup/ConfirmationPopup";
import modelStyles from "../../components/popup/confirmation_popup.module.css";

const DeleteDialog = ({ 
  handleCloseDeletePopup, 
  selectedItem, 
  handleDelete,
  title,
  message,
  confirmText = "Delete"
}) => {
  return (
    <ConfirmationPopup handleClosePopup={handleCloseDeletePopup}>
      <h4 className={modelStyles.popup_title}>
        {title || `Delete ${selectedItem.name}`}
      </h4>
      {message && (
        <p className={modelStyles.popup_message} style={{ marginBottom: '16px', fontSize: '14px' }}>
          {message}
        </p>
      )}
      <button
        className={modelStyles.popup_delete_action_btn}
        onClick={() => handleDelete(selectedItem.id, selectedItem.name)}
      >
        {confirmText}
      </button>
      <p
        className={modelStyles.popup_cancel_action_btn}
        onClick={handleCloseDeletePopup}
      >
        Cancel
      </p>
    </ConfirmationPopup>
  );
};

export default DeleteDialog;
