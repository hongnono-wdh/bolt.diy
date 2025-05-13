/**
 * 团队选择器组件
 * 
 * 该组件提供一个下拉菜单界面用于选择当前激活的团队。
 * 团队切换会影响可用的角色列表和提示词。
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '~/components/ui/Button';
import { getTeamsList, setCurrentTeam, getCurrentTeam } from '~/lib/stores/teamStore';
import type { Team } from '~/lib/stores/teamStore';

export function TeamSelector() {
  // 获取团队列表和当前团队
  const [teams, setTeams] = useState<Team[]>(() => getTeamsList());
  const [currentTeam, setCurrentTeamState] = useState<Team | undefined>(() => getCurrentTeam());
  const [isOpen, setIsOpen] = useState(false);
  
  // 订阅团队列表变化
  useEffect(() => {
    const handleTeamListUpdate = () => {
      // 团队列表更新时重新获取
      setTeams(getTeamsList());
      setCurrentTeamState(getCurrentTeam());
    };
    
    // 添加事件监听
    window.addEventListener('teamListUpdate', handleTeamListUpdate);
    window.addEventListener('teamChange', handleTeamListUpdate);
    
    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener('teamListUpdate', handleTeamListUpdate);
      window.removeEventListener('teamChange', handleTeamListUpdate);
    };
  }, []);

  // 选择团队
  const selectTeam = useCallback((teamId: string) => {
    setCurrentTeam(teamId);
    setIsOpen(false); // 关闭下拉菜单
  }, []);

  return (
    <div className="relative">
      <div 
        className="p-4 bg-bolt-elements-background-depth-1 rounded-12px shadow-md cursor-pointer flex items-center justify-between transition-all duration-200 hover:bg-bolt-elements-background-depth-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <div className="w-10 h-10 bg-bolt-elements-background-depth-3 rounded-full flex items-center justify-center mr-3 shadow-sm">
            <span className="i-ph:users-three text-bolt-elements-textPrimary text-lg"></span>
          </div>
          <div>
            <div className="text-sm font-medium text-bolt-elements-textPrimary mb-0.5">{currentTeam?.name || '选择团队'}</div>
            <div className="text-xs text-bolt-elements-textSecondary">{currentTeam?.roles.length || 0} roles</div>
          </div>
        </div>
        <span className={`i-ph:caret-down text-bolt-elements-textSecondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></span>
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-bolt-elements-background-depth-1 rounded-12px shadow-lg z-10 py-2 max-h-60 overflow-y-auto border border-[#2C2C2C]/50">
          {teams.map(team => (
            <div 
              key={team.id}
              className={`px-4 py-3 hover:bg-bolt-elements-background-depth-2 cursor-pointer ${currentTeam?.id === team.id ? 'bg-bolt-elements-background-depth-2' : ''} transition-colors duration-150`}
              onClick={() => selectTeam(team.id)}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-bolt-elements-background-depth-3 rounded-full flex items-center justify-center mr-3 shadow-sm">
                  <span className="i-ph:users-three text-bolt-elements-textPrimary text-sm"></span>
                </div>
                <div>
                  <div className="text-sm font-medium text-bolt-elements-textPrimary">{team.name}</div>
                  <div className="text-xs text-bolt-elements-textSecondary">{team.description}</div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add new team option */}
          <div 
            className="px-4 py-3 hover:bg-bolt-elements-background-depth-2 cursor-pointer border-t border-[#2C2C2C] mt-2 transition-colors duration-150"
            onClick={() => {
              // Get current path for return
              const currentPath = window.location.pathname + window.location.search;
              // Navigate to team creation page with return URL
              window.location.href =  '/hiring?returnUrl=' + encodeURIComponent(currentPath);
              setIsOpen(false);
            }}
          >
            <div className="flex items-center py-1">
              <div className="w-8 h-8 bg-bolt-elements-background-depth-3 rounded-full flex items-center justify-center mr-3 shadow-sm">
                <span className="i-ph:plus text-bolt-elements-textPrimary"></span>
              </div>
              <div>
                <div className="text-sm font-medium text-bolt-elements-textPrimary">Add New Team</div>
                <div className="text-xs text-bolt-elements-textSecondary">Create custom team</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
