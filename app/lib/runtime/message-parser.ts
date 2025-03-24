import type { ActionType, BoltAction, BoltActionData, FileAction, ShellAction } from '~/types/actions';
import type { BoltArtifactData } from '~/types/artifact';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';

const ARTIFACT_TAG_OPEN = '<boltArtifact';
const ARTIFACT_TAG_CLOSE = '</boltArtifact>';
const ARTIFACT_ACTION_TAG_OPEN = '<boltAction';
const ARTIFACT_ACTION_TAG_CLOSE = '</boltAction>';

const logger = createScopedLogger('MessageParser');

export interface ArtifactCallbackData extends BoltArtifactData {
  messageId: string;
}

export interface ActionCallbackData {
  artifactId: string;
  messageId: string;
  actionId: string;
  action: BoltAction;
}

export type ArtifactCallback = (data: ArtifactCallbackData) => void;
export type ActionCallback = (data: ActionCallbackData) => void;

export interface ParserCallbacks {
  onArtifactOpen?: ArtifactCallback;
  onArtifactClose?: ArtifactCallback;
  onActionOpen?: ActionCallback;
  onActionStream?: ActionCallback;
  onActionClose?: ActionCallback;
}

interface ElementFactoryProps {
  messageId: string;
}

type ElementFactory = (props: ElementFactoryProps) => string;

export interface StreamingMessageParserOptions {
  callbacks?: ParserCallbacks;
  artifactElement?: ElementFactory;
}

interface MessageState {
  position: number;
  insideArtifact: boolean;
  insideAction: boolean;
  currentArtifact?: BoltArtifactData;
  currentAction: BoltActionData;
  actionId: number;
}

function cleanoutMarkdownSyntax(content: string) {
  const codeBlockRegex = /^\s*```\w*\n([\s\S]*?)\n\s*```\s*$/;
  const match = content.match(codeBlockRegex);

  // console.log('matching', !!match, content);

  if (match) {
    return match[1]; // Remove common leading 4-space indent
  } else {
    return content;
  }
}

