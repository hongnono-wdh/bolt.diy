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
    },
    {
      id: 7,
      name: 'DevOps Engineer',
      description: 'Responsible for infrastructure automation, CI/CD pipeline implementation, and ensuring reliable system operation. Proficient in cloud technologies, containerization, and monitoring tools.',
      created_at: '2025-05-02T08:20:00Z',
      updated_at: '2025-05-08T10:15:00Z',
      appId: '6818d5d9adf5217c84744912'
    },
    {
      id: 8,
      name: 'UX Researcher',
      description: 'Conducts user research to inform product design decisions. Specializes in usability testing, user interviews, and translating research findings into actionable insights for design teams.',
      created_at: '2025-05-01T14:30:00Z',
      updated_at: '2025-05-07T09:45:00Z',
      appId: '6818d5f1adf5217c84745021'
    },
    {
      id: 9,
      name: 'Project Manager',
      description: 'Oversees project planning, execution, and delivery. Skilled at resource allocation, risk management, and stakeholder communication to ensure successful project completion on time and within budget.',
      created_at: '2025-05-03T11:25:00Z',
      updated_at: '2025-05-06T13:50:00Z',
      appId: '6818d602adf5217c84745142'
    },
    {
      id: 10,
      name: 'QA Engineer',
      description: 'Ensures software quality through comprehensive testing methodologies. Experienced in creating test plans, automated testing, and identifying bugs before product release.',
      created_at: '2025-05-04T09:10:00Z',
      updated_at: '2025-05-07T16:30:00Z',
      appId: '6818d618adf5217c84745234'
    },
    {
      id: 11,
      name: 'Mobile Developer',
      description: 'Specialized in developing applications for iOS and Android platforms. Proficient in Swift, Kotlin, and cross-platform frameworks like React Native and Flutter.',
      created_at: '2025-05-02T16:45:00Z',
      updated_at: '2025-05-08T11:20:00Z',
      appId: '6818d62eadf5217c84745389'
    },
    {
      id: 12,
      name: 'Cloud Architect',
      description: 'Designs and implements cloud-based solutions with expertise in AWS, Azure, and Google Cloud Platform. Focuses on scalable, secure, and cost-effective cloud infrastructure.',
      created_at: '2025-05-01T12:35:00Z',
      updated_at: '2025-05-06T10:55:00Z',
      appId: '6818d645adf5217c84745476'
    },
    {
      id: 13,
      name: 'Security Specialist',
      description: 'Protects systems and data from cyber threats through security assessments, vulnerability testing, and implementation of security measures. Expert in both offensive and defensive security practices.',
      created_at: '2025-05-03T13:15:00Z',
      updated_at: '2025-05-07T11:40:00Z',
      appId: '6818d65badf5217c84745563'
    },
    {
      id: 14,
      name: 'Content Writer',
      description: 'Creates engaging and informative content for various platforms. Skilled in SEO writing, technical documentation, and marketing copy that drives user engagement.',
      created_at: '2025-05-04T10:50:00Z',
      updated_at: '2025-05-08T09:25:00Z',
      appId: '6818d672adf5217c84745651'
    },
    {
      id: 15,
      name: 'Marketing Specialist',
      description: 'Develops and executes marketing strategies to increase brand awareness and user acquisition. Experienced in digital marketing, social media campaigns, and conversion optimization.',
      created_at: '2025-05-02T15:05:00Z',
      updated_at: '2025-05-07T14:30:00Z',
      appId: '6818d689adf5217c84745748'
    },
    {
      id: 16,
      name: 'HR Manager',
      description: 'Manages human resources functions including recruitment, employee relations, and organizational development. Ensures compliance with labor laws and creates positive workplace culture.',
      created_at: '2025-05-01T11:00:00Z',
      updated_at: '2025-05-06T15:15:00Z',
      appId: '6818d6a1adf5217c84745835'
    },
    {
      id: 17,
      name: 'Systems Analyst',
      description: 'Analyzes business requirements and designs IT systems to meet organizational needs. Bridges the gap between business and technical teams to ensure solutions address core business challenges.',
      created_at: '2025-05-03T08:40:00Z',
      updated_at: '2025-05-08T12:10:00Z',
      appId: '6818d6b7adf5217c84745927'
    },
    {
      id: 18,
      name: 'Database Administrator',
      description: 'Manages database systems ensuring data integrity, security, and optimal performance. Expert in SQL, database design, and data recovery procedures across multiple database platforms.',
      created_at: '2025-05-04T14:25:00Z',
      updated_at: '2025-05-07T10:00:00Z',
      appId: '6818d6ceadf5217c84746018'
    },
    {
      id: 19,
      name: 'Network Engineer',
      description: 'Designs and implements network infrastructure for reliable and secure connectivity. Specialist in routing, switching, network security, and troubleshooting complex network issues.',
      created_at: '2025-05-02T09:55:00Z',
      updated_at: '2025-05-06T17:30:00Z',
      appId: '6818d6e4adf5217c84746109'
    },
    {
      id: 20,
      name: 'Machine Learning Engineer',
      description: 'Develops AI and machine learning models to solve complex business problems. Proficient in data science, algorithm design, and implementing machine learning systems in production environments.',
      created_at: '2025-05-01T16:15:00Z',
      updated_at: '2025-05-08T13:45:00Z',
      appId: '6818d6fadf5217c84746198'
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

// 团队卡片组件 - 新设计风格
interface TeamMember {
  name: string;
  position: string;
  avatar?: string;
}

interface Team {
  id: number;
  name: string;
  members: TeamMember[];
  description: string;
  hiringPrice: number;
  originalId?: string;
}

function TeamCard({ team, onHire }: { team: Team; onHire: (team: Team) => void }) {
  const { isLoading, setIsLoading } = useLoading();

  // 开发者图标
  const DeveloperIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="#7c7c7c" />
    </svg>
  );

  // 存钱罐图标
  const SavingIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.83 7.5l-2.27-2.27c.07-.42.18-.81.32-1.15.1-.25.18-.48.25-.71-1.96.23-3.51 1.34-4.01 2.04l-4.59.14C8.53 4.38 7.29 3.59 4.97 3.5c.07.23.15.46.24.7.81 1.69 2.34 2.8 4.01 3.01l.77 1.93c-3.21.81-5.49 3.7-5.49 7.05 0 .47.04.93.13 1.37.32 1.55 1.14 2.9 2.27 3.94v-2.5h1.97c1.19 0 2.3-.35 3.26-.96-.51-.76-.8-1.65-.8-2.54 0-1.33.57-2.64 1.59-3.61 1.02-.97 2.36-1.47 3.77-1.39 1.43.08 2.86.86 3.91 2.15 1.05 1.29 1.49 2.89 1.23 4.36-.12.68-.4 1.31-.83 1.82l.27.28c1.02-.97 1.77-2.19 2.13-3.58.37-1.39.19-2.92-.4-4.26L22 7.37c-.4-.34-.89-.57-1.4-.68l-.54-.08-.23-.47zM7.5 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#7c7c7c" />
    </svg>
  );

  // 团队图标
  const TeamIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#7c7c7c" />
    </svg>
  );

  const handleHireWithLoading = async (team: Team) => {
    setIsLoading(true);
    try {
      await onHire(team);
    } finally {
      // 如果onHire函数在重定向前返回，确保3秒后重置加载状态
      setTimeout(() => setIsLoading(false), 3000);
    }
  };

  // 生成团队成员头像
  const renderTeamMemberAvatar = (member: TeamMember, index: number) => {
    // 使用成员索引来选择不同的头像图片，确保在0-249范围内
    const avatarIndex = index % 250;
    return (
      <div className="w-[40px] h-[40px] rounded-full overflow-hidden flex-shrink-0">
        <img 
          src={`/assets/images/avatar/${avatarIndex}.png`} 
          alt={`${member.name}的头像`} 
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  // 右箭头图标
  const RightArrowIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="#7c7c7c" />
    </svg>
  );

  return (
    <div className="bg-[#1a1a1a] rounded-[20px] shadow-lg  relative overflow-hidden">
      {/* 团队指示器 (右上角) */}
      <div className="absolute top-[15px] right-[15px] z-10">
        <div className="px-4 py-2 rounded-full bg-[rgba(255,255,255,0.1)]  flex items-center">
          <TeamIcon />
          <span className="text-xs text-white ml-1">Team</span>
        </div>
      </div>

      {/* 团队名称和基本信息 */}
      <div className="px-6 pt-4 pb-2">
        <h2 className="text-white text-lg font-bold mb-1">{team.name}</h2>
      
      </div>

      {/* 水平滚动区域 - 成员卡片 (上方显示) */}
      <div className="px-6 pb-1 pt-2">
        {/* <h3 className="text-white text-sm font-medium mb-3 flex items-center">
          <span>Team Members ({team.members.length})</span>
        </h3> */}
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex space-x-4 min-w-max pb-2"> {/* 水平排列的成员卡片区 */}
            {team.members.map((member, index) => (
              <div
                key={index}
                className="flex-shrink-0 bg-[#252525] rounded-lg p-3 cursor-pointer hover:bg-[#303030] transition-colors w-[220px]"
                onClick={() => alert(`Selected team member: ${member.name}`)}
              >
                <div className="flex items-center m-2">
                  {renderTeamMemberAvatar(member, index)}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{member.name}</div>
                    <div className="text-[#888] text-xs truncate">{member.position}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 团队简介 (下方显示) */}
      <div className="px-6 py-3 ">
        <h3 className="text-white text-sm font-medium mb-1 flex items-center">
          <TeamIcon />
          <span className="ml-2">Team Overview</span>
        </h3>
        <p className="text-[#7c7c7c] text-xs leading-5">{team.description}</p>
      </div>

      {/* 下部悬浮操作区域 */}
      <div className="flex justify-between items-center px-4 py-3 bg-[#262626]">
        <div className="text-[#7c7c7c] flex items-center text-xs">
          <SavingIcon />
          <span className="ml-2">free</span>
        </div>

        <button
          onClick={() => handleHireWithLoading(team)}
          disabled={isLoading}
          className="
            px-6 py-2 bg-white hover:bg-gray-100 text-[#333333] text-[14px] rounded-full 
            flex items-center justify-center transition-all 
            disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
            font-bold
          "
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              <span>Hiring...</span>
            </>
          ) : (
            <span>Hire Team</span>
          )}
        </button>
      </div>
    </div>
  );
}

// 加载中组件
function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="text-[#888] text-lg">Loading...</div>
    </div>
  );
}

