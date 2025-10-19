import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { calculateChildPosition } from '../utils/collision';

const useCanvasStore = create((set, get) => ({
  // 数据
  tasks: {},
  categories: {},
  history: [],
  historyIndex: -1,
  
  // 创建任务
  createTask: (position, content = '新任务') => {
    const id = nanoid();
    
    // 自由态任务的颜色方案（默认）
    const freeTaskStyle = {
      bgColor: '#FFF0F5',
      textColor: '#C2185B',
      borderColor: '#F8BBD9'
    };
    
    const task = {
      id,
      content,
      position: { x: position.x, y: position.y },
      size: { width: 240, height: 50 },
      type: 'task',
      parentId: null,
      categoryId: null,
      childrenIds: [],
      style: freeTaskStyle
    };
    
    set((state) => ({
      tasks: { ...state.tasks, [id]: task }
    }));
    
    get().saveHistory();
    return id;
  },
  
  // 更新任务内容
  updateTaskContent: (id, content) => {
    console.log('Store: Updating task content', id, content);
    set((state) => {
      const task = state.tasks[id];
      if (!task) {
        console.error('Task not found:', id);
        return state;
      }
      console.log('Before update:', task.content);
      const updatedTask = { ...task, content };
      console.log('After update:', updatedTask.content);
      return {
        tasks: {
          ...state.tasks,
          [id]: updatedTask
        }
      };
    });
    get().saveHistory();
  },
  
  // 更新任务位置
  updateTaskPosition: (id, position) => {
    set((state) => ({
      tasks: {
        ...state.tasks,
        [id]: { ...state.tasks[id], position }
      }
    }));
  },
  
  // 重新排列父任务的子任务位置
  reorderChildPositions: (parentId) => {
    set((state) => {
      const parent = state.tasks[parentId];
      if (!parent || !parent.childrenIds || parent.childrenIds.length === 0) {
        console.log('No children to reorder for parent:', parentId);
        return state;
      }
      
      console.log('Reordering children for parent:', parentId, 'children:', parent.childrenIds);
      const updatedTasks = { ...state.tasks };
      
      // 重新计算所有子任务的位置
      parent.childrenIds.forEach((childId, index) => {
        const child = updatedTasks[childId];
        if (child) {
          const newPosition = calculateChildPosition(parent, index);
          console.log(`Child ${childId} new position:`, newPosition);
          updatedTasks[childId] = {
            ...child,
            position: newPosition
          };
        }
      });
      
      return { tasks: updatedTasks };
    });
  },

  // 建立父子关系
  addChildRelation: (parentId, childId) => {
    console.log('addChildRelation called:', { parentId, childId });
    const state = get();
    const child = state.tasks[childId];
    const parent = state.tasks[parentId];
    
    // 防止重复调用：如果子任务已经是这个父任务的子任务，直接返回
    if (child && child.parentId === parentId) {
      console.log('Child already belongs to this parent, skipping');
      return;
    }
    
    const oldParentId = child?.parentId;
    console.log('Old parent ID:', oldParentId);
    
    set((state) => {
      const parent = state.tasks[parentId];
      const child = state.tasks[childId];
      
      console.log('Current state:', {
        parent: parent ? { id: parent.id, childrenIds: parent.childrenIds } : null,
        child: child ? { id: child.id, parentId: child.parentId } : null
      });
      
      // 如果子任务已经有父任务，先从旧父任务移除
      const updatedTasks = { ...state.tasks };
      if (child.parentId && updatedTasks[child.parentId]) {
        const oldParent = updatedTasks[child.parentId];
        console.log('Removing from old parent:', oldParent.id, 'children before:', oldParent.childrenIds);
        
        // 从旧父任务移除子任务
        updatedTasks[child.parentId] = {
          ...oldParent,
          childrenIds: oldParent.childrenIds.filter(id => id !== childId)
        };
        
        console.log('Children after removal:', updatedTasks[child.parentId].childrenIds);
      }
      
      // 如果子任务在分类中，从分类移除
      if (child.categoryId && state.categories[child.categoryId]) {
        const category = state.categories[child.categoryId];
        const newCategories = { ...state.categories };
        newCategories[child.categoryId] = {
          ...category,
          taskIds: category.taskIds.filter(id => id !== childId)
        };
        
        const newParentChildrenIds = [...(parent.childrenIds || []), childId];
        console.log('Adding to new parent (category case):', parentId, 'new children:', newParentChildrenIds);
        
        return {
          tasks: {
            ...updatedTasks,
            [parentId]: {
              ...parent,
              childrenIds: newParentChildrenIds
            },
            [childId]: {
              ...child,
              parentId,
              categoryId: null,
              // 子任务位置相对于父任务，使用新数组的长度-1作为索引
              position: (() => {
                const newPosition = calculateChildPosition(parent, newParentChildrenIds.length - 1);
                console.log('New child position calculated:', newPosition, 'for child', childId, 'index:', newParentChildrenIds.length - 1);
                return newPosition;
              })()
            }
          },
          categories: newCategories
        };
      }
      
      const newParentChildrenIds = [...(parent.childrenIds || []), childId];
      console.log('Adding to new parent (normal case):', parentId, 'new children:', newParentChildrenIds);
      
      return {
        tasks: {
          ...updatedTasks,
          [parentId]: {
            ...parent,
            childrenIds: newParentChildrenIds
          },
          [childId]: {
            ...child,
            parentId,
            categoryId: null,
            // 子任务位置相对于父任务，使用新数组的长度-1作为索引
            position: (() => {
              const newPosition = calculateChildPosition(parent, newParentChildrenIds.length - 1);
              console.log('New child position calculated (normal):', newPosition, 'for child', childId, 'index:', newParentChildrenIds.length - 1);
              return newPosition;
            })()
          }
        }
      };
    });
    
    // 如果有旧父任务，重新排列其子任务位置
    if (oldParentId) {
      console.log('Reordering child positions for parent:', oldParentId);
      get().reorderChildPositions(oldParentId);
    }
    
    get().saveHistory();
  },
  
  // 创建分类
  createCategory: (taskIds) => {
    const id = nanoid();
    
    set((state) => {
      const tasks = taskIds.map(tid => state.tasks[tid]);
      
      // 计算分类的边界（增大边距）
      const positions = tasks.map(t => t.position);
      const minX = Math.min(...positions.map(p => p.x)) - 40;
      const minY = Math.min(...positions.map(p => p.y)) - 70;
      const maxX = Math.max(...tasks.map(t => t.position.x + t.size.width)) + 40;
      const maxY = Math.max(...tasks.map(t => t.position.y + t.size.height)) + 40;
      
      const category = {
        id,
        name: '分类',
        type: 'category',
        taskIds,
        position: { x: minX, y: minY },
        size: {
          width: maxX - minX,
          height: maxY - minY
        },
        style: {
          borderColor: '#999',
          bgColor: 'rgba(200, 200, 200, 0.15)',
          borderWidth: 2
        }
      };
      
      const updatedTasks = { ...state.tasks };
      taskIds.forEach(taskId => {
        const task = updatedTasks[taskId];
        // 从父任务关系中移除
        if (task.parentId && updatedTasks[task.parentId]) {
          const parent = updatedTasks[task.parentId];
          updatedTasks[task.parentId] = {
            ...parent,
            childrenIds: parent.childrenIds.filter(id => id !== taskId)
          };
        }
        
        updatedTasks[taskId] = {
          ...task,
          categoryId: id,
          parentId: null
        };
      });
      
      return {
        categories: { ...state.categories, [id]: category },
        tasks: updatedTasks
      };
    });
    
    get().saveHistory();
    return id;
  },
  
  // 更新分类名称
  updateCategoryName: (id, name) => {
    console.log('Store: Updating category name', id, name);
    set((state) => {
      const category = state.categories[id];
      if (!category) {
        console.error('Category not found:', id);
        return state;
      }
      console.log('Before update:', category.name);
      const updatedCategory = { ...category, name };
      console.log('After update:', updatedCategory.name);
      return {
        categories: {
          ...state.categories,
          [id]: updatedCategory
        }
      };
    });
    get().saveHistory();
  },
  
  // 更新分类位置
  updateCategoryPosition: (id, newPosition) => {
    set((state) => {
      const category = state.categories[id];
      if (!category) return state;
      
      // 计算位置偏移量
      const deltaX = newPosition.x - category.position.x;
      const deltaY = newPosition.y - category.position.y;
      
      // 更新分类内所有任务的位置
      const updatedTasks = { ...state.tasks };
      category.taskIds.forEach(taskId => {
        const task = updatedTasks[taskId];
        if (task) {
          updatedTasks[taskId] = {
            ...task,
            position: {
              x: task.position.x + deltaX,
              y: task.position.y + deltaY
            }
          };
        }
      });
      
      return {
        categories: {
          ...state.categories,
          [id]: {
            ...category,
            position: newPosition
          }
        },
        tasks: updatedTasks
      };
    });
  },
  
  // 从父任务中移除子任务
  removeTaskFromParent: (taskId) => {
    set((state) => {
      const task = state.tasks[taskId];
      if (!task || !task.parentId) return state;
      
      const parent = state.tasks[task.parentId];
      if (!parent) return state;
      
      console.log('Removing task from parent:', taskId, 'parent:', task.parentId);
      
      // 从父任务的子任务列表中移除
      const updatedTasks = { ...state.tasks };
      updatedTasks[task.parentId] = {
        ...parent,
        childrenIds: parent.childrenIds.filter(id => id !== taskId)
      };
      
      // 更新子任务，移除父任务关系
      updatedTasks[taskId] = {
        ...task,
        parentId: null
      };
      
      // 重新排列父任务的剩余子任务位置
      const remainingChildren = updatedTasks[task.parentId].childrenIds;
      remainingChildren.forEach((remainingChildId, index) => {
        const remainingChild = updatedTasks[remainingChildId];
        if (remainingChild) {
          updatedTasks[remainingChildId] = {
            ...remainingChild,
            position: calculateChildPosition(updatedTasks[task.parentId], index)
          };
        }
      });
      
      console.log('Remaining children after removal:', remainingChildren);
      
      return { tasks: updatedTasks };
    });
    
    get().saveHistory();
  },

  // 从分类中移除任务
  removeTaskFromCategory: (taskId) => {
    set((state) => {
      const task = state.tasks[taskId];
      if (!task || !task.categoryId) return state;
      
      const category = state.categories[task.categoryId];
      if (!category) return state;
      
      const newCategories = { ...state.categories };
      newCategories[task.categoryId] = {
        ...category,
        taskIds: category.taskIds.filter(id => id !== taskId)
      };
      
      // 如果分类只剩一个任务，删除分类
      if (newCategories[task.categoryId].taskIds.length <= 1) {
        const remainingTaskId = newCategories[task.categoryId].taskIds[0];
        if (remainingTaskId) {
          const updatedTasks = {
            ...state.tasks,
            [taskId]: { ...task, categoryId: null },
            [remainingTaskId]: { ...state.tasks[remainingTaskId], categoryId: null }
          };
          delete newCategories[task.categoryId];
          return {
            categories: newCategories,
            tasks: updatedTasks
          };
        }
        delete newCategories[task.categoryId];
      }
      
      return {
        categories: newCategories,
        tasks: {
          ...state.tasks,
          [taskId]: { ...task, categoryId: null }
        }
      };
    });
    
    get().saveHistory();
  },
  
  // 添加任务到分类
  addTaskToCategory: (taskId, categoryId) => {
    set((state) => {
      const task = state.tasks[taskId];
      const category = state.categories[categoryId];
      if (!task || !category) return state;
      
      // 如果任务已经在其他分类中，先移除
      let updatedCategories = { ...state.categories };
      if (task.categoryId && task.categoryId !== categoryId) {
        const oldCategory = updatedCategories[task.categoryId];
        if (oldCategory) {
          updatedCategories[task.categoryId] = {
            ...oldCategory,
            taskIds: oldCategory.taskIds.filter(id => id !== taskId)
          };
        }
      }
      
      // 添加到新分类
      updatedCategories[categoryId] = {
        ...category,
        taskIds: [...category.taskIds, taskId]
      };
      
      return {
        categories: updatedCategories,
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            categoryId,
            parentId: null // 从父子关系中移除
          }
        }
      };
    });
    
    get().saveHistory();
  },
  
  // 删除任务
  deleteTask: (id) => {
    set((state) => {
      const task = state.tasks[id];
      const newTasks = { ...state.tasks };
      
      // 删除所有子任务
      if (task.childrenIds && task.childrenIds.length > 0) {
        task.childrenIds.forEach(childId => {
          delete newTasks[childId];
        });
      }
      
      // 从父任务中移除
      if (task.parentId && newTasks[task.parentId]) {
        const parent = newTasks[task.parentId];
        const parentId = task.parentId;
        
        newTasks[parentId] = {
          ...parent,
          childrenIds: parent.childrenIds.filter(cid => cid !== id)
        };
        
        // 重新排列父任务的剩余子任务位置
        const remainingChildren = newTasks[parentId].childrenIds;
        remainingChildren.forEach((remainingChildId, index) => {
          const remainingChild = newTasks[remainingChildId];
          if (remainingChild) {
            newTasks[remainingChildId] = {
              ...remainingChild,
              position: calculateChildPosition(newTasks[parentId], index)
            };
          }
        });
      }
      
      // 从分类中移除
      if (task.categoryId && state.categories[task.categoryId]) {
        const category = state.categories[task.categoryId];
        const newCategories = { ...state.categories };
        newCategories[task.categoryId] = {
          ...category,
          taskIds: category.taskIds.filter(tid => tid !== id)
        };
        
        delete newTasks[id];
        return { tasks: newTasks, categories: newCategories };
      }
      
      delete newTasks[id];
      return { tasks: newTasks };
    });
    
    get().saveHistory();
  },
  
  // 删除分类
  deleteCategory: (id) => {
    set((state) => {
      const category = state.categories[id];
      const updatedTasks = { ...state.tasks };
      
      // 将分类中的任务设置为无分类
      category.taskIds.forEach(taskId => {
        if (updatedTasks[taskId]) {
          updatedTasks[taskId] = {
            ...updatedTasks[taskId],
            categoryId: null
          };
        }
      });
      
      const newCategories = { ...state.categories };
      delete newCategories[id];
      
      return {
        categories: newCategories,
        tasks: updatedTasks
      };
    });
    
    get().saveHistory();
  },
  
  // 历史记录
  saveHistory: () => {
    set((state) => {
      const snapshot = {
        tasks: state.tasks,
        categories: state.categories
      };
      
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(snapshot);
      
      // 限制历史记录数量
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },
  
  undo: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        const prevState = state.history[state.historyIndex - 1];
        return {
          ...prevState,
          history: state.history,
          historyIndex: state.historyIndex - 1
        };
      }
      return state;
    });
  },
  
  redo: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        return {
          ...nextState,
          history: state.history,
          historyIndex: state.historyIndex + 1
        };
      }
      return state;
    });
  },
  
  // 清空画布
  clearCanvas: () => {
    set({
      tasks: {},
      categories: {},
      history: [],
      historyIndex: -1
    });
  },
  
  // 获取所有数据
  getAllData: () => {
    const state = get();
    return {
      tasks: state.tasks,
      categories: state.categories
    };
  },
  
  // 加载数据
  loadData: (data) => {
    set({
      tasks: data.tasks || {},
      categories: data.categories || {},
      history: [],
      historyIndex: -1
    });
  }
}));

export default useCanvasStore;

