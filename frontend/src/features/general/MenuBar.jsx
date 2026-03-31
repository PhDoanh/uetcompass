import React from 'react';
import '../style/general-component.css';

export default function MenuBar({ onClose }) {
  return (
    <div className="menubar">
      <button className="menubar__item" onClick={() => { window.location.assign('/settings'); onClose(); }}>Settings</button>
      <button className="menubar__item" onClick={() => { window.location.assign('/skill-tree'); onClose(); }}>Skill Tree</button>
      <button className="menubar__item" onClick={() => { /* Add logout logic here */ onClose(); }}>Logout</button>
    </div>
  );
}