// 隐藏滚动条的样式
const globalStyles = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`;

// 全局样式组件
function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: globalStyles }} />;
}

// 将Employee转换为Team的工具函数
function convertEmployeesToTeam(employees: Employee[]): Team[] {
  // 将员工分组成团队，每3-5个员工一组以创建更多团队
  const teams: Team[] = [];
  
  // 团队名称列表
  const teamNames = [
    'Alpha Team', 'Beta Team', 'Omega Squad', 'Phoenix Group', 
    'Quantum Tech', 'Titan Collective', 'Horizon Innovators', 'Apex Solutions',
    'Nebula Developers', 'Fusion Alliance', 'Zenith Creators', 'Pulse Team',
    'Vertex Engineers', 'Pinnacle Experts', 'Catalyst Group', 'Echo Team',
    'Gamma Force', 'Delta Squad', 'Sigma Innovations', 'Lambda Engineering',
    'Maxima Group', 'Epsilon Experts', 'Theta Elite', 'Rho Technologies'
  ];
  
  // 创建固定团队 - 直接从员工池中选择特定成员组合
  const createFixedTeams = () => {
    // 团队1: 开发团队 - 选择所有前端和后端开发人员
    const devTeam = employees.filter(emp => 
      emp.position.toLowerCase().includes('developer') || 
      emp.position.toLowerCase().includes('engineer')
    ).slice(0, 5);
    
    if (devTeam.length >= 3) {
      teams.push(createTeam(devTeam, 'Elite Dev Team', 'R&D'));
    }
    
    // 团队2: 设计团队 - 选择所有设计相关人员
    const designTeam = employees.filter(emp => 
      emp.position.toLowerCase().includes('design') || 
      emp.position.toLowerCase().includes('ui') || 
      emp.position.toLowerCase().includes('ux')
    ).slice(0, 5);
    
    if (designTeam.length >= 3) {
      teams.push(createTeam(designTeam, 'Creative Studio', 'Design'));
    }
    
    // 团队3: 数据团队 - 选择数据相关人员
    const dataTeam = employees.filter(emp => 
      emp.position.toLowerCase().includes('data') || 
      emp.position.toLowerCase().includes('analyst') || 
      emp.position.toLowerCase().includes('machine')
    ).slice(0, 5);
    
    if (dataTeam.length >= 3) {
      teams.push(createTeam(dataTeam, 'Data Insights', 'Analytics'));
    }
    
    // 团队4: 全栈团队 - 选择前端、后端和产品经理
    const fullStackTeam = [
      ...employees.filter(emp => emp.position.toLowerCase().includes('frontend')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('backend')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('product')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('qa')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('devops')).slice(0, 1)
    ];
    
    if (fullStackTeam.length >= 3) {
      teams.push(createTeam(fullStackTeam, 'Full-Stack Squad', 'Cross-Functional'));
    }
  };
  
  // 创建团队对象的帮助函数
  const createTeam = (teamEmployees: Employee[], teamNamePrefix: string, departmentType: string) => {
    // 创建团队成员数组
    const members: TeamMember[] = teamEmployees.map(emp => ({
      name: emp.name,
      position: emp.position,
      avatar: emp.avatar
    }));
    
    // 生成团队描述
    let keyPositions = teamEmployees.slice(0, 3).map(e => e.position).join(', ');
    if (teamEmployees.length > 3) {
      keyPositions += `, and ${teamEmployees.length - 3} more positions`;
    }
    
    const description = `A specialized ${departmentType} team with expertise in ${keyPositions}. This team excels in delivering high-quality solutions through collaborative efforts and innovative approaches.`;
    
    return {
      id: teamEmployees[0].id,
      name: `${teamNamePrefix}`,
      members,
      description,
      hiringPrice: Math.round(teamEmployees.reduce((sum, emp) => sum + emp.hiringPrice, 0) / teamEmployees.length),
      originalId: teamEmployees[0].originalId
    };
  };
  
  // 首先创建固定团队
  createFixedTeams();
  
  // 然后将其余员工分组
  // 每4个员工分组
  const usedEmployeeIds = new Set(teams.flatMap(team => team.members.map(m => m.name)));
  const remainingEmployees = employees.filter(emp => !usedEmployeeIds.has(emp.name));
  
  for (let i = 0; i < remainingEmployees.length; i += 4) {
    // 取出当前团队成员（最多4个）
    const teamEmployees = remainingEmployees.slice(i, i + 4);
    
    // 如果团队成员少于3个，跳过不创建团队
    if (teamEmployees.length < 3) continue;
    
    // 使用主要部门作为团队类型
    const departments = teamEmployees.map(emp => emp.department);
    const departmentCounts: Record<string, number> = {};
    departments.forEach(dept => {
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    // 找出出现次数最多的部门
    let mainDepartment = 'Cross-functional';
    let maxCount = 0;
    for (const [dept, count] of Object.entries(departmentCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mainDepartment = dept;
      }
    }
    
    // 生成团队名字
    const teamNameIndex = Math.min(Math.floor(i / 4) + teams.length, teamNames.length - 1);
    const teamName = `${teamNames[teamNameIndex]} (${mainDepartment})`;
    
    teams.push(createTeam(teamEmployees, teamName, mainDepartment));
  }
  
  // 对团队进行混合和拆分，生成更多团队
  // 切分大型团队成小型团队
  const splitTeams = () => {
    const teamsToSplit = teams.filter(team => team.members.length >= 5);
    
    for (const team of teamsToSplit) {
      // 将团队成员划分为两组
      if (team.members.length >= 5) {
        const originalEmployees = employees.filter(emp => 
          team.members.some(member => member.name === emp.name));
        
        const firstHalf = originalEmployees.slice(0, Math.ceil(originalEmployees.length / 2));
        const secondHalf = originalEmployees.slice(Math.ceil(originalEmployees.length / 2));
        
        if (firstHalf.length >= 3 && secondHalf.length >= 3) {
          // 从原团队中移除
          const teamIndex = teams.findIndex(t => t.name === team.name);
          if (teamIndex !== -1) {
            teams.splice(teamIndex, 1);
          }
          
          // 创建两支新团队
          const department = team.name.slice(team.name.indexOf('(') + 1, team.name.indexOf(')'));
          const baseTeamName = team.name.slice(0, team.name.indexOf('(') - 1);
          
          teams.push(createTeam(
            firstHalf, 
            `${baseTeamName} Alpha (${department})`, 
            department
          ));
          
          teams.push(createTeam(
            secondHalf, 
            `${baseTeamName} Omega (${department})`, 
            department
          ));
        }
      }
    }
  };
  
  // 执行团队拆分
  splitTeams();
  
  // 根据特殊角色创建额外团队
  const createSpecialTeams = () => {
    // 创建一个顶级专家团队，选择不同部门的高级人才
    const expertTeam = [
      ...employees.filter(emp => emp.position.toLowerCase().includes('architect')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('security')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('machine learning')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('senior')).slice(0, 1)
    ];
    
    if (expertTeam.length >= 3) {
      teams.push(createTeam(expertTeam, 'Elite Experts (Consulting)', 'Consulting'));
    }
    
    // 创建创新团队
    const innovationTeam = [
      ...employees.filter(emp => emp.position.toLowerCase().includes('research')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('design')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('product')).slice(0, 1),
      ...employees.filter(emp => emp.position.toLowerCase().includes('content')).slice(0, 1)
    ];
    
    if (innovationTeam.length >= 3) {
      teams.push(createTeam(innovationTeam, 'Innovation Lab (Research)', 'Research'));
    }
  };
  
  // 创建特殊团队
  createSpecialTeams();
  
  // 多样性处理：对团队进行排序和不同价格处理
  teams.forEach((team, index) => {
    // 给不同团队设置不同价格
    // 让专业团队价格更高
    if (team.name.includes('Elite') || team.name.includes('Expert')) {
      team.hiringPrice = Math.round(team.hiringPrice * 1.35); // 专家团队涉及35%溢价
    } else if (team.name.includes('Innovation') || team.name.includes('Creative')) {
      team.hiringPrice = Math.round(team.hiringPrice * 1.2); // 创新团队涉及20%溢价
    }
    
    // 确保所有团队价格都是整数
    team.hiringPrice = Math.round(team.hiringPrice);
  });
  
  return teams;
}

// 搜索结果列表组件 - 使用新的黑色UI风格设计
function SearchResultsList({ employees, onHire }: { employees: Employee[]; onHire: (employee: Employee) => void }) {
  // 将Employee转换为Team
  const teams = convertEmployeesToTeam(employees);
  
  // 封装onHire函数以兼容现有通过传入employee的函数
  const handleTeamHire = (team: Team) => {
    // 找到团队对应的第一个员工并雇佣
    const employeeToHire = employees.find(emp => emp.id === team.id);
    if (employeeToHire) {
      onHire(employeeToHire);
    }
  };
  
  return (
    <div className="flex flex-col space-y-10">
      {teams.map((team) => (
        <div key={team.id}>
          <TeamCard key={team.id} team={team} onHire={handleTeamHire} />
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
  
  // 热门搜索词
  const popularSearches = ['Developer', 'Design', 'Python', 'Product', 'DevOps'];
  
  // 处理搜索提交
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!searchTerm.trim()) {
      // 如果搜索框为空，清除搜索参数
      searchParams.delete('q');
      setSearchParams(searchParams);
    }
  };
  
  // 处理雇佣操作
  const handleHire = (employee: Employee) => {
    // 这里简化了雇佣逻辑，实际应用中会有更复杂的处理
    console.log(`雇佣员工: ${employee.name}`);
    setHireMessage(`正在分配任务给 ${employee.name}...`);
    setTimeout(() => {
      setHireMessage(`成功雇佣了 ${employee.name}!`);
      setTimeout(() => setHireMessage(''), 3000);
    }, 1500);
  };
  
  // 位置图标
  const LocationIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#7c7c7c"/>
    </svg>
  );

  // 机器学习图标
  const MachineLearningIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zM12 20c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z" fill="#7c7c7c"/>
    </svg>
  );

  // 下拉箭头
  const DropdownArrow = () => (
    <span className="relative inline-block w-[10px] h-[10px] ml-[5px]">
      <span className="absolute top-0 left-0 w-[6px] h-[6px] border-b border-r border-[#7c7c7c] transform rotate-45"></span>
    </span>
  );

  // 水平滑块图标
  const SliderIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17h18v2H3v-2zm0-7h18v2H3v-2zm0-7h18v2H3V3z" fill="#7c7c7c"/>
    </svg>
  );

  // 机器人图标
  const HumanoidIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2c-4.42 0-8 3.58-8 8 0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 20 10c0-4.42-3.58-8-8-8z" fill="#7c7c7c"/>
    </svg>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <GlobalStyles />
      <Header />
      
      <main className="flex-grow p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl  text-white">Team Hiring</h1>
            <div className="flex items-center gap-3">
              {hireMessage && (
                <div className="px-4 py-2 bg-[#333333] text-white rounded-md transition-all duration-300 flex items-center gap-2">
                  <span>{hireMessage}</span>
                </div>
              )}
              <Link to={returnUrl} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-white text-[14px] rounded-full transition-colors duration-300 flex items-center gap-2 border border-[#2c2c2c]">
                <span>Back</span>
              </Link>
            </div>
          </div>

          {/* 搜索区域 */}
          <div className="mb-10 bg-[#1a1a1a] rounded-[36px] py-4 px-7">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-normal text-white mb-3">Search</h2>
            </div>

            {/* 搜索表单 */}
            <div className="mb-2">
              <div className="flex justify-between items-center">
                {/* 左侧：搜索输入和过滤器 */}
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center flex-1">
                    {/* 搜索输入框 */}
                    <input
                      type="text"
                      placeholder="Search job title or keyword"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 bg-[#1a1a1a] border border-[#2c2c2c] text-white text-[14px] px-5 h-[40px] rounded-l-full outline-none focus:outline-none box-border w-[400px]"
                    />

                    {/* 过滤按钮连接到输入框 */}
                    <button
                      type="button"
                      onClick={() => {
                        // 过滤动作
                      }}
                      className="bg-[#1a1a1a] border border-[#2c2c2c] border-l-0 px-4 h-[40px] text-white text-[14px] rounded-r-full font-normal flex items-center justify-center gap-2 box-border"
                    >
                      <span>All Categories</span>
                      <DropdownArrow />
                    </button>
                  </div>

                  {/* 所有位置按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      // 位置过滤动作
                    }}
                    className="bg-[#1a1a1a] border border-[#2c2c2c] px-4 h-[40px] text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2 box-border"
                  >
                    <LocationIcon />
                    <span>All Locations</span>
                    <DropdownArrow />
                  </button>

                  {/* 搜索按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      // 搜索动作
                      const newParams = new URLSearchParams();
                      if (searchTerm) {
                        newParams.set('q', searchTerm);
                      }
                      setSearchParams(newParams);
                    }}
                    className="bg-[#1a1a1a] border border-[#2c2c2c] px-4 py-2 text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2"
                  >
                    <span>Search</span>
                  </button>
                </div>

                {/* 右侧：Clone AI按钮 */}
                <button
                  type="button"
                  onClick={() => {
                    // Clone AI按钮动作
                  }}
                  className="bg-[#2a2a2a] border border-[#2c2c2c] px-4 h-[40px] text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2 ml-3"
                >
                  <MachineLearningIcon />
                  <span>Clone AI</span>
                </button>
              </div>

              {/* 过滤行与AI劳动力按钮 */}
              <div className="mt-5 flex justify-between items-start">
                {/* 左侧：过滤按钮 */}
                <div className="flex gap-3 flex-wrap flex-1">
                  {/* 所有过滤器按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      // 所有过滤器下拉动作
                    }}
                    className="bg-[#2a2a2a] border border-[#2c2c2c] px-4 py-2 text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2"
                  >
                    <SliderIcon />
                    <span>All filters</span>
                    <DropdownArrow />
                  </button>

                  {/* 工作类型按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      // 工作类型下拉动作
                    }}
                    className="bg-[#2a2a2a] border border-[#2c2c2c] px-4 py-2 text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2"
                  >
                    <span>Work type</span>
                    <DropdownArrow />
                  </button>

                  {/* 合同类型按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      // 合同类型下拉动作
                    }}
                    className="bg-[#2a2a2a] border border-[#2c2c2c] px-4 py-2 text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2"
                  >
                    <span>Contract type</span>
                    <DropdownArrow />
                  </button>

                  {/* 财务区间按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      // 财务区间下拉动作
                    }}
                    className="bg-[#2a2a2a] border border-[#2c2c2c] px-4 py-2 text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2"
                  >
                    <span>Pay range</span>
                    <DropdownArrow />
                  </button>

                  {/* 发布于按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      // 发布于下拉动作
                    }}
                    className="bg-[#2a2a2a] border border-[#2c2c2c] px-4 py-2 text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2"
                  >
                    <span>Posted within</span>
                    <DropdownArrow />
                  </button>
                </div>

                {/* 右侧：创建AI劳动力按钮 */}
                <button
                  type="button"
                  onClick={() => {
                    // 创建AI劳动力按钮动作
                  }}
                  className="bg-[#2a2a2a] border border-[#2c2c2c] px-4 py-2 text-white text-[14px] rounded-full font-normal flex items-center justify-center gap-2 h-[40px]"
                >
                  <HumanoidIcon />
                  <span>Creating an AI Workforce</span>
                </button>
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div>
            <h4 className="text-sm font-normal text-white mb-4 ml-6">Search Results</h4>
            {isLoading ? (
              <Loading />
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
                          className="px-2 py-1 text-[14px] rounded-full bg-[#2a2a2a] text-[#cccccc] hover:bg-[#333333] cursor-pointer"
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
                <div className="flex flex-col space-y-10 w-full">
                  {convertEmployeesToTeam(employees).map(team => (
                    <TeamCard 
                      key={team.id} 
                      team={team} 
                      onHire={(team) => {
                        // 找到团队对应的第一个员工并雇佣
                        const employeeToHire = employees.find(emp => emp.id === team.id);
                        if (employeeToHire) {
                          handleHire(employeeToHire);
                        }
                      }}
                    />
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