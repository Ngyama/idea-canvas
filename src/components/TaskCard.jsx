import React, { useState, useRef, useEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';

const TaskCard = ({ 
  task, 
  onDragStart, 
  onDragMove, 
  onDragEnd,
  onContentChange,
  onDelete,
  isPreview = false,
  opacity = 1,
  categoryDragOffset = { x: 0, y: 0 },
  isInDraggedCategory = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  
  // 当任务内容变化时，更新编辑内容
  useEffect(() => {
    setEditContent(task.content);
  }, [task.content]);
  const groupRef = useRef();
  
  const handleDoubleClick = () => {
    try {
      if (!isPreview) {
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error in handleDoubleClick:', error);
    }
  };
  
  
  // 如果是编辑模式，显示 HTML 输入框
  useEffect(() => {
    if (isEditing) {
      const stage = groupRef.current?.getStage();
      const container = stage?.container();
      if (!container) return;
      
      // 获取 Stage 的位置和缩放
      const containerRect = container.getBoundingClientRect();
      
      // 创建输入框
      const input = document.createElement('textarea');
      input.value = editContent;
      input.style.position = 'absolute';
      input.style.left = `${containerRect.left + task.position.x}px`;
      input.style.top = `${containerRect.top + task.position.y}px`;
      input.style.width = `${task.size.width}px`;
      input.style.height = `${task.size.height}px`;
      input.style.padding = '8px';
      input.style.fontSize = '14px';
      input.style.border = 'none';
      input.style.borderRadius = '6px';
      input.style.outline = '3px solid #4CAF50';
      input.style.resize = 'none';
      input.style.fontFamily = 'inherit';
      input.style.backgroundColor = task.style.bgColor;
      input.style.color = task.style.textColor;
      input.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      input.style.zIndex = '10000';
      input.style.boxSizing = 'border-box';
      
      document.body.appendChild(input);
      input.focus();
      input.select();
      
      const handleBlur = () => {
        console.log('Input blur, current value:', input.value);
        const newContent = input.value.trim();
        if (newContent && newContent !== task.content) {
          console.log('Saving new content:', newContent);
          onContentChange(task.id, newContent);
        }
        setIsEditing(false);
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };
      
      const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          console.log('Enter pressed, current value:', input.value);
          const newContent = input.value.trim();
          if (newContent && newContent !== task.content) {
            console.log('Saving new content:', newContent);
            onContentChange(task.id, newContent);
          }
          setIsEditing(false);
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          console.log('Escape pressed, canceling edit');
          setEditContent(task.content);
          setIsEditing(false);
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }
      };
      
      input.addEventListener('blur', handleBlur);
      input.addEventListener('keydown', handleKeyDown);
      
      return () => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };
    }
  }, [isEditing, editContent, task.id, task.content, onContentChange]);
  
  // 右键删除
  const handleContextMenu = (e) => {
    try {
      e.evt.preventDefault();
      if (!isPreview && confirm('确定要删除这个任务吗？')) {
        onDelete(task.id);
      }
    } catch (error) {
      console.error('Error in handleContextMenu:', error);
    }
  };
  
  return (
    <>
      <Group
        ref={groupRef}
        id={`task-${task.id}`}
        x={(task.position?.x || 0) + 
          (isInDraggedCategory ? (categoryDragOffset?.x || 0) : 0)}
        y={(task.position?.y || 0) + 
          (isInDraggedCategory ? (categoryDragOffset?.y || 0) : 0)}
        draggable={!isPreview && !isEditing}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDblClick={handleDoubleClick}
        onTap={handleDoubleClick}
        onContextMenu={handleContextMenu}
        opacity={opacity}
      >
        {/* 背景 */}
        <Rect
          width={task.size?.width || 120}
          height={task.size?.height || 40}
          fill={task.childrenIds && task.childrenIds.length > 0 ? '#E3F2FD' : (task.style?.bgColor || '#4CAF50')}
          stroke={task.childrenIds && task.childrenIds.length > 0 ? '#1976D2' : (task.style?.borderColor || '#388E3C')}
          strokeWidth={task.childrenIds && task.childrenIds.length > 0 ? 3 : 2}
          cornerRadius={4}
          shadowColor="black"
          shadowBlur={isPreview ? 15 : 3}
          shadowOpacity={isPreview ? 0.3 : 0.15}
          shadowOffset={{ x: 0, y: 1 }}
        />
        
        {/* 文本 */}
        {!isEditing && (
          <Text
            text={task.content || '新任务'}
            x={6}
            y={6}
            width={(task.size?.width || 120) - 12}
            height={(task.size?.height || 40) - 12}
            fontSize={12}
            fill={task.childrenIds && task.childrenIds.length > 0 ? '#1976D2' : (task.style?.textColor || '#ffffff')}
            align="left"
            verticalAlign="middle"
            wrap="word"
            ellipsis={true}
          />
        )}
        
        {/* 如果有子任务，显示指示器 */}
        {task.childrenIds && task.childrenIds.length > 0 && (
          <Group x={(task.size?.width || 120) - 18} y={2}>
            <Text
              text="•"
              fontSize={16}
              fill="#1976D2"
              align="center"
              verticalAlign="middle"
              width={16}
              height={16}
            />
          </Group>
        )}
        
        {/* 如果是子任务，在左边显示关系指示点 */}
        {task.parentId && (
          <Group x={-8} y={(task.size?.height || 40) / 2 - 4}>
            <Rect
              width={8}
              height={8}
              fill="#1976D2"
              cornerRadius={4}
              stroke="#ffffff"
              strokeWidth={1}
            />
          </Group>
        )}
      </Group>
      
    </>
  );
};

export default TaskCard;

