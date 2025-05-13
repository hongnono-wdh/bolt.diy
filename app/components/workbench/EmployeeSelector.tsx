/**
 * 角色选择器组件
 * 
 * 该组件提供一个按钮式界面用于选择当前激活的角色。
 * 点击按钮可以切换当前激活的角色，状态会在全局同步。
 * 现在集成了团队管理，只显示当前团队可用的角色。
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '~/components/ui/Button';
import { roleStore } from '~/lib/stores/role';
import { Link } from '@remix-run/react';
import { getRolePromptsList } from '~/lib/stores/rolePrompts';
import { getCurrentTeam, getCurrentTeamRoles } from '~/lib/stores/teamStore';
import { TeamSelector } from './TeamSelector';

// 从rolePrompts存储中获取当前团队的角色列表
const getRoles = () => {
  // 获取当前团队的角色ID列表
  const teamRoles = getCurrentTeamRoles();
  
  // 打印调试信息
  console.log('Current team roles:', teamRoles);
  console.log('Available role prompts:', getRolePromptsList().map(r => r.name));
  
  // 如果当前没有角色列表，直接返回空数组
  if (!teamRoles || teamRoles.length === 0) {
    return [];
  }
  
  // 筛选出当前团队包含的角色
  const availableRoles = getRolePromptsList()
    .filter(role => teamRoles.some(teamRole => {
      // 根据角色名称进行匹配，支持中英文匹配
      return teamRole === role.name 
    }))
    .map(role => ({
      id: role.name,
      // 如果角色名称包含“工程师”，就移除这部分
      name: role.name.includes('工程师') ? role.name.replace('工程师', '') : role.name,
      description: role.description,
      // 基于角色名称设置头像图标
      avatar: getAvatarForRole(role.name)
    }));
    
  console.log('Filtered available roles:', availableRoles);
  return availableRoles;
};

// 根据角色名称获取适合的图标
function getAvatarForRole(roleName: string): string {
  if (roleName.includes('产品')) return 'i-ph:certificate';
  if (roleName.includes('前端')) return 'i-ph:code';
  if (roleName.includes('后端')) return 'i-ph:database';
  if (roleName.includes('律师')) return 'i-ph:scales';
  if (roleName.includes('设计')) return 'i-ph:paintbrush';
  // 默认图标
  return 'i-ph:user-gear';
}

export function RoleButtonSelector() {
  // 使用roleStore获取当前激活的角色
  const [currentRole, setCurrentRole] = useState(() => roleStore.get());
  const [roles, setRoles] = useState(() => getRoles());

  // 订阅roleStore的变化
  useEffect(() => {
    // 订阅角色状态变化
    const unsubscribe = roleStore.subscribe((roleId: string) => {
      setCurrentRole(roleId);
    });
    
    // 组件卸载时取消订阅
    return unsubscribe;
  }, []);
  
  // 监听角色列表和团队变化
  useEffect(() => {
    const handleRoleListUpdate = () => {
      console.log("查看角色列表",getRoles())
      
      // 角色列表更新时重新获取
      setRoles(getRoles());
    };
    
    // 添加事件监听
    window.addEventListener('roleListUpdate', handleRoleListUpdate);
    window.addEventListener('teamChange', handleRoleListUpdate);
    window.addEventListener('teamListUpdate', handleRoleListUpdate);
    
    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener('roleListUpdate', handleRoleListUpdate);
      window.removeEventListener('teamChange', handleRoleListUpdate);
      window.removeEventListener('teamListUpdate', handleRoleListUpdate);
    };
  }, []);

  // 选择角色并保存
  const selectRole = useCallback((roleId: string) => {
    // 使用roleStore设置当前角色
    roleStore.set(roleId);
  }, []);

  // 获取当前URL路径
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  return (
    <div className="p-3 mb-4 bg-bolt-elements-background-depth-2 rounded-20px shadow-md employee-selector">
      {/* 团队选择器 */}
      <div className="mb-3">
        <div className="bg-[#151515] rounded-16px">
          <TeamSelector />
        </div>
      </div>
      
      {/* 角色列表标题 */}
      <div className="text-sm font-medium text-bolt-elements-textPrimary mb-2 border-none">Role List</div>
      {/* 滚动条样式 - 使用父级类名约束 */}
      <style>
        {`
          .employee-selector .team-scrollbar {
            scrollbar-width: thin;
            -ms-overflow-style: none;
            scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
          }
          .employee-selector .team-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .employee-selector .team-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .employee-selector .team-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          .employee-selector .team-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}
      </style>
      
      <div className="flex items-center space-x-4 overflow-x-auto p-3 team-scrollbar">
        {roles.map((role, index) => {
          const isActive = currentRole === role.id;
          // 随机生成头像索引
          const avatarIndex = (index * 37) % 250; // 使用质数乘法确保更好的随机分布
          
          return (
            <button
              key={role.id}
              onClick={() => selectRole(role.id)}
              className={`
                flex-shrink-0 bg-[#252525] rounded-12px p-2 cursor-pointer transition-colors w-[220px] text-left
                ring-2 ${isActive 
                  ? 'ring-white/30' 
                  : 'ring-[#252525]'}
                hover:bg-[#303030] hover:ring-[#303030] transition-all duration-200
                active:scale-95 active:transition-transform active:duration-100
                focus:outline-none
              `}
            >
              <div className="flex items-center m-1">
                {/* Render avatar */}
                <div className="w-[40px] h-[40px] rounded-full overflow-hidden flex-shrink-0">
                  <img 
                    src={`/assets/images/avatar/${avatarIndex}.png`} 
                    alt={`${role.name}'s avatar`} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{role.name}</div>
                  <div className="text-[#888] text-xs truncate">
                    {isActive ? (
                      <span className="flex items-center text-[#39e58c]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#39e58c] mr-1.5 animate-pulse"></span>
                        Selected
                      </span>
                    ) : 'Team Member'}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        
        {/* 招聘更多人才卡片 - 保留注释 */}
        {/* <Link 
          to={`/hiring?returnUrl=${encodeURIComponent(currentPath)}`} 
          className={`
            flex-shrink-0 bg-[#252525] rounded-lg p-2 cursor-pointer transition-colors w-[220px] text-left
            ring-2 ring-[#252525]
            hover:bg-[#303030] hover:ring-[#303030] transition-all duration-200
            active:scale-95 active:transition-transform active:duration-100
            focus:outline-none
          `}
        >
          <div className="flex items-center m-1">
            <div className="w-[40px] h-[40px] rounded-full overflow-hidden flex-shrink-0 bg-[#333333] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="#ffffff"/>
              </svg>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <div className="text-white font-medium text-sm truncate">招聘更多人才</div>
              <div className="text-[#888] text-xs truncate">扩展您的团队</div>
            </div>
          </div>
        </Link> */}
        
        {/* 更换团队按钮 */}
        <button
          onClick={() => window.location.href = '/hiring?returnUrl=' + encodeURIComponent(currentPath)}
          className={`
            flex-shrink-0 bg-[#252525] rounded-12px p-2 cursor-pointer transition-colors w-[220px] text-left
            ring-2 ring-[#252525]
            hover:bg-[#303030] hover:ring-[#303030] transition-all duration-200
            active:scale-95 active:transition-transform active:duration-100
            focus:outline-none
          `}
        >
          <div className="flex items-center m-1">
            <div className="w-[40px] h-[40px] rounded-full overflow-hidden flex-shrink-0 bg-[#333333] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" fill="#ffffff"/>
              </svg>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <div className="text-white font-medium text-sm truncate">Change Team</div>
              <div className="text-[#888] text-xs truncate">Switch to other teams</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
