import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData, useSearchParams, Form, Link, useNavigate } from '@remix-run/react';
import { Header } from '~/components/header/Header';
import { useState, useEffect } from 'react';
import { useRolePromptsStore } from '~/lib/stores/rolePrompts';
import { roleStore } from '~/lib/stores/role';
// import { useTranslation } from 'react-i18next'; // 暂时注释此导入，直到安装相应的包

// 员工类型接口定义
interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  avatar: string;
  skills: string[];
  experience: number;
  age: number;
  description: string;
  hiringPrice: number;
  location: string;
  toolUtilization: number;
  originalId?: string; // 新增字段，用于存储应用ID
}

// 接口类型定义，用于匹配本地API返回的数据
interface RoleApiResponse {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  appId?: string; // 新增字段，应用ID
}

// API响应接口定义
interface ShareIdApiResponse {
  code: number;
  data: Array<{
    shareId: string;
    appId: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

// 生成随机技能的函数
const generateRandomSkills = (role: string): string[] => {
  // 根据角色名称生成合适的技能
  const skillsMap: {[key: string]: string[]} = {
    'Product Manager': ['PRD Writing', 'Axure', 'Data Analysis', 'Requirement Management', 'Agile Methods', 'User Research'],
    'Frontend Developer': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular', 'TypeScript', 'Webpack'],
    'Backend Developer': ['Java', 'Python', 'Node.js', 'Go', 'C++', 'SQL', 'MongoDB', 'Redis'],
    'Lawyer': ['Contract Review', 'Legal Consulting', 'IP Protection', 'Business Negotiation', 'Legal Documentation'],
  };
  
  // 默认技能
  const defaultSkills = ['Communication', 'Teamwork', 'Problem Solving', 'Documentation'];
  
  // 获取角色对应的技能，如果没有预定义则使用默认技能
  const roleSkills = skillsMap[role] || defaultSkills;
  
  // 随机选择3-5个技能
  const skillCount = Math.floor(Math.random() * 3) + 3; // 3-5个技能
  const shuffled = [...roleSkills].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, skillCount);
};

// 生成随机部门的函数
const getDepartmentFromRole = (role: string): string => {
  // 检查是否包含关键字比对全名更灵活
  const roleLower = role.toLowerCase();
  if (roleLower.includes('frontend') || roleLower.includes('backend') || roleLower.includes('developer')) return 'R&D';
  if (roleLower.includes('product')) return 'Product';
  if (roleLower.includes('lawyer') || roleLower.includes('legal')) return 'Legal';
  if (roleLower.includes('design')) return 'Design';
  if (roleLower.includes('analyst') || roleLower.includes('data')) return 'Analytics';
  return 'Other';
};

// API配置
const API_CONFIG = {
  API_BASE_URL: 'http://localhost:3001',
  FASTGPT_API_KEY: 'fastgpt-api-key',
  // 是否使用模拟数据（设置为true时使用本地模拟数据代替API请求）
  USE_MOCK_DATA: true
};

// 生成模拟角色数据
const generateMockRolesData = (): RoleApiResponse[] => {
  console.log('生成模拟角色数据...');
  // 模拟角色数据
  const mockRoles: RoleApiResponse[] = [
    {
      id: 1,
      name: 'Product Manager',
      description: 'Responsible for product planning and requirements definition, ensuring products meet user needs and achieve business goals. Familiar with product lifecycle management and able to write detailed PRDs.',
      created_at: '2025-05-01T10:00:00Z',
      updated_at: '2025-05-08T08:30:00Z',
      appId: '6818d590adf5217c8474471d'
    },
    {
      id: 2,
      name: 'Backend Developer',
      description: 'Responsible for server-side application development and maintenance, proficient in multiple programming languages and database technologies, able to build high-performance, scalable system architectures.',
      created_at: '2025-05-02T11:30:00Z',
      updated_at: '2025-05-07T14:20:00Z',
      appId: '6818d4b1adf5217c8474415b'
    },
    {
      id: 3,
      name: 'Frontend Developer',
      description: 'Responsible for Web frontend interface development, proficient in HTML, CSS, JavaScript and other technologies, mastering modern frontend frameworks with a focus on user experience and interface interaction.',
      created_at: '2025-05-03T09:15:00Z',
      updated_at: '2025-05-06T16:45:00Z',
      appId: '6818d51aadf5217c84744494'
    },
    {
      id: 4,
      name: 'Lawyer',
      description: 'Professional legal advisor providing comprehensive legal consultation and services, specializing in contract review, intellectual property protection, and commercial dispute resolution.',
      created_at: '2025-05-04T13:40:00Z',
      updated_at: '2025-05-05T11:10:00Z',
      appId: '6818d586adf5217c84744643'
    },
    {
      id: 5,
      name: 'UI Designer',
      description: 'Responsible for user interface design, creating beautiful and user-friendly interfaces, proficient in design tools and principles, able to transform product requirements into visual designs.',
      created_at: '2025-05-04T15:20:00Z',
      updated_at: '2025-05-08T09:35:00Z',
      appId: '6818d5a1adf5217c84744789'
    },
    {
      id: 6,
      name: 'Data Analyst',
      description: 'Responsible for data collection, processing, and analysis, providing business insights through data mining and statistical methods to support decision-making and business optimization.',
      created_at: '2025-05-03T10:10:00Z',
      updated_at: '2025-05-07T15:50:00Z',
      appId: '6818d5c2adf5217c84744891'
    }
  ];
  
  console.log(`生成了${mockRoles.length}条模拟角色数据`);
  return mockRoles;
};

// 从API获取角色数据并转换为员工数据（现在支持真实API和模拟数据两种模式）
const fetchEmployeesData = async (): Promise<Employee[]> => {
  console.log('开始获取角色数据...');
  let rolesData: RoleApiResponse[] = [];
  
  try {
    // 检查是否使用模拟数据
    if (API_CONFIG.USE_MOCK_DATA) {
      console.log('使用模拟数据模式');
      // 使用模拟数据
      rolesData = generateMockRolesData();
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 800));
    } else {
      // 使用真实API
      console.log('使用真实API模式，请求URL: http://localhost:3001/api/roles');
      console.log('发起API请求...', new Date().toLocaleTimeString());
      const response = await fetch('http://localhost:3001/api/roles');
      console.log('收到响应，状态码:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorMsg = `API响应错误: ${response.status} ${response.statusText}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('解析响应JSON数据...');
      rolesData = await response.json();
    }
    
    console.log('收到的原始数据:', rolesData);
    console.log('数据项数:', rolesData.length);
    
    // 过滤掉空数据或无效数据（例如name或description为空的记录）
    const validRoles = rolesData.filter(role => 
      role.name && role.name.trim() !== '' && 
      role.description && role.description.trim() !== '' &&
      role.name !== '1' // 特别排除id为5的测试数据
    );
    
    console.log('过滤后的有效角色数:', validRoles.length);
    
    // 将角色数据转换为Employee格式
    return validRoles.map(role => {
      // 根据角色ID生成随机但稳定的数据
      const seed = role.id;
      const randomAge = 25 + (seed % 20); // 25-44岁
      const randomExperience = 1 + (seed % 15); // 1-15年经验
      const randomPrice = 50000 + (seed * 10000); // 基于角色ID生成合理的价格
      const randomUtilization = 60 + (seed % 30); // 60-89%的工具使用率
      
      // 生成默认应用ID映射，用于模拟AI雇佣功能
      const appIdMapping: {[key: number]: string} = {
        1: '6818d590adf5217c8474471d',
        2: '6818d4b1adf5217c8474415b',
        3: '6818d51aadf5217c84744494',
        4: '6818d586adf5217c84744643'
      };
      
      return {
        id: role.id,
        name: role.name,
        position: role.name,
        department: getDepartmentFromRole(role.name),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
        skills: generateRandomSkills(role.name),
        experience: randomExperience,
        age: randomAge,
        description: role.description,
        hiringPrice: randomPrice,
        location: 'Shanghai',
        toolUtilization: randomUtilization,
        originalId: appIdMapping[role.id] || `app-${role.id}` // 添加应用ID
      };
    });
  } catch (error) {
    console.error('获取员工数据失败:', error);
    // 如果API请求失败，返回默认员工数据
    return [
      {
        id: 1,
        name: 'Product Manager',
        position: 'Product Manager',
        department: 'Product',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
        skills: ['PRD Writing', 'Axure', 'Data Analysis'],
        experience: 3,
        age: 28,
        description: 'Responsible for product planning and requirements definition',
        hiringPrice: 85000,
        location: 'Shanghai',
        toolUtilization: 85,
        originalId: '6818d590adf5217c8474471d'
      },
      {
        id: 2,
        name: 'Backend Developer',
        position: 'Backend Developer',
        department: 'R&D',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
        skills: ['Java', 'Python', 'MongoDB', 'Spring Boot'],
        experience: 5,
        age: 32,
        description: 'Responsible for server-side development',
        hiringPrice: 95000,
        location: 'Beijing',
        toolUtilization: 92,
        originalId: '6818d4b1adf5217c8474415b'
      },
      {
        id: 3,
        name: 'Frontend Developer',
        position: 'Frontend Developer',
        department: 'R&D',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
        skills: ['React', 'Vue', 'TypeScript', 'CSS'],
        experience: 4,
        age: 30,
        description: 'Responsible for Web frontend interface development',
        hiringPrice: 78000,
        location: 'Shenzhen',
        toolUtilization: 88,
        originalId: '6818d51aadf5217c84744494'
      },
      {
        id: 4,
        name: 'Lawyer',
        position: 'Lawyer',
        department: 'Legal',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
        skills: ['Contract Review', 'Legal Consulting', 'IP Protection'],
        experience: 6,
        age: 35,
        description: 'Professional legal advisor',
        hiringPrice: 110000,
        location: 'Guangzhou',
        toolUtilization: 75,
        originalId: '6818d586adf5217c84744643'
      }
    ];
  }
};

