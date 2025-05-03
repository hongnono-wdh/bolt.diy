/**
 * 员工状态管理存储
 * 
 * 该存储用于管理当前激活的员工状态，支持全局状态同步。
 * 可以获取当前激活的员工ID，设置新的激活员工，以及订阅员工状态变化。
 */
import { atom } from 'nanostores';

// 定义员工列表（与RoleSelector中的角色列表保持一致）
export const EMPLOYEES = [
  { id: '产品经理', name: '产品经理', avatar: 'i-ph:certificate' },
  { id: '前端开发工程师', name: '前端开发', avatar: 'i-ph:code' },
  { id: '后端开发工程师', name: '后端开发', avatar: 'i-ph:database' }
];

// 创建员工状态存储
const employeeAtom = atom<string>(EMPLOYEES[0].id);

/**
 * 员工状态管理存储
 */
export const employeeStore = {
  /**
   * 获取当前激活的员工ID
   * @returns 当前激活的员工ID
   */
  get: () => employeeAtom.get(),
  
  /**
   * 设置当前激活的员工
   * @param employeeId 要激活的员工ID
   */
  set: (employeeId: string) => {
    employeeAtom.set(employeeId);
  },
  
  /**
   * 订阅员工状态变化
   * @param callback 状态变化后的回调函数
   * @returns 取消订阅的函数
   */
  subscribe: (callback: (employeeId: string) => void) => {
    return employeeAtom.subscribe(callback);
  }
};
