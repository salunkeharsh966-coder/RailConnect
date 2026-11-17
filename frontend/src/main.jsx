import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import "./styles/variables.css";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/features.css";
import "./styles/responsive.css";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { StationProvider } from "./context/StationContext.jsx";
import { BookingProvider } from "./context/BookingContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <StationProvider>
            <BookingProvider>
              <App />
            </BookingProvider>
          </StationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
