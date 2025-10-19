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
  
  // 框选相关状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [multiDragOffset, setMultiDragOffset] = useState({ x: 0, y: 0 });
  const [multiDragStartPositions, setMultiDragStartPositions] = useState({});
  
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
  
  // 框选开始
  const handleMouseDown = (e) => {
    // 只有点击空白区域才开始框选
    if (e.target === e.target.getStage()) {
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      
      // 清除之前的选择
      setSelectedTasks(new Set());
      setIsSelecting(true);
      setSelectionBox({
        x: pointerPos.x,
        y: pointerPos.y,
        width: 0,
        height: 0
      });
    }
  };

  // 框选进行中
  const handleMouseMove = (e) => {
    if (isSelecting && selectionBox) {
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      
      const newSelectionBox = {
        x: Math.min(selectionBox.x, pointerPos.x),
        y: Math.min(selectionBox.y, pointerPos.y),
        width: Math.abs(pointerPos.x - selectionBox.x),
        height: Math.abs(pointerPos.y - selectionBox.y)
      };
      
      setSelectionBox(newSelectionBox);
      
      // 检测框选范围内的任务
      const newSelectedTasks = new Set();
      Object.values(tasks).forEach(task => {
        if (task && !task.parentId) { // 只选择顶层任务
          const taskRect = {
            x: task.position.x,
            y: task.position.y,
            width: task.size.width,
            height: task.size.height
          };
          
          if (isRectOverlap(newSelectionBox, taskRect)) {
            newSelectedTasks.add(task.id);
          }
        }
      });
      
      setSelectedTasks(newSelectedTasks);
    }
  };

  // 框选结束
  const handleMouseUp = (e) => {
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionBox(null);
    }
  };

  // 检测两个矩形是否重叠
  const isRectOverlap = (rect1, rect2) => {
    return !(rect1.x + rect1.width < rect2.x || 
             rect2.x + rect2.width < rect1.x || 
             rect1.y + rect1.height < rect2.y || 
             rect2.y + rect2.height < rect1.y);
  };

  // 任务点击处理
  const handleTaskClick = (taskId, isCtrlClick) => {
    if (isCtrlClick) {
      // Ctrl+点击：切换选择状态
      const newSelectedTasks = new Set(selectedTasks);
      if (newSelectedTasks.has(taskId)) {
        newSelectedTasks.delete(taskId);
      } else {
        newSelectedTasks.add(taskId);
      }
      setSelectedTasks(newSelectedTasks);
    } else {
      // 普通点击：只选择当前任务
      setSelectedTasks(new Set([taskId]));
    }
  };

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
    
    // 如果当前任务被选中，记录所有选中任务的初始位置
    if (selectedTasks.has(taskId)) {
      const startPositions = {};
      selectedTasks.forEach(selectedTaskId => {
        const selectedTask = tasks[selectedTaskId];
        if (selectedTask) {
          startPositions[selectedTaskId] = { ...selectedTask.position };
        }
      });
      setMultiDragStartPositions(startPositions);
      setMultiDragOffset({ x: 0, y: 0 });
    }
    
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
    
    // 如果当前任务被选中，同时移动所有选中的任务
    if (selectedTasks.has(taskId)) {
      setMultiDragOffset(newOffset);
      selectedTasks.forEach(selectedTaskId => {
        if (selectedTaskId !== taskId) { // 跳过当前正在拖动的任务
          const selectedTask = tasks[selectedTaskId];
          const selectedStartPos = multiDragStartPositions[selectedTaskId];
          if (selectedTask && selectedStartPos) {
            const newSelectedPos = {
              x: selectedStartPos.x + newOffset.x,
              y: selectedStartPos.y + newOffset.y
            };
            updateTaskPosition(selectedTaskId, newSelectedPos);
          }
        }
      });
    }
    
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
    
    // 判断是否是多选拖动
    const isMultiSelectDrag = selectedTasks.has(taskId) && selectedTasks.size > 1;
    
    // 单个任务拖动：显示预览效果
    // 多选拖动：不显示预览，避免意外形成关系
    if (!isMultiSelectDrag) {
      // 检测拖放区域（仅用于预览）
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
    } else {
      setDropZone(null);
    }
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
      setMultiDragStartPositions({});
      setMultiDragOffset({ x: 0, y: 0 });
      return;
    }
    
    // 如果当前任务被选中，更新所有选中任务的最终位置
    if (selectedTasks.has(taskId)) {
      selectedTasks.forEach(selectedTaskId => {
        if (selectedTaskId !== taskId) { // 跳过当前正在拖动的任务
          const selectedTask = tasks[selectedTaskId];
          const selectedStartPos = multiDragStartPositions[selectedTaskId];
          if (selectedTask && selectedStartPos) {
            const finalPos = {
              x: selectedStartPos.x + multiDragOffset.x,
              y: selectedStartPos.y + multiDragOffset.y
            };
            updateTaskPosition(selectedTaskId, finalPos);
          }
        }
      });
      // 清除多选拖动状态
      setMultiDragStartPositions({});
      setMultiDragOffset({ x: 0, y: 0 });
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
    
    // 计算拖动距离
    const dragDistance = taskStartPos ? 
      Math.sqrt(
        Math.pow(pos.x - taskStartPos.x, 2) + 
        Math.pow(pos.y - taskStartPos.y, 2)
      ) : 0;
    
    // 判断是否是多选拖动
    const isMultiSelectDrag = selectedTasks.has(taskId) && selectedTasks.size > 1;
    
    // 单个任务拖动：正常检测关系（但需要拖动距离超过阈值）
    // 多选拖动：禁用关系检测，避免意外形成关系
    const shouldDetectRelation = !isMultiSelectDrag && dragDistance > 30;
    
    // 在拖动结束时检测关系
    let detectedZone = null;
    
    // 只有拖动距离足够大时才检测关系
    if (shouldDetectRelation) {
      // 首先检测是否拖放到分类中
      for (const category of Object.values(categories)) {
        if (!category) continue;
        
        const zone = detectCategoryDrop(task, category, pos);
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
          
          const zone = detectDropZone(task, target, pos);
          if (zone && zone.type !== 'MOVE') {
            detectedZone = zone;
            break;
          }
        }
      }
    }
    
    if (detectedZone) {
      console.log('Drop zone detected:', detectedZone.type);
      // 根据检测到的区域类型执行操作
      switch (detectedZone.type) {
        case 'ADD_CHILD':
          // 建立父子关系
          if (detectedZone.targetId) {
            console.log('Adding child relation');
            addChildRelation(detectedZone.targetId, taskId);
          }
          break;
          
        case 'CREATE_CATEGORY':
          // 创建分类
          if (detectedZone.targetId) {
            console.log('Creating category');
            createCategory([taskId, detectedZone.targetId]);
          }
          break;
          
        case 'ADD_TO_CATEGORY':
          // 添加到分类
          if (detectedZone.categoryId) {
            console.log('Adding to category');
            addTaskToCategory(taskId, detectedZone.categoryId);
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
    setMultiDragStartPositions({});
    setMultiDragOffset({ x: 0, y: 0 });
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
          isSelected={selectedTasks.has(task.id)}
          onClick={handleTaskClick}
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: 'default', background: 'linear-gradient(135deg, #FFF8F0 0%, #F0F8FF 50%, #F8FFF8 100%)' }}
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
                  height={60}
                  fill="rgba(76, 175, 80, 0.15)"
                  stroke="#4CAF50"
                  strokeWidth={3}
                  dash={[8, 4]}
                  cornerRadius={8}
                  shadowColor="rgba(76, 175, 80, 0.3)"
                  shadowBlur={8}
                  shadowOpacity={0.6}
                  shadowOffset={{ x: 0, y: 2 }}
                />
                
                {/* 预览连接线 */}
                <Line
                  points={[
                    dropZone.preview.parentPos.x + dropZone.preview.parentSize.width * 0.5,
                    dropZone.preview.parentPos.y + dropZone.preview.parentSize.height,
                    dropZone.preview.parentPos.x + dropZone.preview.parentSize.width * 0.5,
                    mousePos.y,
                    mousePos.x,
                    mousePos.y
                  ]}
                  stroke="#4CAF50"
                  strokeWidth={3}
                  dash={[12, 6]}
                  opacity={0.8}
                  lineCap="round"
                  lineJoin="round"
                  shadowColor="rgba(76, 175, 80, 0.4)"
                  shadowBlur={4}
                />
              </>
            )}
            
            {dropZone.type === 'CREATE_CATEGORY' && (
              <>
                {/* 预览分类框 */}
                <Line
                  points={[
                    mousePos.x - 150,
                    mousePos.y - 60,
                    mousePos.x + 150,
                    mousePos.y - 60,
                    mousePos.x + 150,
                    mousePos.y + 150,
                    mousePos.x - 150,
                    mousePos.y + 150,
                    mousePos.x - 150,
                    mousePos.y - 60
                  ]}
                  stroke="#FF9800"
                  strokeWidth={4}
                  dash={[15, 8]}
                  opacity={0.8}
                  lineCap="round"
                  lineJoin="round"
                  shadowColor="rgba(255, 152, 0, 0.4)"
                  shadowBlur={6}
                />
                
                {/* 分类预览文字背景 */}
                <Rect
                  x={mousePos.x - 80}
                  y={mousePos.y - 40}
                  width={160}
                  height={30}
                  fill="rgba(255, 152, 0, 0.2)"
                  cornerRadius={15}
                  stroke="#FF9800"
                  strokeWidth={2}
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
                      stroke="#9C27B0"
                      strokeWidth={5}
                      dash={[20, 8]}
                      opacity={0.9}
                      lineCap="round"
                      lineJoin="round"
                      shadowColor="rgba(156, 39, 176, 0.4)"
                      shadowBlur={8}
                    />
                  );
                })()}
              </>
            )}
          </>
        )}
        
        {/* 渲染选择框 */}
        {selectionBox && (
          <Rect
            x={selectionBox.x}
            y={selectionBox.y}
            width={selectionBox.width}
            height={selectionBox.height}
            fill="rgba(33, 150, 243, 0.1)"
            stroke="#2196F3"
            strokeWidth={2}
            dash={[5, 5]}
            opacity={0.8}
          />
        )}
      </Layer>
    </Stage>
  );
};

export default Canvas;

