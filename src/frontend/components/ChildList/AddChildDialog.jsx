import React from "react";
import ConfirmationPopup from "../popup/ConfirmationPopup";
import modelStyles from "../../components/popup/confirmation_popup.module.css";

const AddChildDialog = ({ handleClosePopup, handleSubmit, handleAcceptShare }) => {
  const childRef = React.useRef(null);
  const codeRef = React.useRef(null);
  const [useMagicCode, setUseMagicCode] = React.useState(false);

  const handleSubmitClick = () => {
    if (useMagicCode) {
      const code = codeRef.current?.value;
      if (code && code.length === 4) {
        handleAcceptShare(Number(code));
      }
    } else {
      handleSubmit(childRef.current?.value);
    }
  };

  return (
    <ConfirmationPopup handleClosePopup={handleClosePopup}>
      <h4 className={modelStyles.popup_title}>Add a child</h4>
      
      <div style={{ marginTop: "12px", marginBottom: "8px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={useMagicCode}
            onChange={(e) => setUseMagicCode(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <span style={{ fontSize: "14px", color: "#0B334D" }}>Use magic code</span>
        </label>
      </div>

      {useMagicCode ? (
        <input
          type="text"
          name="code"
          style={{ marginTop: "8px", letterSpacing: "4px", textAlign: "center", fontSize: "18px" }}
          className={`text-field ${modelStyles.popup_input_edit_field}`}
          ref={codeRef}
          placeholder="1234"
          maxLength="4"
          pattern="[0-9]*"
          inputMode="numeric"
          autoFocus
        />
      ) : (
        <input
          type="text"
          name="child"
          style={{ marginTop: "8px" }}
          className={`text-field ${modelStyles.popup_input_edit_field}`}
          ref={childRef}
          defaultValue={childRef.current ? childRef.current.value : ""}
          placeholder="name"
          maxLength="10"
          autoFocus
        />
      )}

      <button
        className={modelStyles.popup_edit_action_btn}
        type="submit"
        onClick={handleSubmitClick}
      >
        {useMagicCode ? "Add child" : "Add child"}
      </button>
      <p
        role="button"
        className={modelStyles.popup_cancel_action_btn}
        onClick={handleClosePopup}
      >
        cancel
      </p>
    </ConfirmationPopup>
  );
};

export default AddChildDialog;
