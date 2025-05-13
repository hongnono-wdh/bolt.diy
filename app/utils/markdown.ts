import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import type { PluggableList, Plugin } from 'unified';
import rehypeSanitize, { defaultSchema, type Options as RehypeSanitizeOptions } from 'rehype-sanitize';
import { SKIP, visit } from 'unist-util-visit';
import type { UnistNode, UnistParent } from 'node_modules/unist-util-visit/lib';

export const allowedHTMLElements = [
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'ins',
  'kbd',
  'li',
  'ol',
  'p',
  'pre',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'source',
  'span',
  'strike',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
  'var',
  'think',
];

// Add custom rehype plugin
function remarkThinkRawContent() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      // console.log("查看内容替换",node.type === 'html' && node.value && node.value.startsWith('<think>'))

      if(node.type === 'html'){
        // console.log("查看内容替换3",node.type === 'html' &&  node.value)
      }
      if (node.type === 'html' && node.value && node.value.startsWith('<think>')) {
        const cleanedContent = node.value.slice(7);

      // console.log("查看内容替换",cleanedContent)
        node.value = `<div class="__boltThought__">${cleanedContent}`;

        return;
      }


      if(node.type === 'html'){
        // console.log("查看内容替换2",node.type === 'html' &&  node.value)
      }
      if (node.type === 'html' && node.value) {
        // 检测是否是结束标签（考虑可能的换行符）
        const isEndTag = node.value.startsWith('</think>') || node.value.startsWith('\n</think>');
        
        if (isEndTag) {
          console.log("找到结束标签:", node.value);
          
          // 判断是否有换行符前缀
          const tagLength = node.value.startsWith('\n</think>') ? 9 : 8; // 8 = '</think>'.length
          
          // 分离标签后的内容，确保它不被包含在样式中
          let afterTagContent = '';
          if (node.value.length > tagLength) {
            afterTagContent = node.value.slice(tagLength);
            console.log("标签后的内容:", afterTagContent);
          }
          
          // 如果有后续内容，创建一个新节点
          if (afterTagContent.trim()) {
            // 只替换结束标签本身
            node.value = `</div>`;
            
            // 插入一个新节点处理标签后的内容
            const newNode = { type: 'html', value: afterTagContent };
            const parent = node.parent;
            const index = parent.children.indexOf(node);
            
            if (index !== -1 && parent.children) {
              parent.children.splice(index + 1, 0, newNode);
            }
          } else {
            // 没有后续内容，直接关闭 div
            node.value = `</div>`;
          }
        }
      }
    });
  };
}

const rehypeSanitizeOptions: RehypeSanitizeOptions = {
  ...defaultSchema,
  tagNames: allowedHTMLElements,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      'data*',
      ['className', '__boltArtifact__', '__boltThought__'],

      // ['className', '__boltThought__']
    ],
  },
  strip: [],
};

export function remarkPlugins(limitedMarkdown: boolean) {
  const plugins: PluggableList = [remarkGfm];

  if (limitedMarkdown) {
    plugins.unshift(limitedMarkdownPlugin);
  }

  plugins.unshift(remarkThinkRawContent);

  return plugins;
}

export function rehypePlugins(html: boolean) {
  const plugins: PluggableList = [];

  if (html) {
    plugins.push(rehypeRaw, [rehypeSanitize, rehypeSanitizeOptions]);
  }

  return plugins;
}

const limitedMarkdownPlugin: Plugin = () => {
  return (tree, file) => {
    const contents = file.toString();

    visit(tree, (node: UnistNode, index, parent: UnistParent) => {
      if (
        index == null ||
        ['paragraph', 'text', 'inlineCode', 'code', 'strong', 'emphasis'].includes(node.type) ||
        !node.position
      ) {
        return true;
      }

      let value = contents.slice(node.position.start.offset, node.position.end.offset);

      if (node.type === 'heading') {
        value = `\n${value}`;
      }

      parent.children[index] = {
        type: 'text',
        value,
      } as any;

      return [SKIP, index] as const;
    });
  };
};