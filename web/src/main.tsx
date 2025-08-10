import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";

import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, 
    children: [
      { index: true, element: <LoginPage /> },
      { path: "login", element: <LoginPage />},
      { path: "dashboard", element: <DashboardPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