// Metadata configuration
export const meta: MetaFunction = () => {
  return [{ title: 'Hiring - Bolt' }, { name: 'description', content: 'Find and hire talented employees' }];
};

// Loader函数处理搜索查询并从API获取数据
export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log('----- Loader函数开始执行 -----');
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('q') || '';
  console.log('搜索查询参数:', searchQuery);
  
  console.log('开始获取员工数据...');
  // 从API获取所有员工数据
  const allEmployees = await fetchEmployeesData();
  console.log(`获取到${allEmployees.length}条员工数据`);
  
  let filteredEmployees = allEmployees;
  
  // 如果有搜索查询，过滤员工列表
  if (searchQuery) {
    console.log(`开始根据"${searchQuery}"过滤员工列表...`);
    filteredEmployees = allEmployees.filter(employee => {
      const matchesName = employee.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = employee.position.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = employee.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSkill = employee.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesName || matchesPosition || matchesDepartment || matchesSkill;
    });
    console.log(`搜索结果: 找到${filteredEmployees.length}条匹配的员工记录`);
  }
  
  console.log('----- Loader函数完成 -----');
  return json({
    employees: filteredEmployees,
    searchQuery
  });
};

// 定义一个加载钩子，模拟Chakra UI的useLoading
function useLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const Loading = ({ children }: { children: React.ReactNode }) => (
    isLoading ? <div>{children}</div> : null
  );
  
  return { isLoading, setIsLoading, Loading };
}

