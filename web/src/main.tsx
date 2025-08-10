import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";

const router = createBrowserRouter([
  { path: "/", element: <App />, children: [
    { index: true, element: <div>Dashboard</div> },
    { path: "login", element: <div>Login</div> },
    { path: "reports", element: <div>Reports</div> },
    { path: "settings", element: <div>Settings</div> },
  ]},
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);
