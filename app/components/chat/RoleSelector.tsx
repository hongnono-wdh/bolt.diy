/**
 * 角色选择器组件
 * 
 * 该组件提供一个UI界面用于选择当前AI助手的角色身份。
 * 选择的角色会影响系统提示词，从而改变AI助手的行为和专业领域。
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '~/components/ui/Button';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { roleStore } from '~/lib/stores/role';
import { getRolePromptsList } from '~/lib/stores/rolePrompts';

// 从rolePrompts存储中获取角色列表
const getRoles = () => {
  return getRolePromptsList().map(role => ({
    id: role.name,
    name: role.name,
    description: role.description
  }));
};

export function RoleSelector() {
  // 使用roleStore获取当前角色
  const [currentRole, setCurrentRole] = useState(() => roleStore.get());
  const [isOpen, setIsOpen] = useState(false);
  const [roles, setRoles] = useState(() => getRoles());

  // 订阅roleStore的变化
  useEffect(() => {
    // 订阅角色变化
    const unsubscribe = roleStore.subscribe((role) => {
      setCurrentRole(role);
    });
    
    // 组件卸载时取消订阅
    return unsubscribe;
  }, []);

  // 监听角色列表变化
  useEffect(() => {
    const handleRoleListUpdate = () => {
      // 角色列表更新时重新获取
      setRoles(getRoles());
    };
    
    // 添加事件监听
    window.addEventListener('roleListUpdate', handleRoleListUpdate);
    
    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener('roleListUpdate', handleRoleListUpdate);
    };
  }, []);

  // 选择角色并保存
  const selectRole = useCallback((role: string) => {
    // 使用roleStore设置角色
    roleStore.set(role);
    setIsOpen(false);
  }, []);

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
        >
          <span className="i-ph:user-gear-duotone"></span>
          <span>{roles.find(r => r.id === currentRole)?.name || 'AI助手'}</span>
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="w-48 p-1 bg-bolt-elements-background-depth-2 rounded-md shadow-md z-10"
          sideOffset={5}
        >
          <div className="flex flex-col">
            {roles.map((role) => (
              <Button
                key={role.id}
                variant="ghost"
                size="sm"
                className={`justify-start text-left ${currentRole === role.id ? 'bg-bolt-elements-item-backgroundHover text-bolt-elements-textPrimary' : ''}`}
                onClick={() => selectRole(role.id)}
                title={role.description}
              >
                {role.name}
              </Button>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
