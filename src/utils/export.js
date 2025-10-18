/**
 * 导出画布为图片
 */
export function exportAsImage(stageRef, filename = 'idea-canvas') {
  const stage = stageRef.current;
  if (!stage) return;
  
  // 导出为 PNG，高清晰度
  const dataURL = stage.toDataURL({
    pixelRatio: 2,
    mimeType: 'image/png'
  });
  
  // 触发下载
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 导出为 JSON
 */
export function exportAsJSON(data, filename = 'idea-canvas') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 文件导入
 */
export function importFromJSON(callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        callback(data);
      } catch (error) {
        alert('文件格式错误！');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

/**
 * 自动保存到 LocalStorage
 */
const STORAGE_KEY = 'idea-canvas-autosave';

export function autoSave(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('自动保存失败', error);
  }
}

export function loadAutoSave() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const { data, timestamp } = JSON.parse(saved);
    
    // 检查是否超过 24 小时
    const hours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (hours < 24) {
      return data;
    }
  } catch (error) {
    console.warn('加载自动保存失败', error);
  }
  return null;
}

export function clearAutoSave() {
  localStorage.removeItem(STORAGE_KEY);
}

