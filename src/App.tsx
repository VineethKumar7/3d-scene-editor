import { Canvas3D } from './components/Editor/Canvas3D';
import { HierarchyPanel } from './components/Panels/HierarchyPanel';
import { PropertiesPanel } from './components/Panels/PropertiesPanel';
import { Toolbar } from './components/UI/Toolbar';
import { StatusBar } from './components/UI/StatusBar';
import { useKeyboard } from './hooks/useKeyboard';
import './App.css';

function App() {
  useKeyboard();

  return (
    <div className="app">
      <Toolbar />
      
      <div className="main-content">
        <aside className="panel panel-left">
          <HierarchyPanel />
        </aside>
        
        <main className="viewport">
          <Canvas3D />
        </main>
        
        <aside className="panel panel-right">
          <PropertiesPanel />
        </aside>
      </div>
      
      <StatusBar />
    </div>
  );
}

export default App;
