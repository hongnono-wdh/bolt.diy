/**
 * 角色状态存储
 * 
 * 该模块负责管理当前选择的AI角色身份，包括保存角色状态到localStorage和提供角色读取接口。
 * 通过订阅机制和自定义事件，允许其他组件监听角色变化并做出响应。
 */

import { atom } from 'nanostores';
import { createScopedLogger } from '~/utils/logger';

// 角色存储键名
const ROLE_STORAGE_KEY = 'bolt_ai_role';

// 默认角色
const DEFAULT_ROLE = '产品经理';

const logger = createScopedLogger('RoleStore');

// 角色变更事件接口
export interface RoleChangeEventDetail {
  role: string;
  nextStepContent?: string;
}

// 初始化，尝试从localStorage加载，如果没有则使用默认值
const getInitialRole = () => {
  if (typeof localStorage !== 'undefined') {
    try {
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      return savedRole || DEFAULT_ROLE;
    } catch (e) {
      return DEFAULT_ROLE;
    }
  }
  return DEFAULT_ROLE;
};

// 创建角色状态原子
export const roleAtom = atom<string>(getInitialRole());

// 设置角色并触发相关事件
export function setRole(role: string, nextStepContent?: string, skipEvent: boolean = false): void {
  // 更新状态
  roleAtom.set(role);
  
  // 保存到localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch (e) {
      logger.error('保存角色到localStorage失败', e);
    }
  }
  
  // 触发自定义事件（兼容旧代码）
  if (!skipEvent && typeof window !== 'undefined') {
    logger.debug('触发roleChange事件:', role);
    window.dispatchEvent(new CustomEvent<RoleChangeEventDetail>('roleChange', { 
      detail: { 
        role, 
        nextStepContent 
      }
    }));
  }
  
  // 处理下一步内容
  if (nextStepContent && typeof window !== 'undefined') {
    logger.debug('准备自动提问:', nextStepContent);
    // 延迟一点时间，确保角色已经切换完成
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('autoSendMessage', { 
        detail: { message: nextStepContent } 
      }));
    }, 500);
  }
}

// 初始化事件监听
if (typeof window !== 'undefined') {
  // 监听自定义roleChange事件（兼容旧代码）
  window.addEventListener('roleChange', ((event: CustomEvent<RoleChangeEventDetail>) => {
    const { role } = event.detail;
    logger.debug('收到roleChange事件:', role);
    
    // 只更新内部状态，不触发新事件（避免循环）
    roleAtom.set(role);
  }) as EventListener);

  // 监听storage事件（跨窗口同步）
  window.addEventListener('storage', (event) => {
    if (event.key === ROLE_STORAGE_KEY && event.newValue) {
      roleAtom.set(event.newValue);
    }
  });
}

// 导出roleStore对象，提供与之前API兼容的接口
export const roleStore = {
  /**
   * 获取当前角色
   */
  get(): string {
    return roleAtom.get();
  },

  /**
   * 设置当前角色并通知订阅者
   */
  set(role: string, nextStepContent?: string, skipEvent: boolean = false): void {
    setRole(role, nextStepContent, skipEvent);
  },

  /**
   * 订阅角色变化
   */
  subscribe(callback: (role: string) => void): () => void {
    return roleAtom.subscribe(callback);
  }
};
