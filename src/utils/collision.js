/**
 * 检测拖放区域类型
 * @param {Object} draggedTask - 被拖动的任务
 * @param {Object} targetTask - 目标任务
 * @param {Object} mousePos - 鼠标位置 {x, y}
 * @returns {Object} - {type: 'ADD_CHILD' | 'CREATE_CATEGORY' | 'MOVE', targetId}
 */
export function detectDropZone(draggedTask, targetTask, mousePos) {
  if (!targetTask || !draggedTask || !mousePos || draggedTask.id === targetTask.id) {
    return { type: 'MOVE' };
  }
  
  // 检查必要的属性是否存在
  if (!targetTask.position || !targetTask.size) {
    return { type: 'MOVE' };
  }
  
  const target = targetTask.position;
  const size = targetTask.size;
  
  // 检查是否在目标任务的下方区域（建立父子关系）
  const isBelow = mousePos.y > target.y + size.height;
  const isInHorizontalRange = 
    mousePos.x >= target.x - size.width * 0.2 && 
    mousePos.x <= target.x + size.width * 1.2;
  
  // 增加更严格的条件：必须在下方的特定区域内
  const isInChildDropZone = isBelow && isInHorizontalRange && 
    mousePos.y <= target.y + size.height + 80; // 限制在父任务下方80像素内
  
  if (isInChildDropZone) {
    // 防止循环依赖：子任务不能成为其父任务的父任务
    if (targetTask.parentId === draggedTask.id) {
      return { type: 'MOVE' };
    }
    
    // 如果被拖动的任务已经有父任务，不允许直接建立新的父子关系
    if (draggedTask.parentId) {
      return { type: 'MOVE' };
    }
    
    return {
      type: 'ADD_CHILD',
      targetId: targetTask.id,
      preview: {
        parentId: targetTask.id,
        childId: draggedTask.id,
        parentPos: target,
        parentSize: size
      }
    };
  }
  
  // 检查是否在目标上方（创建分类）
  const distanceAbove = target.y - mousePos.y;
  const horizontalDistance = Math.abs(mousePos.x - (target.x + size.width / 2));
  
  // 在目标正上方 20-80 像素，且水平距离不超过任务宽度
  if (distanceAbove > 20 && distanceAbove < 80 && horizontalDistance < size.width) {
    return {
      type: 'CREATE_CATEGORY',
      targetId: targetTask.id,
      preview: {
        taskIds: [draggedTask.id, targetTask.id]
      }
    };
  }
  
  return { type: 'MOVE' };
}

/**
 * 检测是否拖放到分类中
 * @param {Object} draggedTask - 被拖动的任务
 * @param {Object} category - 分类对象
 * @param {Object} mousePos - 鼠标位置 {x, y}
 * @returns {Object} - {type: 'ADD_TO_CATEGORY' | 'MOVE', categoryId}
 */
export function detectCategoryDrop(draggedTask, category, mousePos) {
  if (!category || !draggedTask || !mousePos) {
    return { type: 'MOVE' };
  }
  
  // 检查必要的属性是否存在
  if (!category.position || !category.size || !draggedTask.id) {
    return { type: 'MOVE' };
  }
  
  // 检查鼠标是否在分类范围内
  const isInsideCategory = 
    mousePos.x >= category.position.x &&
    mousePos.x <= category.position.x + category.size.width &&
    mousePos.y >= category.position.y &&
    mousePos.y <= category.position.y + category.size.height;
  
  if (isInsideCategory) {
    // 检查任务是否已经在分类中
    if (draggedTask.categoryId === category.id) {
      return { type: 'MOVE' };
    }
    
    return {
      type: 'ADD_TO_CATEGORY',
      categoryId: category.id,
      preview: {
        categoryId: category.id,
        taskId: draggedTask.id
      }
    };
  }
  
  return { type: 'MOVE' };
}

/**
 * 检查两个位置是否重叠
 */
export function isOverlapping(pos1, pos2, threshold = 50) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

/**
 * 计算子任务的位置
 */
export function calculateChildPosition(parentTask, childIndex = 0) {
  return {
    x: parentTask.position.x + parentTask.size.width * 0.3, // 父任务中间偏右
    y: parentTask.position.y + parentTask.size.height + 15 + childIndex * 60 // 父任务下方，间距稍大
  };
}

/**
 * 计算分类的边界
 */
export function calculateCategoryBounds(tasks) {
  if (tasks.length === 0) return null;
  
  const padding = 40;
  const headerHeight = 50;
  
  const minX = Math.min(...tasks.map(t => t.position.x)) - padding;
  const minY = Math.min(...tasks.map(t => t.position.y)) - headerHeight - padding;
  const maxX = Math.max(...tasks.map(t => t.position.x + t.size.width)) + padding;
  const maxY = Math.max(...tasks.map(t => t.position.y + t.size.height)) + padding;
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

