import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Outlet, NavLink } from "react-router-dom";

export default function App() {
  return (
    <div>
      <nav className="p-3 space-x-3">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
