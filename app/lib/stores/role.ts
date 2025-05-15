/**
 * 角色状态存储
 * 
 * 该模块负责管理当前选择的AI角色身份，包括保存角色状态到localStorage和提供角色读取接口。
 * 通过订阅机制和自定义事件，允许其他组件监听角色变化并做出响应。
 * 
 * 已与团队状态集成，确保角色选择在当前团队范围内。
 * 团队切换会影响角色提示词的内容。
 */

import { atom } from 'nanostores';
import { createScopedLogger } from '~/utils/logger';
import { getCurrentTeam, getCurrentTeamRoles } from './teamStore';

// 角色存储键名
const ROLE_STORAGE_KEY = 'bolt_ai_role';

// 默认角色
const DEFAULT_ROLE = '产品经理';

const logger = createScopedLogger('RoleStore');

// 角色变更事件接口
export interface RoleChangeEventDetail {
  role: string;
  nextStepContent?: string;
  teamId?: string; // 添加团队ID字段
}

// 初始化，尝试从localStorage加载，如果没有则使用默认值
// 同时确保角色存在于当前团队中
const getInitialRole = () => {
  if (typeof localStorage !== 'undefined') {
    try {
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      // 检查保存的角色是否在当前团队中
      if (savedRole) {
        const teamRoles = getCurrentTeamRoles();
        // 如果保存的角色存在于当前团队，则使用它
        if (teamRoles.includes(savedRole)) {
          return savedRole;
        }
      }
      
      // 否则，使用当前团队的第一个角色，或默认角色
      const teamRoles = getCurrentTeamRoles();
      return teamRoles.length > 0 ? teamRoles[0] : DEFAULT_ROLE;
    } catch (e) {
      return DEFAULT_ROLE;
    }
  }
  return DEFAULT_ROLE;
};

// 创建角色状态原子
export const roleAtom = atom<string>(getInitialRole());

// 设置角色并触发相关事件
export function setRole(role: string, nextStepContent?: string, skipEvent: boolean = false, skipAutoMessage: boolean = false): void {
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
  
  // 获取当前团队ID
  const currentTeam = getCurrentTeam();
  const teamId = currentTeam?.id || '';
  
  // 触发自定义事件（兼容旧代码）
  if (!skipEvent && typeof window !== 'undefined') {
    logger.debug('触发roleChange事件:', role, '团队:', teamId);
    window.dispatchEvent(new CustomEvent<RoleChangeEventDetail>('roleChange', { 
      detail: { 
        role, 
        nextStepContent,
        teamId // 添加团队ID
      }
    }));
  }
  
  // 处理下一步内容（如果不跳过自动消息）
  if (!skipAutoMessage && nextStepContent && typeof window !== 'undefined') {
    logger.debug('准备自动提问:', nextStepContent, '角色:', role);
    // 延迟一点时间，确保角色已经切换完成
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('autoSendMessage', { 
        detail: { 
          message: nextStepContent,
          roleName: role  // 传递角色名称信息
        } 
      }));
    }, 2000);
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
  
  // 监听团队变更事件
  window.addEventListener('teamChange', ((event: CustomEvent<{teamId: string}>) => {
    logger.debug('团队变更，重新设置角色');
    
    // 当团队变更时，重新初始化角色（使用新团队的第一个角色）
    const teamRoles = getCurrentTeamRoles();
    if (teamRoles.length > 0) {
      setRole(teamRoles[0], undefined, false);
    }
  }) as EventListener);
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
  set(role: string, nextStepContent?: string, skipEvent: boolean = false, skipAutoMessage: boolean = false): void {
    setRole(role, nextStepContent, skipEvent, skipAutoMessage);
  },

  /**
   * 订阅角色变化
   */
  subscribe(callback: (role: string) => void): () => void {
    return roleAtom.subscribe(callback);
  }
};
