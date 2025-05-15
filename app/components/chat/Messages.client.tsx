import type { Message } from 'ai';
import type { EnhancedMessage } from '~/types/message';
import { Fragment } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { useLocation } from '@remix-run/react';
import { db, chatId } from '~/lib/persistence/useChatHistory';
import { forkChat } from '~/lib/persistence/db';
import { toast } from 'react-toastify';
import WithTooltip from '~/components/ui/Tooltip';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { forwardRef } from 'react';
import type { ForwardedRef } from 'react';

// 基于角色名称生成固定头像索引的函数
function generateAvatarIndex(roleName: string): number {
  let seed = 0;
  for (let i = 0; i < roleName.length; i++) {
    seed += roleName.charCodeAt(i);
  }
  return (seed * 37) % 250; // 使用质数乘法和名称字符码确保固定的头像分配
}

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: EnhancedMessage[];
}

export const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  (props: MessagesProps, ref: ForwardedRef<HTMLDivElement> | undefined) => {
    const { id, isStreaming = false, messages = [] } = props;
    const location = useLocation();
    const profile = useStore(profileStore);

    const handleRewind = (messageId: string) => {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('rewindTo', messageId);
      window.location.search = searchParams.toString();
    };

    const handleFork = async (messageId: string) => {
      try {
        if (!db || !chatId.get()) {
          toast.error('Chat persistence is not available');
          return;
        }

        const urlId = await forkChat(db, chatId.get()!, messageId);
        window.location.href = `/chat/${urlId}`;
      } catch (error) {
        toast.error('Failed to fork chat: ' + (error as Error).message);
      }
    };

    return (
      <div id={id} className={props.className} ref={ref}>
        {messages.length > 0
          ? messages.map((message, index) => {
              const { role, content, id: messageId, annotations } = message;
              const isUserMessage = role === 'user';
              const isFirst = index === 0;
              const isLast = index === messages.length - 1;
              const isHidden = annotations?.includes('hidden');

              // console.log("内部消息组件message", message);
              // // 打印角色信息
              // if ((message as EnhancedMessage).roleInfo) {
              //   console.log("消息角色信息:", (message as EnhancedMessage).roleInfo);
              // }

              if (isHidden) {
                return <Fragment key={index} />;
              }

              return (
                <div
                  key={index}
                  className={classNames('flex gap-4 p-6 w-full rounded-[20px] relative', {
                    'bg-bolt-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                    'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent':
                      isStreaming && isLast,
                    'mt-4': !isFirst,
                  })}
                >
                  {/* {isUserMessage && (
                    <div className="flex items-center justify-center w-[40px] h-[40px] overflow-hidden bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-500 rounded-full shrink-0 self-start">
                      {profile?.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile?.username || 'User'}
                          className="w-full h-full object-cover"
                          loading="eager"
                          decoding="sync"
                        />
                      ) : (
                        <div className="i-ph:user-fill text-2xl" />
                      )}
                    </div>
                  )} */}
                  <div className="grid grid-col-1 w-full">
                    {/* AI消息显示角色信息 */}
                    {(!isUserMessage || (message as EnhancedMessage).isAutoMessage === true) && message.roleInfo && (
                      <div className="flex items-center mb-3">
                        <WithTooltip tooltip={`role: ${message.roleInfo.roleDescription || ''}`}>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#2A2A2A] text-white rounded-full border border-[#3A3A3A] shadow-sm hover:bg-[#333] transition-colors">
                            {message.roleInfo.avatarIndex !== undefined ? (
                              <img
                                src={`/assets/images/avatar/${message.roleInfo.avatarIndex}.png`}
                                alt={message.roleInfo.roleName || 'AI'}
                                className="w-7 h-7 rounded-full object-cover mr-1"
                                loading="eager"
                                decoding="sync"
                              />
                            ) : message.roleInfo.roleName ? (
                              <img
                                src={`/assets/images/avatar/${(() => {
                                  // 内联实现基于角色名称的固定头像索引生成
                                  let seed = 0;
                                  for (let i = 0; i < message.roleInfo.roleName.length; i++) {
                                    seed += message.roleInfo.roleName.charCodeAt(i);
                                  }
                                  return (seed * 37) % 250;
                                })()}.png`}
                                alt={message.roleInfo.roleName}
                                className="w-7 h-7 rounded-full object-cover mr-1"
                                loading="eager"
                                decoding="sync"
                              />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-1"></div>
                            )}
                            {message.roleInfo.roleName}
                          </div>
                        </WithTooltip>
                        {/* <div className="ml-2 text-xs text-bolt-elements-textTertiary">Responding as this role</div> */}
                      </div>
                    )}
                    {/* 为自动消息添加带样式的@角色标签 */}
                    <div className="flex flex-col w-full">
                      {isUserMessage ? (
                        <div className="relative w-full">
                          <div className="overflow-hidden pt-[4px]">
                            {/* 在同一个容器中直接呈现消息内容 */}
                            <span className="message-content inline">
                              <UserMessage content={content} />
                            </span>

                            {/* 如果是自动消息，在内容前显示@角色标签 */}
                            {(message as EnhancedMessage).isAutoMessage === true &&
                              (message as EnhancedMessage).roleInfo?.roleName && (
                                <span className="inline-block mt-3 mr-2 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                  <span className="font-bold">@</span>
                                  <span className="ml-0.5">{(message as EnhancedMessage).roleInfo?.roleName}</span>
                                </span>
                              )}
                          </div>
                        </div>
                      ) : (
                        <AssistantMessage content={content} annotations={message.annotations} />
                      )}
                    </div>
                  </div>
                  {!isUserMessage && (
                    <div className="flex gap-2 flex-col lg:flex-row">
                      {messageId && (
                        <WithTooltip tooltip="Revert to this message">
                          <button
                            onClick={() => handleRewind(messageId)}
                            key="i-ph:arrow-u-up-left"
                            className={classNames(
                              'i-ph:arrow-u-up-left',
                              'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                            )}
                          />
                        </WithTooltip>
                      )}

                      <WithTooltip tooltip="Fork chat from this message">
                        <button
                          onClick={() => handleFork(messageId)}
                          key="i-ph:git-fork"
                          className={classNames(
                            'i-ph:git-fork',
                            'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                          )}
                        />
                      </WithTooltip>
                    </div>
                  )}
                </div>
              );
            })
          : null}
        {isStreaming && (
          <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
        )}
      </div>
    );
  },
);
