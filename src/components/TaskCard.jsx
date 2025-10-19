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
  isInDraggedCategory = false,
  isSelected = false,
  onClick
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
      input.style.resize = 'none';
      input.style.fontFamily = 'inherit';
      
      // 根据任务状态确定输入框颜色
      let inputBgColor, inputTextColor, inputBorderColor;
      if (task.childrenIds && task.childrenIds.length > 0) {
        // 父任务 - 使用天蓝色系
        inputBgColor = '#E1F5FE';
        inputTextColor = '#0277BD';
        inputBorderColor = '#0277BD';
      } else if (task.parentId) {
        // 子任务 - 使用浅绿色系
        inputBgColor = '#F1F8E9';
        inputTextColor = '#388E3C';
        inputBorderColor = '#388E3C';
      } else {
        // 自由态任务 - 使用粉色系
        inputBgColor = '#FFF0F5';
        inputTextColor = '#C2185B';
        inputBorderColor = '#F8BBD9';
      }
      
      input.style.backgroundColor = inputBgColor;
      input.style.color = inputTextColor;
      input.style.outline = `3px solid ${inputBorderColor}`;
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
  
  // 点击事件处理
  const handleClick = (e) => {
    try {
      if (!isPreview && onClick) {
        onClick(task.id, e.evt.ctrlKey || e.evt.metaKey);
      }
    } catch (error) {
      console.error('Error in handleClick:', error);
    }
  };

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
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        onTap={handleDoubleClick}
        onContextMenu={handleContextMenu}
        opacity={opacity}
      >
        {/* 背景 */}
        <Rect
          width={task.size?.width || 240}
          height={task.size?.height || 50}
          fill={(() => {
            // 根据任务状态确定颜色
            if (task.childrenIds && task.childrenIds.length > 0) {
              // 父任务 - 使用天蓝色系
              return '#E1F5FE';
            } else if (task.parentId) {
              // 子任务 - 使用浅绿色系
              return '#F1F8E9';
            } else {
              // 自由态任务 - 使用粉色系
              return '#FFF0F5';
            }
          })()}
          stroke={(() => {
            // 如果被选中，使用选中状态的边框颜色
            if (isSelected) {
              return '#FF5722';
            }
            // 根据任务状态确定边框颜色
            if (task.childrenIds && task.childrenIds.length > 0) {
              // 父任务 - 使用天蓝色系
              return '#0277BD';
            } else if (task.parentId) {
              // 子任务 - 使用浅绿色系
              return '#388E3C';
            } else {
              // 自由态任务 - 使用粉色系
              return '#F8BBD9';
            }
          })()}
          strokeWidth={isSelected ? 4 : (task.childrenIds && task.childrenIds.length > 0 ? 3 : 2)}
          cornerRadius={8}
          shadowColor="rgba(0,0,0,0.1)"
          shadowBlur={isPreview ? 15 : 4}
          shadowOpacity={isPreview ? 0.3 : 0.2}
          shadowOffset={{ x: 0, y: 2 }}
        />
        
        {/* 文本 */}
        {!isEditing && (
          <Text
            text={task.content || '新任务'}
            x={6}
            y={6}
            width={(task.size?.width || 240) - 12}
            height={(task.size?.height || 50) - 12}
            fontSize={12}
            fill={(() => {
              // 根据任务状态确定文字颜色
              if (task.childrenIds && task.childrenIds.length > 0) {
                // 父任务 - 使用天蓝色系
                return '#0277BD';
              } else if (task.parentId) {
                // 子任务 - 使用浅绿色系
                return '#388E3C';
              } else {
                // 自由态任务 - 使用粉色系
                return '#C2185B';
              }
            })()}
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

