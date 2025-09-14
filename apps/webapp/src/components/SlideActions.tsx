import React from 'react';
import '../styles/slide-actions.css';

type Props = {
  onDelete():void;
  onLeft():void;
  onRight():void;
  onClose():void;
};

export default function SlideActions({ onDelete, onLeft, onRight, onClose }: Props){
  return (
    <div className="slide-actions">
      <button onClick={() => { onDelete(); onClose(); }}>Delete</button>
      <button onClick={() => { onLeft(); onClose(); }}>Left</button>
      <button onClick={() => { onRight(); onClose(); }}>Right</button>
    </div>
  );
}
