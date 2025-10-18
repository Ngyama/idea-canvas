import React, { useState, useEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';

const CategoryBox = ({ category, onNameChange, onDelete, onDragStart, onDragMove, onDragEnd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  
  // 当分类名称变化时，更新编辑名称
  useEffect(() => {
    setEditName(category.name);
  }, [category.name]);
  
  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  
  
  // 编辑模式
  useEffect(() => {
    if (isEditing) {
      // 获取画布容器位置
      const canvasContainer = document.querySelector('canvas')?.parentElement;
      if (!canvasContainer) return;
      
      const rect = canvasContainer.getBoundingClientRect();
      
      // 创建输入框
      const input = document.createElement('input');
      input.value = editName;
      input.style.position = 'absolute';
      input.style.left = `${rect.left + category.position.x + 5}px`;
      input.style.top = `${rect.top + category.position.y + 5}px`;
      input.style.width = `${Math.min(210, category.size.width - 10)}px`;
      input.style.height = '28px';
      input.style.padding = '4px 8px';
      input.style.fontSize = '16px';
      input.style.fontWeight = 'bold';
      input.style.border = 'none';
      input.style.borderRadius = '4px';
      input.style.outline = '3px solid #2196F3';
      input.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      input.style.color = '#333';
      input.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      input.style.zIndex = '10000';
      input.style.boxSizing = 'border-box';
      
      document.body.appendChild(input);
      input.focus();
      input.select();
      
      const handleBlur = () => {
        console.log('Category input blur, current value:', input.value);
        const newName = input.value.trim();
        if (newName && newName !== category.name) {
          console.log('Saving new category name:', newName);
          onNameChange(category.id, newName);
        }
        setIsEditing(false);
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };
      
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          console.log('Category Enter pressed, current value:', input.value);
          const newName = input.value.trim();
          if (newName && newName !== category.name) {
            console.log('Saving new category name:', newName);
            onNameChange(category.id, newName);
          }
          setIsEditing(false);
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          console.log('Category Escape pressed, canceling edit');
          setEditName(category.name);
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
  }, [isEditing, editName, category.id, category.name, onNameChange]);
  
  // 右键删除
  const handleContextMenu = (e) => {
    e.evt.preventDefault();
    if (confirm('确定要删除这个分类吗？（任务不会被删除）')) {
      onDelete(category.id);
    }
  };
  
  return (
    <Group
      x={category.position.x}
      y={category.position.y}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      {/* 背景边框 */}
      <Rect
        width={category.size.width}
        height={category.size.height}
        fill={category.style.bgColor}
        stroke={category.style.borderColor}
        strokeWidth={category.style.borderWidth}
        cornerRadius={8}
        dash={[10, 5]}
      />
      
      {/* 标题背景 */}
      <Rect
        x={5}
        y={5}
        width={Math.min(220, category.size.width - 10)}
        height={28}
        fill="rgba(255, 255, 255, 0.8)"
        cornerRadius={4}
      />
      
      {/* 分类名称 */}
      {!isEditing && (
        <Text
          text={category.name || '双击编辑分类名'}
          x={10}
          y={10}
          fontSize={16}
          fontStyle="bold"
          fill="#333"
          onDblClick={handleDoubleClick}
          onTap={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      )}
    </Group>
  );
};

export default CategoryBox;

