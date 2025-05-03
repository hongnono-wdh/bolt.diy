import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData, useSearchParams, Form, Link } from '@remix-run/react';
import { Header } from '~/components/header/Header';
import { useState, useEffect } from 'react';

// Employee type interface definition
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
}

// 接口类型定义，用于匹配本地API返回的数据
interface RoleApiResponse {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// 生成随机技能的函数
const generateRandomSkills = (role: string): string[] => {
  // 根据角色名称生成合适的技能
  const skillsMap: {[key: string]: string[]} = {
    '产品经理': ['PRD编写', 'Axure', '数据分析', '需求管理', '敏捷方法', '用户调研'],
    '前端开发工程师': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular', 'TypeScript', 'Webpack'],
    '后端开发工程师': ['Java', 'Python', 'Node.js', 'Go', 'C++', 'SQL', 'MongoDB', 'Redis'],
    '律师': ['合同审核', '法律咨询', '知识产权', '商业谈判', '法律文书'],
  };
  
  // 默认技能
  const defaultSkills = ['沟通能力', '团队协作', '问题解决', '文档编写'];
  
  // 获取角色对应的技能，如果没有预定义则使用默认技能
  const roleSkills = skillsMap[role] || defaultSkills;
  
  // 随机选择3-5个技能
  const skillCount = Math.floor(Math.random() * 3) + 3; // 3-5个技能
  const shuffled = [...roleSkills].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, skillCount);
};

// 生成随机部门的函数
const getDepartmentFromRole = (role: string): string => {
  if (role.includes('前端') || role.includes('后端')) return 'R&D';
  if (role.includes('产品')) return '产品部';
  if (role.includes('律师')) return '法务部';
  if (role.includes('设计')) return '设计部';
  return '其他部门';
};

