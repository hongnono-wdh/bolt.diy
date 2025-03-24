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

// 可用角色列表
const ROLES = [
  { id: '产品经理', name: '产品经理' },
  { id: '前端开发工程师', name: '前端开发' },
  { id: '后端开发工程师', name: '后端开发' }
];

export function RoleSelector() {
  // 使用roleStore获取当前角色
  const [currentRole, setCurrentRole] = useState(() => roleStore.get());
  const [isOpen, setIsOpen] = useState(false);

  // 订阅roleStore的变化
  useEffect(() => {
    // 订阅角色变化
    const unsubscribe = roleStore.subscribe((role) => {
      setCurrentRole(role);
    });
    
    // 组件卸载时取消订阅
    return unsubscribe;
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
          <span>{ROLES.find(r => r.id === currentRole)?.name || 'AI助手'}</span>
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="w-48 p-1 bg-bolt-elements-background-depth-2 rounded-md shadow-md z-10"
          sideOffset={5}
        >
          <div className="flex flex-col">
            {ROLES.map((role) => (
              <Button
                key={role.id}
                variant="ghost"
                size="sm"
                className={`justify-start text-left ${currentRole === role.id ? 'bg-bolt-elements-item-backgroundHover text-bolt-elements-textPrimary' : ''}`}
                onClick={() => selectRole(role.id)}
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
