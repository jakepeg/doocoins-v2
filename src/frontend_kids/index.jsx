import React from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from '@capacitor/status-bar';
import './assets/css/index.css'

import App from "./App";

// Configure status bar for native apps
if (Capacitor?.isNativePlatform?.()) {
	document.body.classList.add("native-safe");
	
	// iOS: Set status bar to light content (white text on dark background)
	StatusBar.setStyle({ style: Style.Light }).catch(err => {
		console.log('[StatusBar] Error setting style:', err);
	});
	
	// Add background div that covers status bar + safe area
	const statusBarBg = document.createElement('div');
	statusBarBg.id = 'status-bar-bg';
	statusBarBg.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 50px;
		background-color: #6B46C1;
		z-index: -1;
	`;
	document.body.prepend(statusBarBg);
	
	console.log('[StatusBar] Status bar configured for kids app');
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
