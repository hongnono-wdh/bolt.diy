/**
 * Chat.client.tsx
 *
 * 聊天组件实现文件
 * -------------------
 *
 * 功能概述：
 * 该组件实现了一个完整的聊天界面，支持AI对话交互、消息历史记录管理、
 * 文件上传、消息解析、滚动管理及模型提供商切换等功能。
 *
 * 主要功能：
 * - 支持与AI模型的实时对话交互
 * - 消息历史记录的保存、导入和导出
 * - 文件上传与图像处理
 * - 支持自定义提示词与模板
 * - 多种AI模型和提供商的切换功能
 * - 消息解析和格式化显示
 * - 提供消息通知和错误处理
 *
 * 组件结构：
 * - Chat: 主要组件，负责初始化和提供消息历史功能
 * - ChatImpl: 实现具体聊天功能的内部组件
 */

/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import type { EnhancedMessage } from '~/types/message';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { roleStore } from '~/lib/stores/role';
import { getCurrentTeam, useTeamStore } from '~/lib/stores/teamStore';
import { getRolePrompt, useRolePromptsStore } from '~/lib/stores/rolePrompts';
import { workbenchStore } from '~/lib/stores/workbench';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROMPT_COOKIE_KEY, PROVIDER_LIST } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { getTemplates, selectStarterTemplate } from '~/utils/selectStarterTemplate';
import { logStore } from '~/lib/stores/logs';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat } = useChatHistory();
  const title = useStore(description);
  useEffect(() => {
    workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
  }, [initialMessages]);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

