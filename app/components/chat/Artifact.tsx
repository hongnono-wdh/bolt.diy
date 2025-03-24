/**
 * Artifact.tsx
 * 
 * 工件组件实现文件
 * -------------------
 * 
 * 功能概述：
 * 该组件用于显示和管理AI生成的工件（如文件、命令执行结果等）。
 * 它提供了一个交互式界面，允许用户查看AI操作的结果并与工作台进行交互。
 * 
 * 主要功能：
 * - 显示AI生成的工件信息
 * - 提供工件相关操作的状态展示（运行中、完成、失败等）
 * - 允许用户打开工作台查看详细信息
 * - 支持代码高亮显示
 * - 提供动画效果增强用户体验
 * 
 * 组件结构：
 * - Artifact: 主要组件，负责展示工件信息和状态
 * - ShellCodeBlock: 用于显示高亮的shell代码
 * - ActionList: 展示工件相关的操作列表
 */

import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useEffect, useRef, useState } from 'react';
import { createHighlighter, type BundledLanguage, type BundledTheme, type HighlighterGeneric } from 'shiki';
import type { ActionState } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { WORK_DIR } from '~/utils/constants';

/**
 * 高亮器配置选项，用于代码高亮显示
 */
const highlighterOptions = {
  langs: ['shell'],
  themes: ['light-plus', 'dark-plus'],
};

/**
 * Shell代码高亮器实例
 * 使用shiki库创建的代码高亮实例，支持热更新
 */
const shellHighlighter: HighlighterGeneric<BundledLanguage, BundledTheme> =
  import.meta.hot?.data.shellHighlighter ?? (await createHighlighter(highlighterOptions));

if (import.meta.hot) {
  import.meta.hot.data.shellHighlighter = shellHighlighter;
}

/**
 * 工件组件的属性接口
 */
interface ArtifactProps {
  messageId: string; // 消息ID，用于关联工件和消息
}

/**
 * 工件组件
 * 显示AI生成的工件信息和相关操作
 */
