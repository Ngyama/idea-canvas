import React, { useRef } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  const stageRef = useRef();
  
  return (
    <div className="app">
      <Toolbar stageRef={stageRef} />
      <Canvas stageRef={stageRef} />
    </div>
  );
}

export default App;