export const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat }: ChatProps) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // 使用 useRef 跟踪 chatStarted 的最新值，解决闭包陷阱问题
    const chatStartedRef = useRef<boolean>(initialMessages.length > 0);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [fakeLoading, setFakeLoading] = useState(false);
    const files = useStore(workbenchStore.files);
    const actionAlert = useStore(workbenchStore.alert);
    const { activeProviders, promptId, autoSelectTemplate, contextOptimizationEnabled } = useSettings();

    // 更新chatStarted的函数，同时更新state和ref（移到组件级别）
    const updateChatStarted = (value: boolean) => {
      chatStartedRef.current = value;
      setChatStarted(value);
      chatStore.setKey('started', value);
    };
    
    // 使用roleStore获取当前角色
    const [currentRole, setCurrentRole] = useState(() => roleStore.get());
    // 使用teamStore获取当前团队ID
    const [currentTeamId, setCurrentTeamId] = useState(() => getCurrentTeam()?.id || 'dev-team');
    // 获取当前角色的提示词信息
    const [currentRolePrompt, setCurrentRolePrompt] = useState(() => {
      const roleName = roleStore.get();
      const rolePromptData = useRolePromptsStore.getState().getRolePromptByName(roleName);
      return rolePromptData;
    });

    // 订阅roleStore的变化和自动发送消息事件
    useEffect(() => {
      // 订阅角色变化
      const unsubscribe = roleStore.subscribe((role) => {
        setCurrentRole(role);
        // 更新当前角色的提示词信息
        const rolePromptData = useRolePromptsStore.getState().getRolePromptByName(role);
        setCurrentRolePrompt(rolePromptData);
      });

      // 监听roleChange事件（包含teamId信息）
      const handleRoleChange = (event: CustomEvent<{role: string, teamId?: string}>) => {
        const { role, teamId } = event.detail;
        console.log('收到角色变更事件:', role, '团队ID:', teamId);
        
        if (teamId && teamId !== currentTeamId) {
          console.log('更新团队ID:', teamId);
          setCurrentTeamId(teamId);
        }
      };
      
      // 监听teamChange事件
      const handleTeamChange = (event: CustomEvent<{teamId: string}>) => {
        const { teamId } = event.detail;
        console.log('团队变更为:', teamId);
        
        if (teamId !== currentTeamId) {
          setCurrentTeamId(teamId);
        }
      };
      
      window.addEventListener('roleChange', handleRoleChange as EventListener);
      window.addEventListener('teamChange', handleTeamChange as EventListener);

      // 使用组件级别的updateChatStarted函数
      
      // 监听自动发送消息事件
      const handleAutoSendMessage = (event: CustomEvent) => {
        const { message } = event.detail;

        console.log('自动发送消息:', chatStartedRef.current);
        if (message) {
          // 确保chatStarted为true
          if (!chatStartedRef.current) {
            console.log('通过ref设置chatStarted为true');
            updateChatStarted(true);
          }
          
          // 直接调用sendMessage，不需要setTimeout
          console.log('自动发送消息，使用ref值:', chatStartedRef.current);
          sendMessage({} as React.UIEvent, message);
        }
      };

      window.addEventListener('autoSendMessage', handleAutoSendMessage as EventListener);

      return () => {
        unsubscribe(); // 取消角色订阅
        window.removeEventListener('autoSendMessage', handleAutoSendMessage as EventListener);
        window.removeEventListener('roleChange', handleRoleChange as EventListener);
        window.removeEventListener('teamChange', handleTeamChange as EventListener);
      };
    }, []);

    // 记录角色变化
    useEffect(() => {
      console.log('当前角色已更新为:', currentRole);
    }, [currentRole]);
    
    // 监听 chatStarted 的变化
    useEffect(() => {
      console.log('=== chatStarted 状态变更 ===');
      console.log('chatStarted 当前值:', chatStarted);
      console.log('chatStartedRef 当前值:', chatStartedRef.current);
      console.log('变更时间:', new Date().toISOString());
      
      // 确保ref和state保持同步
      chatStartedRef.current = chatStarted;
      
      // 获取调用栈信息
      try {
        throw new Error('获取调用栈');
      } catch (e: any) { // 显式指定类型为 any
        console.log('调用栈:', e.stack);
      }
      
      // 记录组件中的相关状态
      console.log('相关状态:', {
        messages: messages.length,
        isLoading,
        fakeLoading,
        autoSelectTemplate
      });
      console.log('========================');
    }, [chatStarted]);

    const [model, setModel] = useState(() => {
      const savedModel = Cookies.get('selectedModel');
      return savedModel || DEFAULT_MODEL;
    });
    const [provider, setProvider] = useState(() => {
      const savedProvider = Cookies.get('selectedProvider');
      return (PROVIDER_LIST.find((p) => p.name === savedProvider) || DEFAULT_PROVIDER) as ProviderInfo;
    });

    const { showChat } = useStore(chatStore);

    const [animationScope, animate] = useAnimate();

    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

    const {
      messages,
      isLoading,
      input,
      handleInputChange,
      setInput,
      stop,
      append,
      setMessages,
      reload,
      error,
      data: chatData,
      setData,
    } = useChat({
      api: '/api/chat',
      body: {
        apiKeys,
        files,
        promptId,
        contextOptimization: contextOptimizationEnabled,
        role: currentRole, // 添加角色参数到API请求中
        teamId: currentTeamId, // 添加团队ID参数到API请求中
      },
      sendExtraMessageFields: true,
      onError: (e) => {
        logger.error('Request failed\n\n', e, error);
        logStore.logError('Chat request failed', e, {
          component: 'Chat',
          action: 'request',
          error: e.message,
        });
        toast.error(
          'There was an error processing your request: ' + (e.message ? e.message : 'No details were returned'),
        );
      },
      onFinish: (message, response) => {
        const usage = response.usage;
        setData(undefined);

        if (usage) {
          console.log('Token usage:', usage);
          logStore.logProvider('Chat response completed', {
            component: 'Chat',
            action: 'response',
            model,
            provider: provider.name,
            usage,
            messageLength: message.content.length,
          });
        }

        console.log('数据存储调试1-查看数据存储的数据', messages);
        // 注意：角色信息已经在流式传输开始时添加，这里不需要重复添加
        // 但我们仍然需要在这里保存消息历史
        storeMessageHistory(messages).catch((error) => toast.error(error.message));

        logger.debug('Finished streaming');
      },
      initialMessages,
      initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    });

    //
    useEffect(() => {
      const prompt = searchParams.get('prompt');

      // console.log(prompt, searchParams, model, provider);

      if (prompt) {
        setSearchParams({});
        runAnimation();
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${prompt}`,
            },
          ] as any, // Type assertion to bypass compiler check
        });
      }
    }, [model, provider, searchParams]);

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);
    }, []);

    // 监听消息变化，在流式传输开始时就添加角色信息
    useEffect(() => {
      // 如果消息列表有变化
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];

        // 仅处理AI回复消息，无论是否正在流式传输
        if (lastMessage.role === 'assistant' && !(lastMessage as EnhancedMessage).roleInfo) {
          // console.log('在流式传输开始时给AI回复添加角色信息');

          // 获取当前角色信息
          const roleInfo = {
            roleName: currentRole,
            rolePrompt: currentRolePrompt?.prompt || '',
            roleDescription: currentRolePrompt?.description,
          };

          // 为AI回复消息添加角色信息
          const updatedMessages = [...messages];
          updatedMessages[messages.length - 1] = {
            ...lastMessage,
            roleInfo: roleInfo,
          } as EnhancedMessage;

          // 更新消息列表
          setMessages(updatedMessages);
        }
      }

      // 原有的消息处理逻辑
      processSampledMessages({
        messages,
        initialMessages,
        isLoading,
        parseMessages,
        storeMessageHistory,
      });
    }, [messages, isLoading, parseMessages, currentRole, currentRolePrompt, currentTeamId]);

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();

      logStore.logProvider('Chat response aborted', {
        component: 'Chat',
        action: 'abort',
        model,
        provider: provider.name,
      });
    };

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      // 动画已运行
      console.log('runAnimation1', chatStartedRef.current);
      if (chatStartedRef.current) {
        return;
      }

      console.log('runAnimation2', chatStartedRef.current);
      // animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 });
      // animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn });

      // 判断intro元素是否存在 如果存在，就隐藏
      const introElement = document.querySelector('#intro');

      if (introElement) {
        await Promise.all([
          // animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
          animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
        ]);
      }

      console.log('runAnimation3', chatStartedRef.current);
      
      // 使用统一的更新函数
      updateChatStarted(true);
    };

    const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
      const messageContent = messageInput || input;

      console.log('sendMessage', messageContent, chatStartedRef.current);
      if (!messageContent?.trim()) {
        return;
      }

      if (isLoading) {
        abort();
        return;
      }

      // 不需要在这里获取角色信息，我们将在AI回复时添加角色信息

      console.log('数据存储调试3', '查看发送消息的变量', autoSelectTemplate);
      runAnimation();


      //  这里如果判断为还未开始， 就会发生清空聊天记录的情况；
      // 现在使用ref的值来判断

      if (!chatStartedRef.current) {
        setFakeLoading(true);

        if (autoSelectTemplate) {
          const { template, title } = await selectStarterTemplate({
            message: messageContent,
            model,
            provider,
          });

          if (template !== 'blank') {
            const temResp = await getTemplates(template, title).catch((e) => {
              if (e.message.includes('rate limit')) {
                toast.warning('Rate limit exceeded. Skipping starter template\n Continuing with blank template');
              } else {
                toast.warning('Failed to import starter template\n Continuing with blank template');
              }

              return null;
            });

            if (temResp) {
              const { assistantMessage, userMessage } = temResp;
              setMessages([
                {
                  id: `1-${new Date().getTime()}`,
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${messageContent}`,
                    },
                    ...imageDataList.map((imageData) => ({
                      type: 'image',
                      image: imageData,
                    })),
                  ] as any, // Type assertion to bypass compiler check
                },
                {
                  id: `2-${new Date().getTime()}`,
                  role: 'assistant',
                  content: assistantMessage,
                },
                {
                  id: `3-${new Date().getTime()}`,
                  role: 'user',
                  content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userMessage}`,
                  annotations: ['hidden'],
                },
              ]);
              reload();
              setInput('');
              Cookies.remove(PROMPT_COOKIE_KEY);

              setUploadedFiles([]);
              setImageDataList([]);

              resetEnhancer();

              textareaRef.current?.blur();
              setFakeLoading(false);

              return;
            }
          }
        }

        // If autoSelectTemplate is disabled or template selection failed, proceed with normal message
        setMessages([
          {
            id: `${new Date().getTime()}`,
            role: 'user',
            content: [
              {
                type: 'text',
                text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${messageContent}`,
              },
              ...imageDataList.map((imageData) => ({
                type: 'image',
                image: imageData,
              })),
            ] as any,
            // 用户消息不需要添加角色信息
          } as EnhancedMessage,
        ]);
        reload();
        setFakeLoading(false);
        setInput('');
        Cookies.remove(PROMPT_COOKIE_KEY);

        setUploadedFiles([]);
        setImageDataList([]);

        resetEnhancer();

        textareaRef.current?.blur();

        return;
      }

      if (error != null) {
        setMessages(messages.slice(0, -1));
      }

      const modifiedFiles = workbenchStore.getModifiedFiles();

      chatStore.setKey('aborted', false);

      if (modifiedFiles !== undefined) {
        const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userUpdateArtifact}${messageContent}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        });

        workbenchStore.resetAllFileModifications();
      } else {
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${messageContent}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        });
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      textareaRef.current?.blur();
    };

    /**
     * Handles the change event for the textarea and updates the input state.
     * @param event - The change event from the textarea.
     */
    const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange(event);
    };

    /**
     * Debounced function to cache the prompt in cookies.
     * Caches the trimmed value of the textarea input after a delay to optimize performance.
     */
    const debouncedCachePrompt = useCallback(
      debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const trimmedValue = event.target.value.trim();
        Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
      }, 1000),
      [],
    );

    const [messageRef, scrollRef] = useSnapScroll();

    useEffect(() => {
      const storedApiKeys = Cookies.get('apiKeys');

      if (storedApiKeys) {
        setApiKeys(JSON.parse(storedApiKeys));
      }
    }, []);

    const handleModelChange = (newModel: string) => {
      setModel(newModel);
      Cookies.set('selectedModel', newModel, { expires: 30 });
    };

    const handleProviderChange = (newProvider: ProviderInfo) => {
      setProvider(newProvider);
      Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
    };

    return (
      <BaseChat
        ref={animationScope}
        textareaRef={textareaRef}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={isLoading || fakeLoading}
        onStreamingChange={(streaming) => {
          streamingState.set(streaming);
        }}
        enhancingPrompt={enhancingPrompt}
        promptEnhanced={promptEnhanced}
        sendMessage={sendMessage}
        model={model}
        setModel={handleModelChange}
        provider={provider}
        setProvider={handleProviderChange}
        providerList={activeProviders}
        messageRef={messageRef}
        scrollRef={scrollRef}
        handleInputChange={(e) => {
          onTextareaChange(e);
          debouncedCachePrompt(e);
        }}
        handleStop={abort}
        description={description}
        importChat={importChat}
        exportChat={exportChat}
        messages={messages.map((message, i) => {
          // console.log('这个是所有的消息，打印出来看看', message.content);

          if (message.role === 'user') {
            return message;
          }

          return {
            ...message,
            content: parsedMessages[i] || '',
          };
        })}
        enhancePrompt={() => {
          enhancePrompt(
            input,
            (input) => {
              setInput(input);
              scrollTextArea();
            },
            model,
            provider,
            apiKeys,
          );
        }}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        imageDataList={imageDataList}
        setImageDataList={setImageDataList}
        actionAlert={actionAlert}
        clearAlert={() => workbenchStore.clearAlert()}
        data={chatData}
      />
    );
  },
);
