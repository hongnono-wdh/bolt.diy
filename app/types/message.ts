import type { Message } from 'ai';

/**
 * 扩展消息接口，添加角色和提示词信息
 * 扩展自ai库的Message接口，增加了roleInfo字段用于存储消息关联的角色信息
 */
export interface EnhancedMessage extends Message {
  roleInfo?: {
    roleName: string;      // 角色名称
    rolePrompt: string;    // 使用的提示词
    roleDescription?: string; // 角色描述（可选）
    avatarIndex?: number;  // 头像索引，用于显示头像图片
  };
  isAutoMessage?: boolean; // 标识消息是否由自动发送触发
  targetRole?: string;     // 目标角色（新角色），用于标识发送消息后要切换到的角色
}
