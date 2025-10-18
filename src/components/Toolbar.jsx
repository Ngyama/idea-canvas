import React, { useRef } from 'react';
import useCanvasStore from '../store/canvasStore';
import { exportAsImage, exportAsJSON, importFromJSON, clearAutoSave } from '../utils/export';
import './Toolbar.css';

const Toolbar = ({ stageRef }) => {
  const { 
    undo, 
    redo, 
    clearCanvas, 
    getAllData, 
    loadData,
    history,
    historyIndex 
  } = useCanvasStore();
  
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  const handleExportImage = () => {
    exportAsImage(stageRef, `思维画布-${new Date().toLocaleDateString()}`);
  };
  
  const handleExportJSON = () => {
    const data = getAllData();
    exportAsJSON(data, `思维画布-${new Date().toLocaleDateString()}`);
  };
  
  const handleImportJSON = () => {
    importFromJSON((data) => {
      loadData(data);
      alert('导入成功！');
    });
  };
  
  const handleClearCanvas = () => {
    if (confirm('确定要清空画布吗？此操作不可撤销！')) {
      clearCanvas();
      clearAutoSave();
    }
  };
  
  const handleHelp = () => {
    alert(
      '使用说明：\n\n' +
      '📝 创建任务：双击画布空白处\n' +
      '✏️ 编辑任务：双击任务卡片\n' +
      '🔗 建立父子关系：将任务拖到另一个任务的右下角\n' +
      '📦 创建分类：将任务拖到另一个任务的正上方\n' +
      '🗑️ 删除：右键点击任务或分类\n' +
      '⌨️ 快捷键：Ctrl+Z 撤销，Ctrl+Y 重做\n' +
      '💾 自动保存：每 5 秒自动保存到本地\n' +
      '📸 导出图片：点击"导出图片"按钮\n'
    );
  };
  
  // 快捷键
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          redo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="toolbar-title">💡 思维画布</h1>
        <span className="toolbar-subtitle">双击画布创建任务</span>
      </div>
      
      <div className="toolbar-center">
        <button 
          className="toolbar-btn" 
          onClick={undo} 
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          ↶ 撤销
        </button>
        <button 
          className="toolbar-btn" 
          onClick={redo} 
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
        >
          ↷ 重做
        </button>
        <div className="toolbar-divider"></div>
        <button 
          className="toolbar-btn" 
          onClick={handleClearCanvas}
          title="清空画布"
        >
          🗑️ 清空
        </button>
      </div>
      
      <div className="toolbar-right">
        <button 
          className="toolbar-btn" 
          onClick={handleImportJSON}
          title="从 JSON 文件导入"
        >
          📂 导入
        </button>
        <button 
          className="toolbar-btn" 
          onClick={handleExportJSON}
          title="导出为 JSON 文件"
        >
          💾 保存
        </button>
        <button 
          className="toolbar-btn toolbar-btn-primary" 
          onClick={handleExportImage}
          title="导出为图片"
        >
          📸 导出图片
        </button>
        <button 
          className="toolbar-btn" 
          onClick={handleHelp}
          title="使用帮助"
        >
          ❓ 帮助
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