function cleanEscapedTags(content: string) {
  return content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
export class StreamingMessageParser {
  #messages = new Map<string, MessageState>();

  constructor(private _options: StreamingMessageParserOptions = {}) {}


  // 核心步骤1： 解析消息

  parse(messageId: string, input: string) {
    let state = this.#messages.get(messageId);

    if (!state) {
      state = {
        position: 0,
        insideAction: false,
        insideArtifact: false,
        currentAction: { content: '' },
        actionId: 0,
      };

      this.#messages.set(messageId, state);
    }

    let output = '';
    let i = state.position;
    let earlyBreak = false;

    // 主循环：逐字符处理输入文本
    while (i < input.length) {
      if (state.insideArtifact) {
        // 已经在Artifact标签内部
        const currentArtifact = state.currentArtifact;

        if (currentArtifact === undefined) {
          unreachable('Artifact not initialized');
        }

        if (state.insideAction) {
          // 已经在Action标签内部，寻找Action结束标签
          const closeIndex = input.indexOf(ARTIFACT_ACTION_TAG_CLOSE, i);

          const currentAction = state.currentAction;

          if (closeIndex !== -1) {
            // 找到了Action结束标签，处理Action的内容
            currentAction.content += input.slice(i, closeIndex);

            let content = currentAction.content.trim();

            if ('type' in currentAction && currentAction.type === 'file') {
              // 特殊处理文件类型的Action：清理markdown语法等
              if (!currentAction.filePath.endsWith('.md')) {
                content = cleanoutMarkdownSyntax(content);
                content = cleanEscapedTags(content);
              }

              content += '\n';
            }

            currentAction.content = content;

            // 关键步骤：触发onActionClose回调
            // 这里是系统自动执行操作的起点
            this._options.callbacks?.onActionClose?.({
              artifactId: currentArtifact.id,
              messageId,

              /**
               * We decrement the id because it's been incremented already
               * when `onActionOpen` was emitted to make sure the ids are
               * the same.
               */
              actionId: String(state.actionId - 1),

              action: currentAction as BoltAction,
            });

            // 重置Action状态，准备处理下一个Action
            state.insideAction = false;
            state.currentAction = { content: '' };

            // 更新处理位置到Action结束标签之后
            i = closeIndex + ARTIFACT_ACTION_TAG_CLOSE.length;
          } else {
            // 没有找到Action结束标签，可能是流式输入中的部分数据
            if ('type' in currentAction && currentAction.type === 'file') {
              // 对于文件类型的Action，进行流式处理
              let content = input.slice(i);

              if (!currentAction.filePath.endsWith('.md')) {
                content = cleanoutMarkdownSyntax(content);
                content = cleanEscapedTags(content);
              }

              // 触发Action流式处理回调
              this._options.callbacks?.onActionStream?.({
                artifactId: currentArtifact.id,
                messageId,
                actionId: String(state.actionId - 1),
                action: {
                  ...(currentAction as FileAction),
                  content,
                  filePath: currentAction.filePath,
                },
              });
            }

            // 跳出循环，等待更多输入
            break;
          }
        } else {
          // 在Artifact内但不在Action内，寻找Action开始标签或Artifact结束标签
          const actionOpenIndex = input.indexOf(ARTIFACT_ACTION_TAG_OPEN, i);
          const artifactCloseIndex = input.indexOf(ARTIFACT_TAG_CLOSE, i);

          if (actionOpenIndex !== -1 && (artifactCloseIndex === -1 || actionOpenIndex < artifactCloseIndex)) {
            // 找到了Action开始标签，且在Artifact结束标签之前
            const actionEndIndex = input.indexOf('>', actionOpenIndex);

            if (actionEndIndex !== -1) {
              // 完整的Action开始标签
              state.insideAction = true;

              // 解析Action标签属性（类型、路径等）
              state.currentAction = this.#parseActionTag(input, actionOpenIndex, actionEndIndex);

              // 触发Action开始回调
              this._options.callbacks?.onActionOpen?.({
                artifactId: currentArtifact.id,
                messageId,
                actionId: String(state.actionId++),
                action: state.currentAction as BoltAction,
              });

              // 更新处理位置到Action开始标签之后
              i = actionEndIndex + 1;
            } else {
              // Action标签不完整，等待更多输入
              break;
            }
          } else if (artifactCloseIndex !== -1) {
            // 找到了Artifact结束标签
            // 触发Artifact结束回调
            this._options.callbacks?.onArtifactClose?.({ messageId, ...currentArtifact });

            // 重置Artifact状态
            state.insideArtifact = false;
            state.currentArtifact = undefined;

            // 更新处理位置到Artifact结束标签之后
            i = artifactCloseIndex + ARTIFACT_TAG_CLOSE.length;
          } else {
            // 没有找到Action开始标签或Artifact结束标签，等待更多输入
            break;
          }
        }
      } else if (input[i] === '<' && input[i + 1] !== '/') {
        // 可能是Artifact开始标签的起点
        let j = i;
        let potentialTag = '';

        // 逐字符检查是否匹配Artifact开始标签
        while (j < input.length && potentialTag.length < ARTIFACT_TAG_OPEN.length) {
          potentialTag += input[j];

          if (potentialTag === ARTIFACT_TAG_OPEN) {
            // 匹配到完整的Artifact开始标签前缀
            const nextChar = input[j + 1];

            if (nextChar && nextChar !== '>' && nextChar !== ' ') {
              // 不是有效的标签（后面跟着其他字符），当做普通文本处理
              output += input.slice(i, j + 1);
              i = j + 1;
              break;
            }

            // 寻找标签的结束位置
            const openTagEnd = input.indexOf('>', j);

            if (openTagEnd !== -1) {
              // 完整的Artifact开始标签
              const artifactTag = input.slice(i, openTagEnd + 1);

              // 提取标签属性
              const artifactTitle = this.#extractAttribute(artifactTag, 'title') as string;
              const type = this.#extractAttribute(artifactTag, 'type') as string;
              const artifactId = this.#extractAttribute(artifactTag, 'id') as string;

              // 验证必要属性
              if (!artifactTitle) {
                logger.warn('Artifact title missing');
              }

              if (!artifactId) {
                logger.warn('Artifact id missing');
              }

              // 设置为在Artifact内部
              state.insideArtifact = true;

              // 创建当前Artifact的数据对象
              const currentArtifact = {
                id: artifactId,
                title: artifactTitle,
                type,
              } satisfies BoltArtifactData;

              state.currentArtifact = currentArtifact;

              // 触发Artifact开始回调
              this._options.callbacks?.onArtifactOpen?.({ messageId, ...currentArtifact });

              // 使用工厂函数创建Artifact的UI元素
              const artifactFactory = this._options.artifactElement ?? createArtifactElement;

              output += artifactFactory({ messageId });

              // 更新处理位置到Artifact开始标签之后
              i = openTagEnd + 1;
            } else {
              // Artifact标签不完整，等待更多输入
              earlyBreak = true;
            }

            break;
          } else if (!ARTIFACT_TAG_OPEN.startsWith(potentialTag)) {
            // 不匹配Artifact标签，当做普通文本处理
            output += input.slice(i, j + 1);
            i = j + 1;
            break;
          }

          j++;
        }

        // 如果到达输入末尾且可能是不完整的标签，等待更多输入
        if (j === input.length && ARTIFACT_TAG_OPEN.startsWith(potentialTag)) {
          break;
        }
      } else {
        // 普通文本，直接添加到输出
        output += input[i];
        i++;
      }

      if (earlyBreak) {
        break;
      }
    }

    state.position = i;

    return output;
  }

  reset() {
    this.#messages.clear();
  }

  #parseActionTag(input: string, actionOpenIndex: number, actionEndIndex: number) {
    const actionTag = input.slice(actionOpenIndex, actionEndIndex + 1);

    const actionType = this.#extractAttribute(actionTag, 'type') as ActionType;

    const actionAttributes = {
      type: actionType,
      content: '',
    };

    if (actionType === 'file') {
      const filePath = this.#extractAttribute(actionTag, 'filePath') as string;

      if (!filePath) {
        logger.debug('File path not specified');
      }

      (actionAttributes as FileAction).filePath = filePath;
    } else if (!['shell', 'start'].includes(actionType)) {
      logger.warn(`Unknown action type '${actionType}'`);
    }

    return actionAttributes as FileAction | ShellAction;
  }

  #extractAttribute(tag: string, attributeName: string): string | undefined {
    const match = tag.match(new RegExp(`${attributeName}="([^"]*)"`, 'i'));
    return match ? match[1] : undefined;
  }
}

const createArtifactElement: ElementFactory = (props) => {
  const elementProps = [
    'class="__boltArtifact__"',
    ...Object.entries(props).map(([key, value]) => {
      return `data-${camelToDashCase(key)}=${JSON.stringify(value)}`;
    }),
  ];

  return `<div ${elementProps.join(' ')}></div>`;
};

function camelToDashCase(input: string) {
  return input.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
