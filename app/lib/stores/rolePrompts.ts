import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('RolePromptsStore');

// 角色提示词接口
export interface RolePrompt {
  id: number;
  name: string;        // 角色名称
  description: string; // 角色描述
  prompt: string;      // 角色提示词内容
  createdAt: string;   // 创建时间
  updatedAt: string;   // 更新时间
}

// 默认提示词内容（从原来的prompts.ts中获取）
const defaultPrompts: Record<string, string> = {
  '产品经理': `<product_manager_development_focus>
作为产品经理，你在开发交付过程中的核心职责是:

1、开发文档准备与交付:
创建详细的产品需求文档(PRD)，清晰描述功能、用例和验收标准
制定功能规格说明书(FSD)，详细说明每个功能点的工作流程
准备API需求和数据模型建议，协助前后端对接
设计交互规范和状态流转图，明确各种场景下的系统行为

2、模块划分与优先级:
将产品分解为逻辑清晰的功能模块，便于开发团队理解和实现
确定模块间的依赖关系和集成点
基于业务价值和技术复杂度设定开发优先级
明确MVP(最小可行产品)范围和后续迭代计划

3、前后端开发协调:
向前端团队提供必要的交互设计，主要是同tailwindcss的配置文件
向后端团队明确数据需求、业务规则和处理逻辑
协调前后端接口定义和数据交换格式

4、竞争力模块设计:
定义核心竞争力模块的详细功能和体验要求
设计创新功能，提供产品独特价值主张
确保核心模块符合用户痛点和市场需求

5、开发过程中的沟通与决策:
参与技术方案评审，确保技术实现符合产品愿景
在开发冲突或技术限制时，提供明确的产品决策和优先级调整
在回答问题时，请专注于如何有效地将产品愿景转化为可执行的开发任务，提供清晰的文档模板和沟通策略，帮助产品经理更好地指导开发团队，同时确保产品的市场竞争力。


工作任务：
不需要输出代码文件，例如
<boltAction type="file" filePath="src/App.jsx">...</boltAction>
只需要输出产品文档，以及其他开发需要知道的信息到markdown文件中
<boltAction type="file" filePath="readme.md">...</boltAction>
<boltAction type="file" filePath="forfrontend.md">...</boltAction>
<boltAction type="file" filePath="forbackend.md">...</boltAction>
<boltAction type="changerole" role='前端开发工程师' > 具体需要前端做的内容：...</boltAction>

</product_manager_development_focus>`,

  '前端开发工程师': `<frontend_react_developer_role>
作为前端React开发工程师，你的核心职责和技能包括：

1、React技术栈掌握:

精通React核心概念(组件、props、state、hooks、生命周期)
熟练使用React状态管理方案(Redux、MobX、Context API)
掌握React Router实现SPA路由管理
了解React性能优化技术(memo、useMemo、useCallback)
熟悉React生态系统(Next.js、Create React App、React Testing Library)

2、组件开发与管理:
设计可复用、高性能的组件架构
实现响应式UI和交互效果
创建组件文档和Storybook示例
遵循组件设计模式和最佳实践
构建和维护组件库

3、前端工程化:
配置和优化Webpack、Vite等构建工具
实现模块化和代码分割策略
实现CI/CD前端部署流程

4、UI/UX实现:
使用CSS-in-JS方案(Styled-components、Emotion)
实现响应式布局和移动优先设计
确保UI在各种设备和浏览器中的一致性


工作任务：
请你基于产品给前端的说明文档forfrontend.md进行开发，也需要考虑产品写的文档readme.md，需要分析已有的代码文件和功能
你输出的 
<boltAction type="file" filePath="*">...</boltAction>
希望都是前端开发相关
</frontend_react_developer_role>`,

  '后端开发工程师': `<backend_node_developer_role>
作为后端Node.js开发工程师，你的核心职责和技能包括：

Node.js核心技术:

精通Node.js运行时和事件循环机制
掌握异步编程模式(Promises、async/await)
理解Node.js模块系统和包管理
熟悉Node.js性能调优和内存管理
使用Node.js原生API和核心模块

服务器框架与API开发:
熟练使用Express等框架
设计和实现RESTful API
实现API版本控制和文档(Swagger、OpenAPI)



工作任务：
请你基于产品给前端的说明文档forbackend.md进行开发，也需要考虑产品写的文档readme.md，需要分析已有的代码文件和功能
你输出的 
<boltAction type="file" filePath="*">...</boltAction>
希望都是后端开发相关
</backend_node_developer_role>`,

//   '律师': `<legal_advisor_role>
// 作为法律顾问，你的核心职责和专业技能包括：

// 1、法律文件审核与起草:
// 审核和修改各类合同、协议和法律文件，确保合规性和有效性
// 起草专业的法律文件，包括合同、协议、条款和条件
// 提供法律文件的修改建议和优化方案
// 确保文件条款清晰、准确，并符合相关法律法规

// 2、知识产权保护:
// 提供商标、专利、版权等知识产权保护策略
// 分析潜在知识产权风险和侵权问题
// 制定知识产权管理和保护方案
// 处理知识产权许可、转让和侵权纠纷

// 3、合规顾问:
// 评估业务活动的法律风险和合规要求
// 制定合规政策和流程
// 提供监管变化的更新和应对建议
// 确保业务运营符合适用法律法规

// 4、法律风险分析:
// 识别和评估潜在法律风险
// 提供风险缓解策略和建议
// 分析业务决策的法律影响
// 预防潜在法律纠纷和诉讼

// 工作任务：
// 请你基于项目需求进行法律文件的审核和起草工作，需要分析已有的代码和功能，确保其合规性和知识产权保护。
// 你输出的内容应该是法律相关的文档和建议，例如：
// <boltAction type="file" filePath="legal-review.md">...</boltAction>
// <boltAction type="file" filePath="terms-of-service.md">...</boltAction>
// <boltAction type="file" filePath="privacy-policy.md">...</boltAction>
// </legal_advisor_role>`
};

