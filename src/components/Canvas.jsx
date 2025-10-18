import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Arrow, Rect } from 'react-konva';
import useCanvasStore from '../store/canvasStore';
import TaskCard from './TaskCard';
import CategoryBox from './CategoryBox';
import { detectDropZone, detectCategoryDrop } from '../utils/collision';
import { autoSave, loadAutoSave } from '../utils/export';

const Canvas = ({ stageRef: externalStageRef }) => {
  const internalStageRef = useRef();
  const stageRef = externalStageRef || internalStageRef;
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 60 // 减去工具栏高度
  });
  
  const {
    tasks,
    categories,
    createTask,
    updateTaskPosition,
    updateTaskContent,
    updateCategoryName,
    updateCategoryPosition,
    addChildRelation,
    createCategory,
    deleteTask,
    deleteCategory,
    removeTaskFromCategory,
    removeTaskFromParent,
    addTaskToCategory,
    loadData
  } = useCanvasStore();
  
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedCategory, setDraggedCategory] = useState(null);
  const [dropZone, setDropZone] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [taskStartPos, setTaskStartPos] = useState(null);
  const [categoryDragOffset, setCategoryDragOffset] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [childStartPositions, setChildStartPositions] = useState({});
  
  // 响应式画布大小
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 60
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 加载自动保存
  useEffect(() => {
    const saved = loadAutoSave();
    if (saved && saved.tasks && Object.keys(saved.tasks).length > 0) {
      const shouldLoad = window.confirm('检测到未保存的草稿，是否恢复？');
      if (shouldLoad) {
        loadData(saved);
      }
    }
  }, []);
  
  // 自动保存
  useEffect(() => {
    const timer = setInterval(() => {
      autoSave({ tasks, categories });
    }, 5000); // 每 5 秒保存一次
    
    return () => clearInterval(timer);
  }, [tasks, categories]);
  
  // 双击画布创建任务
  const handleStageClick = (e) => {
    // 只有点击空白区域才触发
    if (e.target === e.target.getStage()) {
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      
      if (e.evt.detail === 2) { // 双击
        createTask(pointerPos);
      }
    }
  };
  
  // 拖动开始
  const handleDragStart = (taskId) => (e) => {
    console.log('Drag start for task:', taskId);
    const task = tasks[taskId];
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }
    console.log('Task found:', task);
    setDraggedTask(task);
    setTaskStartPos({ ...task.position });
    setDragOffset({ x: 0, y: 0 });
    
    // 记录子任务的初始位置
    if (task.childrenIds && task.childrenIds.length > 0) {
      const childPositions = {};
      task.childrenIds.forEach(childId => {
        const childTask = tasks[childId];
        if (childTask) {
          childPositions[childId] = { ...childTask.position };
        }
      });
      setChildStartPositions(childPositions);
    } else {
      setChildStartPositions({});
    }
  };
  
  // 分类拖动开始
  const handleCategoryDragStart = (categoryId) => (e) => {
    const category = categories[categoryId];
    setDraggedCategory(category);
    setCategoryDragOffset({ x: 0, y: 0 });
  };
  
  // 分类拖动中
  const handleCategoryDragMove = (categoryId) => (e) => {
    const category = categories[categoryId];
    if (!category) return;
    
    // 获取当前拖动位置
    const currentPos = e.target.position();
    
    // 计算位置偏移量
    const deltaX = currentPos.x - category.position.x;
    const deltaY = currentPos.y - category.position.y;
    
    // 更新偏移状态
    setCategoryDragOffset({ x: deltaX, y: deltaY });
  };
  
  // 分类拖动结束
  const handleCategoryDragEnd = (categoryId) => (e) => {
    const pos = e.target.position();
    updateCategoryPosition(categoryId, pos);
    setDraggedCategory(null);
    setCategoryDragOffset({ x: 0, y: 0 });
  };
  
  // 拖动中
  const handleDragMove = (taskId) => (e) => {
    console.log('Drag move for task:', taskId);
    const stage = e.target.getStage();
    if (!stage) {
      console.error('Stage not found');
      return;
    }
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) {
      console.error('Pointer position not found');
      return;
    }
    
    setMousePos(pointerPos);
    
    // 获取当前拖动的任务
    const currentTask = tasks[taskId];
    if (!currentTask) {
      console.error('Current task not found:', taskId);
      setDropZone(null);
      return;
    }
    
    // 计算当前拖动偏移量
    const currentPos = e.target.position();
    const newOffset = {
      x: currentPos.x - currentTask.position.x,
      y: currentPos.y - currentTask.position.y
    };
    setDragOffset(newOffset);
    
    // 如果拖动的是父任务，实时更新子任务位置
    if (currentTask.childrenIds && currentTask.childrenIds.length > 0) {
      currentTask.childrenIds.forEach(childId => {
        const childStartPos = childStartPositions[childId];
        if (childStartPos) {
          const newChildPos = {
            x: childStartPos.x + newOffset.x,
            y: childStartPos.y + newOffset.y
          };
          updateTaskPosition(childId, newChildPos);
        }
      });
    }
    
    // 检测拖放区域
    let detectedZone = null;
    
    // 首先检测是否拖放到分类中
    for (const category of Object.values(categories)) {
      if (!category) continue;
      
      const zone = detectCategoryDrop(currentTask, category, pointerPos);
      if (zone && zone.type !== 'MOVE') {
        detectedZone = zone;
        break;
      }
    }
    
    // 如果没有检测到分类拖放，再检测任务关系
    if (!detectedZone) {
      const otherTasks = Object.values(tasks).filter(t => 
        t && t.id !== taskId && !t.parentId // 只检测顶层任务
      );
      
      for (const target of otherTasks) {
        if (!target) continue;
        
        const zone = detectDropZone(currentTask, target, pointerPos);
        if (zone && zone.type !== 'MOVE') {
          detectedZone = zone;
          break;
        }
      }
    }
    
    setDropZone(detectedZone);
  };
  
  // 拖动结束
  const handleDragEnd = (taskId) => (e) => {
    console.log('Drag end for task:', taskId);
    const pos = e.target.position();
    const task = tasks[taskId];
    
    if (!task || !pos) {
      console.error('Task or position not found');
      setDraggedTask(null);
      setDropZone(null);
      setTaskStartPos(null);
      return;
    }
    
    // 检查是否拖出了父任务范围（解除父子关系）
    if (task.parentId && taskStartPos) {
      const parent = tasks[task.parentId];
      if (parent && parent.position && parent.size) {
        // 检查任务是否还在父任务附近（允许一定的容差）
        const tolerance = 50; // 容差范围
        const isNearParent = 
          pos.x >= parent.position.x - tolerance &&
          pos.x + task.size.width <= parent.position.x + parent.size.width + tolerance &&
          pos.y >= parent.position.y - tolerance &&
          pos.y + task.size.height <= parent.position.y + parent.size.height + tolerance;
        
        if (!isNearParent) {
          // 拖出了父任务范围，解除父子关系
          console.log('Task dragged out of parent range, removing parent relation');
          // 这里需要实现解除父子关系的逻辑
          removeTaskFromParent(taskId);
          updateTaskPosition(taskId, pos);
          setDraggedTask(null);
          setDropZone(null);
          setTaskStartPos(null);
          return;
        }
      }
    }
    
    // 检查是否拖出了分类
    if (task.categoryId && taskStartPos) {
      const category = categories[task.categoryId];
      if (category && category.position && category.size) {
        // 检查任务是否还在分类范围内
        const isInsideCategory = 
          pos.x >= category.position.x &&
          pos.x + task.size.width <= category.position.x + category.size.width &&
          pos.y >= category.position.y &&
          pos.y + task.size.height <= category.position.y + category.size.height;
        
        if (!isInsideCategory) {
          // 拖出了分类
          console.log('Task dragged out of category');
          removeTaskFromCategory(taskId);
          updateTaskPosition(taskId, pos);
          setDraggedTask(null);
          setDropZone(null);
          setTaskStartPos(null);
          return;
        }
      }
    }
    
    if (dropZone) {
      console.log('Drop zone detected:', dropZone.type);
      // 根据检测到的区域类型执行操作
      switch (dropZone.type) {
        case 'ADD_CHILD':
          // 建立父子关系
          if (dropZone.targetId) {
            console.log('Adding child relation');
            addChildRelation(dropZone.targetId, taskId);
          }
          break;
          
        case 'CREATE_CATEGORY':
          // 创建分类
          if (dropZone.targetId) {
            console.log('Creating category');
            createCategory([taskId, dropZone.targetId]);
          }
          break;
          
        case 'ADD_TO_CATEGORY':
          // 添加到分类
          if (dropZone.categoryId) {
            console.log('Adding to category');
            addTaskToCategory(taskId, dropZone.categoryId);
          }
          break;
          
        default:
          // 普通移动
          console.log('Normal move');
          updateTaskPosition(taskId, pos);
      }
    } else {
      // 普通移动
      console.log('Normal move (no drop zone)');
      updateTaskPosition(taskId, pos);
    }
    
    setDraggedTask(null);
    setDropZone(null);
    setTaskStartPos(null);
    setDragOffset({ x: 0, y: 0 });
    setChildStartPositions({});
  };
  
  // 获取所有需要渲染的任务（排除已经有父任务的，它们会由父任务渲染）
  const topLevelTasks = Object.values(tasks).filter(t => !t.parentId);
  
  // 渲染任务及其子任务
  const renderTask = (task, isChild = false) => {
    const children = task.childrenIds?.map(childId => tasks[childId]).filter(Boolean) || [];
    
    // 检查任务是否在被拖动的分类中
    const isInDraggedCategory = draggedCategory && task.categoryId === draggedCategory.id;
    
    // 检查任务是否是被拖动的父任务
    const isDraggedParent = draggedTask?.id === task.id;
    
    return (
      <React.Fragment key={task.id}>
        <TaskCard
          task={task}
          onDragStart={handleDragStart(task.id)}
          onDragMove={handleDragMove(task.id)}
          onDragEnd={handleDragEnd(task.id)}
          onContentChange={updateTaskContent}
          onDelete={deleteTask}
          opacity={draggedTask?.id === task.id ? 0.5 : 1}
          categoryDragOffset={categoryDragOffset}
          isInDraggedCategory={isInDraggedCategory}
        />
        
        {/* 渲染子任务 */}
        {children.map(child => (
          <React.Fragment key={child.id}>
            {renderTask(child, true)}
          </React.Fragment>
        ))}
        
      </React.Fragment>
    );
  };
  
  return (
    <Stage
      ref={stageRef}
      width={dimensions.width}
      height={dimensions.height}
      onClick={handleStageClick}
      style={{ cursor: 'default', background: '#f5f5f5' }}
    >
      <Layer>
        {/* 渲染分类 */}
        {Object.values(categories).map(category => (
          <CategoryBox
            key={category.id}
            category={category}
            onNameChange={updateCategoryName}
            onDelete={deleteCategory}
            onDragStart={handleCategoryDragStart(category.id)}
            onDragMove={handleCategoryDragMove(category.id)}
            onDragEnd={handleCategoryDragEnd(category.id)}
          />
        ))}
        
        {/* 渲染所有顶层任务及其子任务 */}
        {topLevelTasks.map(task => renderTask(task))}
        
        {/* 拖动预览效果 */}
        {dropZone && dropZone.preview && draggedTask && (
          <>
            {dropZone.type === 'ADD_CHILD' && (
              <>
                {/* 高亮父任务的下方区域 */}
                <Rect
                  x={dropZone.preview.parentPos.x - dropZone.preview.parentSize.width * 0.2}
                  y={dropZone.preview.parentPos.y + dropZone.preview.parentSize.height}
                  width={dropZone.preview.parentSize.width * 1.4}
                  height={50}
                  fill="rgba(25, 118, 210, 0.1)"
                  stroke="#1976D2"
                  strokeWidth={2}
                  dash={[5, 5]}
                  cornerRadius={4}
                />
                
                {/* 预览连接线 */}
                <Line
                  points={[
                    dropZone.preview.parentPos.x + dropZone.preview.parentSize.width * 0.6,
                    dropZone.preview.parentPos.y + dropZone.preview.parentSize.height,
                    dropZone.preview.parentPos.x + dropZone.preview.parentSize.width * 0.6,
                    mousePos.y,
                    mousePos.x,
                    mousePos.y
                  ]}
                  stroke="#1976D2"
                  strokeWidth={2}
                  dash={[10, 5]}
                  opacity={0.7}
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            )}
            
            {dropZone.type === 'CREATE_CATEGORY' && (
              <>
                {/* 预览分类框 */}
                <Line
                  points={[
                    mousePos.x - 100,
                    mousePos.y - 40,
                    mousePos.x + 100,
                    mousePos.y - 40,
                    mousePos.x + 100,
                    mousePos.y + 100,
                    mousePos.x - 100,
                    mousePos.y + 100,
                    mousePos.x - 100,
                    mousePos.y - 40
                  ]}
                  stroke="#2196F3"
                  strokeWidth={3}
                  dash={[10, 5]}
                  opacity={0.7}
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            )}
            
            {dropZone.type === 'ADD_TO_CATEGORY' && (
              <>
                {/* 高亮分类边框 */}
                {(() => {
                  const category = categories[dropZone.categoryId];
                  if (!category) return null;
                  
                  return (
                    <Line
                      points={[
                        category.position.x,
                        category.position.y,
                        category.position.x + category.size.width,
                        category.position.y,
                        category.position.x + category.size.width,
                        category.position.y + category.size.height,
                        category.position.x,
                        category.position.y + category.size.height,
                        category.position.x,
                        category.position.y
                      ]}
                      stroke="#FF9800"
                      strokeWidth={4}
                      dash={[15, 5]}
                      opacity={0.8}
                      lineCap="round"
                      lineJoin="round"
                    />
                  );
                })()}
              </>
            )}
          </>
        )}
      </Layer>
    </Stage>
  );
};

export default Canvas;

