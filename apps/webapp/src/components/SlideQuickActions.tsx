import React from 'react';
import '../styles/slide-quick-actions.css';

export default function SlideQuickActions({ onMoveLeft, onDelete, onMoveRight, onClose }:{
  onMoveLeft():void; onDelete():void; onMoveRight():void; onClose():void;
}){
  return (
    <div className="qa-backdrop" onClick={onClose}>
      <div className="qa-panel" onClick={e=>e.stopPropagation()}>
        <button onClick={onMoveLeft}>Move left</button>
        <button className="danger" onClick={onDelete}>Delete</button>
        <button onClick={onMoveRight}>Move right</button>
      </div>
    </div>
  );
}