export const Artifact = memo(({ messageId }: ArtifactProps) => {
  const userToggledActions = useRef(false); // 用户是否手动切换了操作显示状态
  const [showActions, setShowActions] = useState(false); // 是否显示操作列表
  const [allActionFinished, setAllActionFinished] = useState(false); // 所有操作是否已完成

  // 从工作台存储中获取工件信息
  const artifacts = useStore(workbenchStore.artifacts);
  const artifact = artifacts[messageId];

  // 获取当前工件的所有操作
  const actions = useStore(
    computed(artifact.runner.actions, (actions) => {
      return Object.values(actions);
    }),
  );

  /**
   * 切换操作列表的显示状态
   */
  const toggleActions = () => {
    userToggledActions.current = true;
    setShowActions(!showActions);
  };

  /**
   * 监听操作列表变化，自动更新显示状态
   */
  useEffect(() => {
    // 如果有操作且未显示且用户未手动切换，则自动显示
    if (actions.length && !showActions && !userToggledActions.current) {
      setShowActions(true);
    }

    // 检查bundled类型工件的所有操作是否完成
    if (actions.length !== 0 && artifact.type === 'bundled') {
      const finished = !actions.find((action) => action.status !== 'complete');

      if (allActionFinished !== finished) {
        setAllActionFinished(finished);
      }
    }
  }, [actions]);

  return (
    <div className="artifact border border-bolt-elements-borderColor flex flex-col overflow-hidden rounded-lg w-full transition-border duration-150">
      <div className="flex">
        <button
          className="flex items-stretch bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover w-full overflow-hidden"
          onClick={() => {
            const showWorkbench = workbenchStore.showWorkbench.get();
            workbenchStore.showWorkbench.set(!showWorkbench);
          }}
        >
          {artifact.type == 'bundled' && (
            <>
              <div className="p-4">
                {allActionFinished ? (
                  <div className={'i-ph:files-light'} style={{ fontSize: '2rem' }}></div>
                ) : (
                  <div className={'i-svg-spinners:90-ring-with-bg'} style={{ fontSize: '2rem' }}></div>
                )}
              </div>
              <div className="bg-bolt-elements-artifacts-borderColor w-[1px]" />
            </>
          )}
          <div className="px-5 p-3.5 w-full text-left">
            <div className="w-full text-bolt-elements-textPrimary font-medium leading-5 text-sm">{artifact?.title}</div>
            <div className="w-full w-full text-bolt-elements-textSecondary text-xs mt-0.5">Click to open Workbench</div>
          </div>
        </button>
        <div className="bg-bolt-elements-artifacts-borderColor w-[1px]" />
        <AnimatePresence>
          {actions.length && artifact.type !== 'bundled' && (
            <motion.button
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              exit={{ width: 0 }}
              transition={{ duration: 0.15, ease: cubicEasingFn }}
              className="bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover"
              onClick={toggleActions}
            >
              <div className="p-4">
                <div className={showActions ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'}></div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {artifact.type !== 'bundled' && showActions && actions.length > 0 && (
          <motion.div
            className="actions"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-bolt-elements-artifacts-borderColor h-[1px]" />

            <div className="p-5 text-left bg-bolt-elements-actions-background">
              <ActionList actions={actions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Shell代码块组件属性接口
 */
interface ShellCodeBlockProps {
  classsName?: string; // 自定义CSS类名
  code: string; // 要显示的代码内容
}

/**
 * Shell代码块组件
 * 使用高亮器渲染shell代码
 */
function ShellCodeBlock({ classsName, code }: ShellCodeBlockProps) {
  return (
    <div
      className={classNames('text-xs', classsName)}
      dangerouslySetInnerHTML={{
        __html: shellHighlighter.codeToHtml(code, {
          lang: 'shell',
          theme: 'dark-plus',
        }),
      }}
    ></div>
  );
}

/**
 * 操作列表组件属性接口
 */
interface ActionListProps {
  actions: ActionState[]; // 操作状态数组
}

/**
 * 操作项动画变体配置
 */
const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * 在工作台中打开工件文件
 * @param filePath 文件路径
 */
function openArtifactInWorkbench(filePath: any) {
  // 确保当前视图为代码视图
  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  // 设置选中的文件
  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

/**
 * 操作列表组件
 * 显示工件相关的所有操作及其状态
 */
const ActionList = memo(({ actions }: ActionListProps) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <ul className="list-none space-y-2.5">
        {actions.map((action, index) => {
          const { status, type, content } = action;
          const isLast = index === actions.length - 1;

          return (
            <motion.li
              key={index}
              variants={actionVariants}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.2,
                ease: cubicEasingFn,
              }}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <div className={classNames('text-lg', getIconColor(action.status))}>
                  {status === 'running' ? (
                    <>
                      {type !== 'start' ? (
                        <div className="i-svg-spinners:90-ring-with-bg"></div>
                      ) : (
                        <div className="i-ph:terminal-window-duotone"></div>
                      )}
                    </>
                  ) : status === 'pending' ? (
                    <div className="i-ph:circle-duotone"></div>
                  ) : status === 'complete' ? (
                    <div className="i-ph:check"></div>
                  ) : status === 'failed' || status === 'aborted' ? (
                    <div className="i-ph:x"></div>
                  ) : null}
                </div>
                {type === 'file' ? (
                  <div>
                    Create{' '}
                    <code
                      className="bg-bolt-elements-artifacts-inlineCode-background text-bolt-elements-artifacts-inlineCode-text px-1.5 py-1 rounded-md text-bolt-elements-item-contentAccent hover:underline cursor-pointer"
                      onClick={() => openArtifactInWorkbench(action.filePath)}
                    >
                      {action.filePath}
                    </code>
                  </div>
                ) : type === 'shell' ? (
                  <div className="flex items-center w-full min-h-[28px]">
                    <span className="flex-1">Run command</span>
                  </div>
                ) : type === 'start' ? (
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      workbenchStore.currentView.set('preview');
                    }}
                    className="flex items-center w-full min-h-[28px]"
                  >
                    <span className="flex-1">Start Application</span>
                  </a>
                ) : null}
              </div>
              {(type === 'shell' || type === 'start') && (
                <ShellCodeBlock
                  classsName={classNames('mt-1', {
                    'mb-3.5': !isLast,
                  })}
                  code={content}
                />
              )}
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
});

/**
 * 根据操作状态获取图标颜色
 * @param status 操作状态
 * @returns 对应状态的CSS类名
 */
function getIconColor(status: ActionState['status']) {
  switch (status) {
    case 'pending': {
      return 'text-bolt-elements-textTertiary';
    }
    case 'running': {
      return 'text-bolt-elements-loader-progress';
    }
    case 'complete': {
      return 'text-bolt-elements-icon-success';
    }
    case 'aborted': {
      return 'text-bolt-elements-textSecondary';
    }
    case 'failed': {
      return 'text-bolt-elements-icon-error';
    }
    default: {
      return undefined;
    }
  }
}