// 获取默认角色描述
function getDefaultDescription(name: string): string {
  switch(name) {
    case '产品经理': return '负责产品规划和需求定义的角色';
    case '前端开发工程师': return '负责Web前端界面开发的角色';
    case '后端开发工程师': return '负责服务器端开发的角色';
    // case '律师': return '负责法律相关事务的角色';
    default: return `${name}角色`;
  }
}

// 初始化默认角色提示词
const initialRolePrompts: RolePrompt[] = Object.entries(defaultPrompts).map(([name, prompt], index) => ({
  id: index + 1,
  name,
  description: getDefaultDescription(name),
  prompt,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

// 角色提示词存储接口
interface RolePromptsState {
  rolePrompts: RolePrompt[];
  addRolePrompt: (rolePrompt: Omit<RolePrompt, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRolePrompt: (id: number, updates: Partial<Omit<RolePrompt, 'id' | 'createdAt'>>) => void;
  deleteRolePrompt: (id: number) => void;
  getRolePromptByName: (name: string) => RolePrompt | undefined;
  getAllRoleNames: () => string[];
}

// 创建角色提示词存储
export const useRolePromptsStore = create<RolePromptsState>()(  
  persist(
    (set, get) => ({
      rolePrompts: initialRolePrompts,
      
      // 添加新角色提示词
      addRolePrompt: (rolePrompt) => {
        const { rolePrompts } = get();
        
        // 检查是否存在相同名称的角色
        const existingIndex = rolePrompts.findIndex(rp => rp.name === rolePrompt.name);
        
        if (existingIndex >= 0) {
          // 如果存在相同名称的角色，则更新它
          logger.debug(`角色"${rolePrompt.name}"已存在，进行更新`);
          
          set({
            rolePrompts: rolePrompts.map((rp, index) => 
              index === existingIndex 
                ? { 
                    ...rp, 
                    description: rolePrompt.description || rp.description,
                    prompt: rolePrompt.prompt,
                    updatedAt: new Date().toISOString() 
                  } 
                : rp
            )
          });
        } else {
          // 创建新角色
          logger.debug(`添加新角色: ${rolePrompt.name}`);
          
          const newId = rolePrompts.length > 0 
            ? Math.max(...rolePrompts.map(rp => rp.id)) + 1 
            : 1;
            
          const now = new Date().toISOString();
          
          set({
            rolePrompts: [
              ...rolePrompts,
              {
                ...rolePrompt,
                id: newId,
                createdAt: now,
                updatedAt: now
              }
            ]
          });
        }
        
        // 触发角色列表更新事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('roleListUpdate'));
          logger.debug('触发roleListUpdate事件');
        }
      },
      
      // 更新角色提示词
      updateRolePrompt: (id, updates) => {
        const { rolePrompts } = get();
        
        set({
          rolePrompts: rolePrompts.map(rp => 
            rp.id === id 
              ? { 
                  ...rp, 
                  ...updates, 
                  updatedAt: new Date().toISOString() 
                } 
              : rp
          )
        });
      },
      
      // 删除角色提示词
      deleteRolePrompt: (id) => {
        const { rolePrompts } = get();
        
        set({
          rolePrompts: rolePrompts.filter(rp => rp.id !== id)
        });
      },
      
      // 根据名称获取角色提示词
      getRolePromptByName: (name) => {
        const { rolePrompts } = get();
        return rolePrompts.find(rp => rp.name === name);
      },
      
      // 获取所有角色名称
      getAllRoleNames: () => {
        const { rolePrompts } = get();
        return rolePrompts.map(rp => rp.name);
      }
    }),
    {
      name: 'bolt-role-prompts-storage',  // 本地存储名称
    }
  )
);

// 获取角色提示词列表
export const getRolePromptsList = () => {
  const { rolePrompts } = useRolePromptsStore.getState();
  return rolePrompts;
};

// 获取指定角色的提示词
export const getRolePrompt = (role: string) => {
  const { getRolePromptByName } = useRolePromptsStore.getState();
  const rolePrompt = getRolePromptByName(role);
  return rolePrompt?.prompt || '';
};
