import React from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import './assets/css/index.css'
import "react-swipeable-list/dist/styles.css";

import App from "./App";

// Add a class to body for native apps so we can apply safe-area insets via CSS
try {
	if (Capacitor?.isNativePlatform?.() === true) {
		document.body.classList.add("native-safe");
	}
} catch {}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
