import { parseExpression } from '@babel/parser';

/** 打印注释数组（带缩进） */
function printComments(comments, indent) {
  if (!comments) return '';
  // 标记已处理
  comments.forEach((c) => {
    c.printed = true;
  });
  return (
    comments
      .map((c) => {
        const space = ' '.repeat(indent);
        if (c.type === 'CommentLine') {
          return `${space}//${c.value.trim()}`;
        } else if (c.type === 'CommentBlock') {
          return `${space}/*${c.value.trim()}*/`;
        }
        return '';
      })
      .join('\n') + (comments.length ? '\n' : '')
  );
}

/** 递归打印 AST 节点，并保持注释原位 */
function printNode(node, indent, root = false) {
  if (!node) return 'null';

  // 打印 leadingComments
  let result = '';
  if (node.leadingComments && root) {
    result += printComments(node.leadingComments, indent);
  }

  switch (node.type) {
    case 'ObjectExpression':
      result += '{\n';
      node.properties.forEach((prop, idx) => {
        if (prop.leadingComments) {
          result += printComments(prop.leadingComments, indent + 2);
        }
        const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
        result += ' '.repeat(indent + 2) + JSON.stringify(key) + ': ';
        result += printNode(prop.value, indent + 2);

        if (idx < node.properties.length - 1) {
          result += ',';
        }
        if (prop.trailingComments) {
          result += ' ' + printComments(prop.trailingComments, 0).trim();
        }
        result += '\n';
      });
      result += ' '.repeat(indent) + '}';
      break;

    case 'ArrayExpression':
      result += '[\n';
      node.elements.forEach((el, idx) => {
        if (el?.leadingComments) {
          result += printComments(el.leadingComments, indent + 2);
        }
        result += ' '.repeat(indent + 2) + printNode(el, indent + 2);
        if (idx < node.elements.length - 1) {
          result += ',';
        }
        if (el?.trailingComments) {
          result += ' ' + printComments(el.trailingComments, 0).trim();
        }
        result += '\n';
      });
      result += ' '.repeat(indent) + ']';
      break;

    case 'StringLiteral':
      result += JSON.stringify(node.value);
      break;

    case 'NumericLiteral':
      result += String(node.value);
      break;

    case 'BooleanLiteral':
      result += node.value ? 'true' : 'false';
      break;

    case 'NullLiteral':
      result += 'null';
      break;

    case 'Literal':
      result += JSON.stringify(node.value);
      break;

    default:
      throw new Error(`Unsupported node type: ${node.type}`);
  }

  // 打印 trailingComments
  if (node.trailingComments && root) {
    result += '\n' + printComments(node.trailingComments, indent);
  }

  return result;
}

export default {
  languages: [
    {
      name: 'JSON',
      parsers: ['custom-json'],
      extensions: ['.json'],
    },
  ],
  parsers: {
    'custom-json': {
      parse(text) {
        // 用 Babel 解析成 AST，允许注释
        return parseExpression(text, {
          allowComments: true,
          plugins: ['estree'], // 让 AST 兼容 ESTree 格式
        });
      },
      astFormat: 'custom-json-ast',
      locStart: (node) => node.start ?? 0,
      locEnd: (node) => node.end ?? 0,
    },
  },
  printers: {
    'custom-json-ast': {
      print(path) {
        const node = path.getValue();
        const result = printNode(node, 0, true) + '\n';
        return result;
      },
    },
  },
};