// 从API获取角色数据并转换为员工数据
const fetchEmployeesData = async (): Promise<Employee[]> => {
  console.log('开始获取角色数据，请求URL: http://localhost:3001/api/roles');
  try {
    // 从本地API获取角色数据
    console.log('发起API请求...', new Date().toLocaleTimeString());
    const response = await fetch('http://localhost:3001/api/roles');
    console.log('收到响应，状态码:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorMsg = `API响应错误: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('解析响应JSON数据...');
    const rolesData: RoleApiResponse[] = await response.json();
    
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
        location: '上海',
        toolUtilization: randomUtilization
      };
    });
  } catch (error) {
    console.error('获取员工数据失败:', error);
    // 如果API请求失败，返回默认员工数据
    return [
      {
        id: 1,
        name: '产品经理',
        position: '产品经理',
        department: '产品部',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
        skills: ['PRD编写', 'Axure', '数据分析'],
        experience: 3,
        age: 28,
        description: '负责产品规划和需求定义的角色',
        hiringPrice: 85000,
        location: '上海',
        toolUtilization: 85
      },
      {
        id: 2,
        name: '后端开发工程师',
        position: '后端开发工程师',
        department: 'R&D',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
        skills: ['Java', 'Python', 'MongoDB', 'Spring Boot'],
        experience: 5,
        age: 32,
        description: '负责服务器端开发的角色',
        hiringPrice: 95000,
        location: '北京',
        toolUtilization: 92
      },
      {
        id: 3,
        name: '前端开发工程师',
        position: '前端开发工程师',
        department: 'R&D',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
        skills: ['React', 'Vue', 'TypeScript', 'CSS'],
        experience: 4,
        age: 30,
        description: '负责Web前端界面开发的角色',
        hiringPrice: 78000,
        location: '深圳',
        toolUtilization: 88
      },
      {
        id: 4,
        name: '律师',
        position: '律师',
        department: '法务部',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
        skills: ['合同审核', '法律咨询', '知识产权'],
        experience: 6,
        age: 35,
        description: '律师',
        hiringPrice: 110000,
        location: '广州',
        toolUtilization: 75
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

// Employee card component
// 员工卡片组件 - 现在采用水平布局以适应一行一个的设计
function EmployeeCard({ employee }: { employee: Employee }) {
  return (
    <div className="bg-bolt-elements-background-depth-2 rounded-8 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 w-full relative">
      {/* 工具使用率指示器（右上角） */}
      <div className="absolute top-6 right-8 z-10">
        <div className="px-3 py-1 rounded-full bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor flex items-center">
          <span className="i-carbon:tool-kit text-sm mr-1.5 text-bolt-colors-primary-500"></span>
          <span className="text-sm font-medium" style={{ 
            color: '#ffffff80',
            textShadow: '0 0 1px rgba(255, 255, 255, 0.1)'
          }}>
            Field:Tool Utilization
          </span>
        </div>
      </div>
      
      <div className="flex flex-col">
        {/* 上部信息区域 */}
        <div className="p-6 flex flex-col md:flex-row gap-6">
          {/* 左侧：头像和基本信息 */}
          <div className="flex items-start space-x-4 md:w-1/4">
            <img 
              src={employee.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} 
              alt={`${employee.name}'s avatar`}
              className="w-30 h-30 rounded-6 border-2 border-bolt-elements-background-depth-3"
              onError={(e) => {
                // 如果图片加载失败，使用默认头像
                const target = e.target as HTMLImageElement;
                target.onerror = null; // 防止循环错误
                // 使用静态头像或DiceBear API
                target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23ccc%22%3E%3Cpath%20d%3D%22M12%2012c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0%202c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z%22%2F%3E%3C%2Fsvg%3E';
              }}
            />
            <div>
              <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">{employee.name}</h3>
              <p className="text-bolt-elements-textSecondary">{employee.position}</p>
              <p className="text-bolt-elements-textTertiary text-sm">{employee.department}</p>
              
            </div>
          </div>
          
          {/* 中间：技能和描述 */}
          <div className="md:w-2/4">
            <p className="text-bolt-elements-textSecondary text-sm mb-3">{employee.description}</p>
            {/* 基本信息按钮组（位置、经验、年龄） */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1.5 text-sm rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor flex items-center">
                <span className="i-carbon:location mr-1.5"></span>
                {employee.location}
              </span>
              
              <span className="px-3 py-1.5 text-sm rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor flex items-center">
                <span className="i-carbon:timer mr-1.5"></span>
                {employee.experience} 年经验
              </span>
              
              <span className="px-3 py-1.5 text-sm rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor flex items-center">
                <span className="i-carbon:user mr-1.5"></span>
                {employee.age} 岁
              </span>
            </div>
            
            {/* 技能按钮组 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {employee.skills.map((skill, index) => (
                <span 
                  key={index}
                  className="px-3 py-1.5 text-sm rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-4 transition-colors duration-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          {/* 右侧区域（空出来，因为工具使用率已移到右上角） */}
          <div className="md:w-1/4"></div>
        </div>
        
        {/* 底部：雇佣价格和雇佣按钮 */}
        <div className="px-6 py-4 border-t border-bolt-elements-background-depth-3 flex justify-between items-center">
          <div className="">
            <span className="text-bolt-elements-textPrimary font-bold text-xl">${employee.hiringPrice.toLocaleString()}</span>
            <span className="text-bolt-elements-textTertiary text-xs ml-2">年薪</span>
          </div>
          
          <button className="px-8 py-2 bg-bolt-elements-interactive-primary hover:bg-bolt-elements-interactive-primary-hover text-bolt-elements-background-depth-1 rounded-md transition-colors duration-300 font-medium">
            雇佣
          </button>
        </div>
      </div>
    </div>
  );
}

// 搜索结果列表组件 - 与普通员工卡片保持一致的样式
function SearchResultsList({ employees }: { employees: Employee[] }) {
  return (
    <div className="flex flex-col space-y-4">
      {employees.map((employee) => (
        <div key={employee.id} className="bg-bolt-elements-background-depth-2 rounded-8 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 w-full relative">
          {/* 工具使用率指示器（右上角） */}
          <div className="absolute top-6 right-8 z-10">
            <div className="px-3 py-1 rounded-full bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor flex items-center">
              <span className="i-carbon:tool-kit text-sm mr-1.5 text-bolt-colors-primary-500"></span>
              <span className="text-sm font-medium" style={{ 
                color: '#ffffff80',
                textShadow: '0 0 1px rgba(255, 255, 255, 0.1)'
              }}>
                Field:Tool Utilization
              </span>
            </div>
          </div>
          
          <div className="flex flex-col">
            {/* 上部信息区域 */}
            <div className="p-6 flex flex-col md:flex-row gap-6">
              {/* 左侧：头像和基本信息 */}
              <div className="flex items-start space-x-4 md:w-1/4">
                <img 
                  src={employee.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} 
                  alt={`${employee.name}'s avatar`}
                  className="w-30 h-30 rounded-6 border-2 border-bolt-elements-background-depth-3"
                  onError={(e) => {
                    // 如果图片加载失败，使用默认头像
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // 防止循环错误
                    target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23ccc%22%3E%3Cpath%20d%3D%22M12%2012c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0%202c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z%22%2F%3E%3C%2Fsvg%3E';
                  }}
                />
                <div>
                  <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">{employee.name}</h3>
                  <p className="text-bolt-elements-textSecondary">{employee.position}</p>
                  <p className="text-bolt-elements-textTertiary text-sm">{employee.department}</p>
                </div>
              </div>
              
              {/* 中间：技能和描述 */}
              <div className="md:w-2/4">
                <p className="text-bolt-elements-textSecondary text-sm mb-3">{employee.description}</p>
                {/* 基本信息按钮组（位置、经验、年龄） */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1.5 text-sm rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor flex items-center">
                    <span className="i-carbon:location mr-1.5"></span>
                    {employee.location}
                  </span>
                  
                  <span className="px-3 py-1.5 text-sm rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor flex items-center">
                    <span className="i-carbon:timer mr-1.5"></span>
                    {employee.experience} 年经验
                  </span>
                  
                  <span className="px-3 py-1.5 text-sm rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor flex items-center">
                    <span className="i-carbon:user mr-1.5"></span>
                    {employee.age} 岁
                  </span>
                </div>
                
                {/* 技能按钮组 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {employee.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1.5 text-sm rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-4 transition-colors duration-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* 右侧区域（空出来，因为工具使用率已移到右上角） */}
              <div className="md:w-1/4"></div>
            </div>
            
            {/* 底部：雇佣价格和雇佣按钮 */}
            <div className="px-6 py-4 border-t border-bolt-elements-background-depth-3 flex justify-between items-center">
              <div className="">
                <span className="text-bolt-elements-textPrimary font-bold text-xl">${employee.hiringPrice.toLocaleString()}</span>
                <span className="text-bolt-elements-textTertiary text-xs ml-2">年薪</span>
              </div>
              
              <button className="px-8 py-2 bg-bolt-elements-interactive-primary hover:bg-bolt-elements-interactive-primary-hover text-bolt-elements-background-depth-1 rounded-md transition-colors duration-300 font-medium">
                雇佣
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main page component
export default function Hiring() {
  const { employees, searchQuery } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  
  // 获取returnUrl参数，默认为首页
  const returnUrl = searchParams.get('returnUrl') || '/';
  
  // Synchronize URL search parameters with local state
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);
  
  // Handle search submission
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!searchTerm.trim()) {
      // If search box is empty, clear search parameters
      searchParams.delete('q');
      setSearchParams(searchParams);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-bolt-elements-background-depth-1">
      <Header />
      
      <main className="flex-grow p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-bolt-elements-textPrimary">Employee Hiring</h1>
            <Link to={returnUrl} className="px-4 py-2 bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary rounded-md transition-colors duration-300 flex items-center gap-2 border border-bolt-elements-borderColor">
              <span className="i-carbon:arrow-left text-lg"></span>
              <span>Back</span>
            </Link>
          </div>
          
          {/* Search form */}
          <Form method="get" className="mb-8" onSubmit={handleSubmit}>
            <div className="flex items-center">
              <div className="relative flex-grow">
                <input
                  type="text"
                  name="q"
                  placeholder="Search by name, position, department or skills..."
                  className="w-full px-4 py-3 rounded-l-md bg-bolt-elements-background-depth-2 border border-bolt-elements-background-depth-3 text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-interactive-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-bolt-elements-interactive-primary hover:bg-bolt-elements-interactive-primary-hover text-bolt-elements-background-depth-1 rounded-r-md font-medium"
              >
                Search
              </button>
            </div>
          </Form>
          
          {/* Content area */}
          {searchQuery ? (
            <div>
              <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
                Search Results ({employees.length})
              </h2>
              
              {employees.length > 0 ? (
                <>
                  <div className="mb-6 flex flex-wrap gap-2">
                    <span className="text-bolt-elements-textSecondary text-sm">Popular searches:</span>
                    <button 
                      onClick={() => {
                        setSearchTerm('Developer');
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('q', 'Developer');
                        setSearchParams(newParams);
                      }}
                      className="px-2 py-1 text-xs rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4 cursor-pointer"
                    >
                      Developer
                    </button>
                    <button 
                      onClick={() => {
                        setSearchTerm('Design');
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('q', 'Design');
                        setSearchParams(newParams);
                      }}
                      className="px-2 py-1 text-xs rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4 cursor-pointer"
                    >
                      Design
                    </button>
                    <button 
                      onClick={() => {
                        setSearchTerm('Python');
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('q', 'Python');
                        setSearchParams(newParams);
                      }}
                      className="px-2 py-1 text-xs rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4 cursor-pointer"
                    >
                      Python
                    </button>
                    <button 
                      onClick={() => {
                        setSearchTerm('Product');
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('q', 'Product');
                        setSearchParams(newParams);
                      }}
                      className="px-2 py-1 text-xs rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4 cursor-pointer"
                    >
                      Product
                    </button>
                    <button 
                      onClick={() => {
                        setSearchTerm('DevOps');
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('q', 'DevOps');
                        setSearchParams(newParams);
                      }}
                      className="px-2 py-1 text-xs rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4 cursor-pointer"
                    >
                      DevOps
                    </button>
                  </div>
                  <SearchResultsList employees={employees} />
                </>
              ) : (
                <div className="text-center py-12 bg-bolt-elements-background-depth-2 rounded-lg">
                  <p className="text-bolt-elements-textPrimary text-lg">No matching employees found</p>
                  <p className="text-bolt-elements-textSecondary mt-2">Try using different search keywords</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
                All Employees
              </h2>
              
              <div className="flex flex-col space-y-4 w-full">
                {employees.map(employee => (
                  <EmployeeCard key={employee.id} employee={employee} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-4 px-6 bg-bolt-elements-background-depth-2 border-t border-bolt-elements-background-depth-3">
          <div className="max-w-7xl mx-auto text-center text-sm text-bolt-elements-textTertiary">
          &copy; {new Date().getFullYear()} Ominieye HR System - Employee Hiring Platform
        </div>
      </footer>
    </div>
  );
}
