/**
 * 角色选择器组件
 * 
 * 该组件提供一个按钮式界面用于选择当前激活的角色。
 * 点击按钮可以切换当前激活的角色，状态会在全局同步。
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '~/components/ui/Button';
import { roleStore } from '~/lib/stores/role';
import { Link } from '@remix-run/react';

// 可用角色列表（与RoleSelector保持一致）
const ROLES = [
  { id: '产品经理', name: '产品经理', avatar: 'i-ph:certificate' },
  { id: '前端开发工程师', name: '前端开发', avatar: 'i-ph:code' },
  { id: '后端开发工程师', name: '后端开发', avatar: 'i-ph:database' }
];

export function RoleButtonSelector() {
  // 使用roleStore获取当前激活的角色
  const [currentRole, setCurrentRole] = useState(() => roleStore.get());

  // 订阅roleStore的变化
  useEffect(() => {
    // 订阅角色状态变化
    const unsubscribe = roleStore.subscribe((roleId: string) => {
      setCurrentRole(roleId);
    });
    
    // 组件卸载时取消订阅
    return unsubscribe;
  }, []);

  // 选择角色并保存
  const selectRole = useCallback((roleId: string) => {
    // 使用roleStore设置当前角色
    roleStore.set(roleId);
  }, []);

  // 获取当前URL路径
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  return (
    <div className="p-3 mb-4 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor shadow-md">
      <div className="text-sm font-medium text-bolt-elements-textPrimary mb-2">当前角色</div>
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {ROLES.map((role) => {
          const isActive = currentRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => selectRole(role.id)}
              className={`
                px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-all duration-200
                ${isActive 
                  ? 'bg-accent-500/20 text-bolt-elements-textPrimary border border-accent-500/30 shadow-inner' 
                  : 'bg-bolt-elements-background-depth-1 text-bolt-elements-textSecondary border border-transparent'}
                hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary
                active:scale-95 active:transition-transform active:duration-100
                focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:ring-opacity-50
                min-w-[100px] justify-between
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 ${role.avatar} ${isActive ? 'text-accent-500' : 'text-bolt-elements-textTertiary'}`}></div>
                <span>{role.name}</span>
              </div>
              <div className="w-2 h-2 flex-shrink-0">
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-bolt-elements-textTertiary">点击按钮切换当前角色</span>
        <Link 
          to={`/hiring?returnUrl=${encodeURIComponent(currentPath)}`} 
          className="text-xs text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary transition-colors duration-200 flex items-center gap-1 underline underline-offset-2"
        >
          <span>去招聘更多人</span>
        </Link>
      </div>
    </div>
  );
}