// 员工卡片组件 - 新设计风格
function EmployeeCard({ employee, onHire }: { employee: Employee; onHire: (employee: Employee) => void }) {
  const { isLoading, setIsLoading } = useLoading();
  
  // 技能图标列表
  const getSkillIcon = (index: number) => {
    const icons = [
      // 位置图标
      <svg key="location" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#7c7c7c"/>
      </svg>,
      // 教育图标
      <svg key="education" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="#7c7c7c"/>
      </svg>,
      // 用户警告图标
      <svg key="alert" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#7c7c7c"/>
      </svg>
    ];
    return icons[index % icons.length];
  };
  
  // 开发者图标
  const DeveloperIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="#7c7c7c"/>
    </svg>
  );
  
  // 存钱罐图标
  const SavingIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.83 7.5l-2.27-2.27c.07-.42.18-.81.32-1.15.1-.25.18-.48.25-.71-1.96.23-3.51 1.34-4.01 2.04l-4.59.14C8.53 4.38 7.29 3.59 4.97 3.5c.07.23.15.46.24.7.81 1.69 2.34 2.8 4.01 3.01l.77 1.93c-3.21.81-5.49 3.7-5.49 7.05 0 .47.04.93.13 1.37.32 1.55 1.14 2.9 2.27 3.94v-2.5h1.97c1.19 0 2.3-.35 3.26-.96-.51-.76-.8-1.65-.8-2.54 0-1.33.57-2.64 1.59-3.61 1.02-.97 2.36-1.47 3.77-1.39 1.43.08 2.86.86 3.91 2.15 1.05 1.29 1.49 2.89 1.23 4.36-.12.68-.4 1.31-.83 1.82l.27.28c1.02-.97 1.77-2.19 2.13-3.58.37-1.39.19-2.92-.4-4.26L22 7.37c-.4-.34-.89-.57-1.4-.68l-.54-.08-.23-.47zM7.5 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm10.24 6.17l-1.15 1.15c-1.48-1.48-3.9-1.5-5.4-.06l-1.2-1.2c2.3-2.3 6.05-2.28 8.37-.27l-.62.38zM13.5 14c0 .83.67 1.5 1.5 1.5.16 0 .31-.03.46-.07l.96.96c-.43.17-.9.26-1.42.26-1.93 0-3.5-1.57-3.5-3.5 0-.76.25-1.47.67-2.04l.9.52L13.1 13c.25.61.82 1 1.4 1v-1.5l-1.49.5-.46-1.1 1.17-.5.36-.87.83.37.22.5h1.87c-.09-.39-.26-.75-.51-1.07-.98-1.21-2.7-1.41-4.02-.47-.67.47-1.12 1.19-1.26 2l-.81-.36c.19-1.15.82-2.15 1.71-2.82 1.73-1.3 4.11-1.04 5.56.6.71.8 1.08 1.79 1.08 2.79 0 1.35-.66 2.67-1.93 3.47l-.4-.93c.96-.59 1.54-1.61 1.54-2.72 0-.14-.01-.28-.04-.42h-2.7l-1.86-2.24-2 3.1-2.24-.73 1.55-3.17 1.75 1.9z" fill="#7c7c7c"/>
    </svg>
  );

  const handleHireWithLoading = async (employee: Employee) => {
    setIsLoading(true);
    try {
      await onHire(employee);
    } finally {
      // 如果onHire函数在重定向前返回，确保3秒后重置加载状态
      setTimeout(() => setIsLoading(false), 3000);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-[36px] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 w-full mb-5 relative">
      {/* 工具使用率指示器 (右上角) */}
      <div className="absolute top-[30px] right-[20px] z-10">
        <div className="px-3 py-1 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] flex items-center">
          <DeveloperIcon />
          <span className="text-sm text-[#888] mr-1 ml-2">Field：</span>
          <span className="text-sm text-white">Tool Utilization</span>
        </div>
      </div>

      <div className="flex flex-col">
        {/* 上部信息区域 */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 左侧：头像和基本信息 */}
            <div className="flex items-start gap-4 flex-1">
              {/* 双层边框头像 */}
              <div className="rounded-[36px] p-1.5 border-[3px] border-[#353535] mr-[10px]">
                <div className="w-[180px] h-[180px] rounded-[32px] border-2 border-[#353535] bg-[#353535] overflow-hidden">
                  {/* 使用内联SVG而不是外部请求 */}
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-700">
                    <div className="text-white text-[60px] font-bold">
                      {employee.name ? employee.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col flex-1">
                <h3 className="text-[20px] font-normal text-white mb-1">{employee.name}</h3>
                <p className="text-[#888] text-sm">{employee.position}</p>

                {/* 技能标签组 */}
                <div className="flex flex-wrap gap-2 my-6">
                  {employee.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-5 py-2 rounded-full bg-[#101010] text-white border border-[#2c2c2c] hover:bg-[#1c1c1c] transition-all duration-200 select-none flex items-center"
                    >
                      <span className="mr-2">{getSkillIcon(index)}</span>
                      {skill}
                    </span>
                  ))}
                </div>

                <p className="text-[#888] text-sm mb-3">{employee.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部：雇佣价格和雇佣按钮 */}
        <div className="px-6 py-4 flex justify-between items-center bg-[#262626]">
          <div className="flex items-center">
            <SavingIcon />
            <span className="text-[#888] font-normal text-base ml-2">Hiring Price:</span>
            <span className="text-white text-base ml-2">Free</span>
          </div>

          <button
            onClick={() => handleHireWithLoading(employee)}
            disabled={isLoading}
            className="px-8 py-2 text-lg h-[40px] bg-white hover:bg-[rgba(255,255,255,0.9)] text-[#101010] rounded-[50px] font-black border-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Hiring...' : 'Hire'}
          </button>
        </div>
      </div>

      {/* 全屏加载 */}
      {isLoading && (
        <div className="fixed z-[1500] bg-[rgba(0,0,0,0.7)] inset-0 flex items-center justify-center flex-col">
          <div 
            className="w-[40px] h-[40px] rounded-full border-[3px] border-[rgba(255,255,255,0.1)] border-t-white mb-4"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <div className="text-white font-bold text-md">
            Hiring in progress...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

// 搜索结果列表组件 - 使用新的黑色UI风格设计
function SearchResultsList({ employees, onHire }: { employees: Employee[]; onHire: (employee: Employee) => void }) {
  return (
    <div className="flex flex-col space-y-4">
      {employees.map((employee) => (
        <div key={employee.id}>
          <EmployeeCard key={employee.id} employee={employee} onHire={onHire} />
        </div>
      ))}
    </div>
  );
}
// 主页面组件
export default function Hiring() {
  const { employees, searchQuery } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  const [hiredEmployees, setHiredEmployees] = useState<number[]>([]);
  const [hireMessage, setHireMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // 从 rolePrompts 存储中获取 addRolePrompt 函数
  const addRolePrompt = useRolePromptsStore(state => state.addRolePrompt);
  
  // 获取returnUrl参数，默认为首页
  const returnUrl = searchParams.get('returnUrl') || '/';
  
  // 同步URL搜索参数与本地状态
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);
  
  // 处理搜索提交
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!searchTerm.trim()) {
      // 如果搜索框为空，清除搜索参数
      searchParams.delete('q');
      setSearchParams(searchParams);
    }
  };
  
  // 保存员工数据到本地存储
  const saveEmployeeToLocalStorage = async (
    employee: Employee,
    apiData: any,
    shareId: string,
    appId: string
  ) => {
    try {
      console.log('员工信息', employee);

      // 安全检查确保员工对象存在
      if (!employee) {
        console.error('Employee object is undefined');
        return false;
      }

      // 将头像图片转换为base64以便离线存储
      let avatarBase64 = '';
      try {
        // 安全访问avatar属性并提供默认回退
        const avatarUrl =
          employee.avatar ||
          'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23ccc%22%3E%3Cpath%20d%3D%22M12%2012c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0%202c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z%22%2F%3E%3C%2Fsvg%3E';

        // 仅在它是有效URL时尝试获取
        if (avatarUrl && avatarUrl.startsWith('http')) {
          const avatarResponse = await fetch(avatarUrl);
          const avatarBlob = await avatarResponse.blob();
          avatarBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(avatarBlob);
          });
        } else {
          // 如果已经是数据URL则直接使用
          avatarBase64 = avatarUrl;
        }
      } catch (error) {
        console.error('Failed to convert avatar to base64:', error);
        // 如果转换失败，使用默认头像
        avatarBase64 =
          employee.avatar ||
          'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23ccc%22%3E%3Cpath%20d%3D%22M12%2012c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0%202c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z%22%2F%3E%3C%2Fsvg%3E';
      }

      // 创建员工数据对象
      const employeeData = {
        employee: {
          ...employee,
          avatar: avatarBase64 // 用base64替换URL
        },
        apiData,
        shareId,
        appId,
        timestamp: Date.now()
      };

      // 获取现有雇佣员工列表或初始化新列表
      let hiredEmployees = [];
      const existingData = localStorage.getItem('hiredEmployees');

      if (existingData) {
        try {
          hiredEmployees = JSON.parse(existingData);
          if (!Array.isArray(hiredEmployees)) {
            hiredEmployees = [];
          }
        } catch (error) {
          console.error('Error parsing existing hired employees:', error);
          hiredEmployees = [];
        }
      }

      // 检查是否已存在同一shareId的员工
      const existingIndex = hiredEmployees.findIndex((item) => item.shareId === shareId);

      if (existingIndex >= 0) {
        // 更新现有员工数据
        hiredEmployees[existingIndex] = employeeData;
      } else {
        // 添加新员工到列表
        hiredEmployees.push(employeeData);
      }

      // 保存更新后的列表到本地存储
      localStorage.setItem('hiredEmployees', JSON.stringify(hiredEmployees));

      // 为了向后兼容，也作为单个员工保存
      localStorage.setItem('hiredEmployee', JSON.stringify(employeeData));

      console.log('Employee data saved to local storage:', employeeData);
      console.log('Updated hired employees list:', hiredEmployees);
      return true;
    } catch (error) {
      console.error('Error saving to local storage:', error);
      return false;
    }
  };
  
  // 获取shareId并重定向到分享页面
  const fetchShareIdAndRedirect = async (appId: string, employee: Employee) => {
    // 定义回退数据类型
    type FallbackDataType = {
      [key: string]: {
        shareId: string;
        appId: string;
      };
    };

    // API请求失败时使用的回退数据
    const fallbackData: FallbackDataType = {
      // 映射appIds到相应的shareIds
      '6818d590adf5217c8474471d': {
        shareId: '19hinkk9lfm6zracv1k0pqsj',
        appId: '6818d590adf5217c8474471d'
      },
      '6818d4b1adf5217c8474415b': {
        shareId: '7amk87r93mb3eam5sirtr1th',
        appId: '6818d4b1adf5217c8474415b'
      },
      '6818d51aadf5217c84744494': {
        shareId: 'b2s5azttlehawgrjdf8d53bm',
        appId: '6818d51aadf5217c84744494'
      },
      '6818d586adf5217c84744643': {
        shareId: 'nwfali1jr6uxv2n5wj92oqlt',
        appId: '6818d586adf5217c84744643'
      }
    };

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_CONFIG.API_BASE_URL}/api/support/outLink/list?appId=${appId}&type=share`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_CONFIG.FASTGPT_API_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API response error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as ShareIdApiResponse;
      console.log('ShareId API response:', data);

      if (data.code === 200 && Array.isArray(data.data) && data.data.length > 0) {
        const shareId = data.data[0].shareId;
        if (shareId) {
          // 保存数据到本地存储
          await saveEmployeeToLocalStorage(employee, data, shareId, appId);

          // 重定向到分享页面
          window.location.href = `${API_CONFIG.API_BASE_URL}/chat/share?shareId=${shareId}`;
          return;
        }
      }
      throw new Error('No valid shareId found in response');
    } catch (error) {
      console.error('Error fetching shareId:', error);

      // 如果存在此appId的回退数据，则使用它
      if (fallbackData[appId]) {
        const fallbackShareId = fallbackData[appId].shareId;
        console.log(`Using fallback shareId for appId ${appId}: ${fallbackShareId}`);

        // 创建类似API响应的模拟数据结构
        const mockData = {
          code: 200,
          data: [
            {
              shareId: fallbackShareId,
              appId: appId
            }
          ]
        };

        // 保存数据到本地存储
        await saveEmployeeToLocalStorage(employee, mockData, fallbackShareId, appId);

        // 重定向到分享页面
        window.location.href = `${API_CONFIG.API_BASE_URL}/chat/share?shareId=${fallbackShareId}`;
        return;
      }

      // 如果没有可用的回退，显示错误消息
      setHireMessage(
        `Task assignment error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setTimeout(() => setHireMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理雇佣操作
  const handleHire = (employee: Employee) => {
    // 检查员工是否有原始appId
    const originalId = employee.originalId;
    if (!originalId) {
      setHireMessage(`Unable to assign tasks to ${employee.name}: No valid application ID`);
      setTimeout(() => setHireMessage(''), 3000);
      return;
    }

    // 显示临时消息
    setHireMessage(`Assigning tasks to ${employee.name}...`);

    // 获取shareId并重定向
    fetchShareIdAndRedirect(originalId, employee);
  };
  
  // 热门搜索词
  const popularSearches = ['Developer', 'Design', 'Python', 'Product', 'DevOps'];
  
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <Header />
      
      <main className="flex-grow p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Employee Hiring</h1>
            <div className="flex items-center gap-3">
              {hireMessage && (
                <div className="px-4 py-2 bg-[#333333] text-white rounded-md transition-all duration-300 flex items-center gap-2">
                  <span className="w-4 h-4">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                    </svg>
                  </span>
                  <span>{hireMessage}</span>
                </div>
              )}
              <Link to={returnUrl} className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-full transition-colors duration-300 flex items-center gap-2 border border-[#2c2c2c]">
                <span className="w-4 h-4">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                  </svg>
                </span>
                <span>Back</span>
              </Link>
            </div>
          </div>
          
          {/* 搜索区域 */}
          <div className="mb-8 bg-[#1a1a1a] rounded-[36px] p-6">
            <div className="mb-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-normal text-white mb-3">Search</h2>
              </div>
              
              {/* 搜索表单 */}
              <Form method="get" className="mb-4" onSubmit={handleSubmit}>
                <div className="flex items-center justify-between">
                  {/* 左侧：搜索输入和筛选器 */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex flex-1">
                      <input
                        type="text"
                        name="q"
                        placeholder="Search positions or keywords..."
                        className="flex-1 px-5 py-2.5 rounded-l-full bg-[#1a1a1a] border border-[#2c2c2c] text-white focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2c2c2c] border-l-0 rounded-r-full text-white font-normal flex items-center gap-2"
                      >
                        <span>All Categories</span>
                        <span className="relative inline-block w-2.5 h-2.5 ml-1">
                          <span className="absolute top-0 left-0 w-1.5 h-1.5 border-b border-r border-[#7c7c7c] transform rotate-45"></span>
                        </span>
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2c2c2c] rounded-full text-white font-normal flex items-center gap-2"
                    >
                      <span className="w-4 h-4">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#7c7c7c"/>
                        </svg>
                      </span>
                      <span>All Locations</span>
                      <span className="relative inline-block w-2.5 h-2.5 ml-1">
                        <span className="absolute top-0 left-0 w-1.5 h-1.5 border-b border-r border-[#7c7c7c] transform rotate-45"></span>
                      </span>
                    </button>
                    
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2c2c2c] rounded-full text-white font-normal"
                    >
                      Search
                    </button>
                  </div>
                  
                  {/* 右侧：克隆AI按钮 */}
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-[#2a2a2a] border border-[#2c2c2c] rounded-full text-white font-normal flex items-center gap-2 ml-3"
                  >
                    <span className="w-4 h-4">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                      </svg>
                    </span>
                    <span>Clone AI</span>
                  </button>
                </div>
              </Form>
              
              {/* 过滤行 */}
              <div className="flex justify-between items-start mt-5">
                {/* 左侧：过滤按钮 */}
                <div className="flex gap-3 flex-wrap flex-1">
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#2c2c2c] rounded-full text-white font-normal flex items-center gap-2"
                  >
                    <span className="w-4 h-4">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 17h18v2H3v-2zm0-7h18v2H3v-2zm0-7h18v2H3V3z" fill="#7c7c7c"/>
                      </svg>
                    </span>
                    <span>All Filters</span>
                    <span className="relative inline-block w-2.5 h-2.5 ml-1">
                      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-b border-r border-[#7c7c7c] transform rotate-45"></span>
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#2c2c2c] rounded-full text-white font-normal flex items-center gap-2"
                  >
                    <span>Job Type</span>
                    <span className="relative inline-block w-2.5 h-2.5 ml-1">
                      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-b border-r border-[#7c7c7c] transform rotate-45"></span>
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#2c2c2c] rounded-full text-white font-normal flex items-center gap-2"
                  >
                    <span>Contract Type</span>
                    <span className="relative inline-block w-2.5 h-2.5 ml-1">
                      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-b border-r border-[#7c7c7c] transform rotate-45"></span>
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#2c2c2c] rounded-full text-white font-normal flex items-center gap-2"
                  >
                    <span>Salary Range</span>
                    <span className="relative inline-block w-2.5 h-2.5 ml-1">
                      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-b border-r border-[#7c7c7c] transform rotate-45"></span>
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#2c2c2c] rounded-full text-white font-normal flex items-center gap-2"
                  >
                    <span>Published Date</span>
                    <span className="relative inline-block w-2.5 h-2.5 ml-1">
                      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-b border-r border-[#7c7c7c] transform rotate-45"></span>
                    </span>
                  </button>
                </div>
                
                {/* 右侧：创建AI劳动力按钮 */}
                <button
                  type="button"
                  className="px-4 py-2 bg-[#2a2a2a] border border-[#2c2c2c] rounded-full text-white font-normal flex items-center gap-2"
                >
                  <span className="w-4 h-4">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zM7.83 14c.37 0 .67.26.74.62.41 2.22 2.28 2.98 3.64 2.87.43-.03.83.33.83.75 0 .4-.32.73-.72.75-2.13.13-4.62-1.09-5.19-4.12a.75.75 0 01.7-.87z" fill="#7c7c7c"/>
                    </svg>
                  </span>
                  <span>Create AI Workforce</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* 内容区域 */}
          <div>
            <h4 className="text-sm font-normal text-white ml-6 mb-4">
              Search Results
            </h4>
            
            {isLoading ? (
              // 加载状态显示
              <div className="flex justify-center items-center h-[300px] flex-col">
                <div className="w-10 h-10 rounded-full border-3 border-[rgba(255,255,255,0.2)] border-t-white animate-spin mb-4"></div>
                <div className="text-[#7c7c7c] text-sm">
                  Loading employee data...
                </div>
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : searchQuery ? (
              <div>
                {employees.length > 0 ? (
                  <>
                    <div className="mb-6 flex flex-wrap gap-2">
                      <span className="text-[#7c7c7c] text-sm">Popular searches:</span>
                      {popularSearches.map((term) => (
                        <button 
                          key={term}
                          onClick={() => {
                            setSearchTerm(term);
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set('q', term);
                            setSearchParams(newParams);
                          }}
                          className="px-2 py-1 text-xs rounded-full bg-[#2a2a2a] text-[#cccccc] hover:bg-[#333333] cursor-pointer"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                    <SearchResultsList employees={employees} onHire={handleHire} />
                  </>
                ) : (
                  <div className="text-center py-12 bg-[#1a1a1a] rounded-lg">
                    <p className="text-white text-lg">No matching employees found</p>
                    <p className="text-[#7c7c7c] mt-2">Try using different search keywords</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex flex-col space-y-4 w-full">
                  {employees.map(employee => (
                    <EmployeeCard key={employee.id} employee={employee} onHire={handleHire} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="py-4 px-6 bg-[#1a1a1a] border-t border-[#2c2c2c]">
        <div className="max-w-7xl mx-auto text-center text-sm text-[#7c7c7c]">
          &copy; {new Date().getFullYear()} Ominieye HR System - Employee Hiring Platform
        </div>
      </footer>
    </div>
  );
}