import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('TeamStore');

// 团队接口定义
export interface Team {
  id: string;        // 团队ID
  name: string;      // 团队名称
  description: string; // 团队描述
  roles: string[];   // 该团队包含的角色ID列表
  createdAt: string; // 创建时间
  updatedAt: string; // 更新时间
}

// Default team data
const defaultTeams: Team[] = [
  {
    id: 'dev-team',
    name: 'Development Team',
    description: 'Product development team with product, frontend, and backend roles',
    roles: ['Product Manager', 'Frontend Developer', 'Backend Developer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fiction-team',
    name: 'Fiction & Screenwriting Team',
    description: 'Creative team focused on fiction writing and screenwriting',
    roles: ['Novelist', 'Screenwriter', 'Copywriter', 'Story Architect'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'solution-team',
    name: 'Solution Analysis Team',
    description: '解决方案分析团队，专注于全面分析技术解决方案的可行性与实现路径',
    roles: ['Biology Expert', 'Physics Expert', 'Engineering Manager', 'Internet Expert'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // More teams can be added in the future, for example:
  // { id: 'legal-team', name: 'Legal Team', ... }
];

// 团队存储接口
interface TeamState {
  teams: Team[];                  // 所有团队
  currentTeamId: string;          // 当前激活的团队ID
  
  // 管理团队
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTeam: (id: string, updates: Partial<Omit<Team, 'id' | 'createdAt'>>) => void;
  deleteTeam: (id: string) => void;
  
  // 获取团队信息
  getTeamById: (id: string) => Team | undefined;
  getAllTeamIds: () => string[];
  
  // 设置当前团队
  setCurrentTeam: (teamId: string) => void;
  getCurrentTeam: () => Team | undefined;
  
  // 团队角色管理
  addRoleToTeam: (teamId: string, roleId: string) => void;
  removeRoleFromTeam: (teamId: string, roleId: string) => void;
  getTeamRoles: (teamId: string) => string[];
}

// 创建团队状态存储
export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: defaultTeams,
      currentTeamId: defaultTeams[0].id, // 默认选择第一个团队
      
      // 添加新团队
      addTeam: (team) => {
        const { teams } = get();
        
        // 生成一个唯一的团队ID
        const teamId = `team-${Date.now()}`;
        
        // 检查是否存在相同名称的团队
        const existingIndex = teams.findIndex(t => t.name === team.name);
        
        if (existingIndex >= 0) {
          // 如果存在相同名称的团队，则更新它
          logger.debug(`团队"${team.name}"已存在，进行更新`);
          
          set({
            teams: teams.map((t, index) => 
              index === existingIndex 
                ? { 
                    ...t, 
                    name: team.name,
                    description: team.description || t.description,
                    roles: team.roles || t.roles,
                    updatedAt: new Date().toISOString() 
                  } 
                : t
            )
          });
        } else {
          // 创建新团队
          logger.debug(`添加新团队: ${team.name}`);
          
          const now = new Date().toISOString();
          
          set({
            teams: [
              ...teams,
              {
                ...team,
                id: teamId,
                createdAt: now,
                updatedAt: now
              }
            ]
          });
        }
        
        // 触发团队列表更新事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('teamListUpdate'));
          logger.debug('触发teamListUpdate事件');
        }
      },
      
      // 更新团队
      updateTeam: (id, updates) => {
        const { teams } = get();
        
        set({
          teams: teams.map(team => 
            team.id === id 
              ? { 
                  ...team, 
                  ...updates, 
                  updatedAt: new Date().toISOString() 
                } 
              : team
          )
        });
        
        // 触发团队更新事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('teamUpdate', { detail: { teamId: id } }));
        }
      },
      
      // 删除团队
      deleteTeam: (id) => {
        const { teams, currentTeamId } = get();
        
        // 删除团队
        const updatedTeams = teams.filter(team => team.id !== id);
        
        // 如果删除的是当前选中的团队，则切换到第一个可用团队
        let newCurrentTeamId = currentTeamId;
        if (currentTeamId === id && updatedTeams.length > 0) {
          newCurrentTeamId = updatedTeams[0].id;
        }
        
        set({
          teams: updatedTeams,
          currentTeamId: newCurrentTeamId
        });
        
        // 触发团队列表更新事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('teamListUpdate'));
        }
      },
      
      // 根据ID获取团队
      getTeamById: (id) => {
        const { teams } = get();
        return teams.find(team => team.id === id);
      },
      
      // 获取所有团队ID
      getAllTeamIds: () => {
        const { teams } = get();
        return teams.map(team => team.id);
      },
      
      // 设置当前团队
      setCurrentTeam: (teamId) => {
        const { teams } = get();
        
        // 确保团队存在
        const teamExists = teams.some(team => team.id === teamId);
        if (!teamExists) {
          logger.warn(`尝试设置不存在的团队ID: ${teamId}`);
          return;
        }
        
        // 设置当前团队
        set({ currentTeamId: teamId });
        
        // 触发团队切换事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('teamChange', { detail: { teamId } }));
          logger.debug(`当前团队已切换为: ${teamId}`);
        }
      },
      
      // 获取当前团队
      getCurrentTeam: () => {
        const { teams, currentTeamId } = get();

        console.log("查看所有团队",teams,currentTeamId)
        console.log("查看所有团队2",teams.find(team => team.id === currentTeamId))
        return teams.find(team => team.id === currentTeamId);
      },
      
      // 向团队添加角色
      addRoleToTeam: (teamId, roleId) => {
        const { teams } = get();
        
        set({
          teams: teams.map(team => 
            team.id === teamId 
              ? { 
                  ...team, 
                  roles: team.roles.includes(roleId) ? team.roles : [...team.roles, roleId],
                  updatedAt: new Date().toISOString() 
                } 
              : team
          )
        });
      },
      
      // 从团队移除角色
      removeRoleFromTeam: (teamId, roleId) => {
        const { teams } = get();
        
        set({
          teams: teams.map(team => 
            team.id === teamId 
              ? { 
                  ...team, 
                  roles: team.roles.filter(id => id !== roleId),
                  updatedAt: new Date().toISOString() 
                } 
              : team
          )
        });
      },
      
      // 获取团队角色列表
      getTeamRoles: (teamId) => {
        const team = get().getTeamById(teamId);
        return team ? team.roles : [];
      }
    }),
    {
      name: 'bolt-team-storage', // 本地存储名称
    }
  )
);

// 获取当前团队信息
export const getCurrentTeam = () => {
  return useTeamStore.getState().getCurrentTeam();
};

// 获取当前团队的角色ID列表
export const getCurrentTeamRoles = () => {
  const currentTeam = getCurrentTeam();
  return currentTeam ? currentTeam.roles : [];
};

// 获取团队列表
export const getTeamsList = () => {
  return useTeamStore.getState().teams;
};

// 设置当前团队
export const setCurrentTeam = (teamId: string) => {
  useTeamStore.getState().setCurrentTeam(teamId);
};
