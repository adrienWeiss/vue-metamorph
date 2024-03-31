import MagicString from 'magic-string';
import {
  cloneDeep, get, uniqWith, isEqual,
} from 'lodash-es';
import * as recast from 'recast';
import deepDiff from 'deep-diff';
import * as AST from './ast';
import { utils, type CodemodPlugin } from './types';
import { setParents } from './builders';
import { stringify } from './stringify';
import { parseTs, parseVue } from './parse';
import { VDocumentFragment } from './ast';

const recastOptions: recast.Options = {
  tabWidth: 2,
  arrowParensAlways: true,
  quote: 'single',
  trailingComma: true,
};

const ignoreProperties: Record<string, true> = {
  parent: true,
  loc: true,
  range: true,
  variables: true,
};

/**
 * Return type of the `transform` function, containing new source code and codemod stats
 * @public
 */
export type TransformResult = {
  /**
   * The new source code
   */
  code: string;

  /**
   * Stats on how many transforms each codemod reported that it made
   */
  stats: [codemodName: string, transformCount: number][];
};

function transformVueFile(
  code: string,
  filename: string,
  codemods: CodemodPlugin[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: Record<string, any>,
): TransformResult {
  const workingCode = code;
  const stats: [string, number][] = [];

  const ms = new MagicString(workingCode);
  const { scriptASTs, sfcAST } = parseVue(workingCode);
  const templateAst = sfcAST.templateBody?.parent as VDocumentFragment;
  const originalTemplate = cloneDeep(templateAst);

  for (const codemod of codemods) {
    const count = codemod.transform({
      scriptASTs,
      sfcAST: templateAst ?? null,
      filename,
      utils,
      opts,
    });

    stats.push([codemod.name, count]);
  }

  if (templateAst && originalTemplate) {
    setParents(templateAst);

    let i = 0;
    AST.traverseNodes(templateAst as never, {
      enterNode(node) {
        if (node.type === 'VElement'
          && node.name === 'script'
          && node.parent === templateAst
          && node.children[0]?.type === 'VText') {
          const newCode = recast
            .print(scriptASTs[i]!, recastOptions)
            .code
            .replace(/\/\* METAMORPH_START \*\/\n+/g, '\n');

          node.children[0].value = `${newCode.startsWith('\n') ? '' : '\n'}${newCode}\n`;
          i++;
        }
      },
      leaveNode() {
        // empty
      },
    });

    const diff = deepDiff(
      originalTemplate,
      templateAst,
      (_, name) => !!ignoreProperties[name],
    );

    if (diff) {
      let rootNodeChanged = false;

      type ChangedNode = {
        path: (string | number)[];
        node: AST.Node;
        start: number;
        end: number;
      };

      const changedNodes: ChangedNode[] = diff.map((p) => {
        const path = [...p.path ?? []];

        // we want the path to the node, not the path to the changed property
        path.pop();

        // special case: the VStartTag doesn't actually render a full tag
        if (path.at(-1) === 'startTag') {
          path.pop();
        }

        // special case: VDirectiveKey.key's range includes the 'v-' prefix
        if (path.at(-2) === 'key') {
          path.pop();
        }

        if (path.length <= 3 && p.kind !== 'E') {
          // adding/removing children from the root node should cause a re-print of the root
          rootNodeChanged = true;
        }

        const originalNode = rootNodeChanged
          ? originalTemplate
          : get(originalTemplate, path);

        return {
          path,
          start: originalNode.range[0],
          end: originalNode.range[1],
          node: path.length === 0
            ? templateAst
            : get(templateAst, path),
        };
      });

      if (rootNodeChanged) {
        // the 'range' property is present, though the types don't include it for DX
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [start, end] = (originalTemplate as any).range;

        ms.update(start, end, stringify(templateAst));
      } else {
        /* Collapse the diff results. If two changed paths are
          ['children', 1, 'children', 2]
          ['children', 1]

          We don't need to worry about the deeper changed node since one of its ancestors
          has changed and the deeper node's changes will be printed anyways.
        */
        const collapsedChanges = uniqWith(changedNodes, (a: ChangedNode, b: ChangedNode) => {
          if (a.path.length === b.path.length) {
            return isEqual(a.path, b.path);
          }

          const lesser = a.path.length < b.path.length ? a : b;
          const greater = lesser === a ? b : a;

          return isEqual(lesser.path, greater.path.slice(0, lesser.path.length));
        });

        for (const { start, end, node } of collapsedChanges) {
          ms.update(start, end, stringify(node));
        }
      }
    }
  }

  return {
    code: ms.toString(),
    stats,
  };
}

function transformTypescriptFile(
  code: string,
  filename: string,
  codemods: CodemodPlugin[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: Record<string, any>,
): TransformResult {
  const ast = parseTs(code, /\.[jt]sx$/.test(filename));
  const stats: [string, number][] = [];

  for (const codemod of codemods) {
    const count = codemod.transform({
      scriptASTs: [ast],
      sfcAST: null,
      filename,
      utils,
      opts,
    });
    stats.push([codemod.name, count]);
  }

  return {
    code: `${recast.print(ast, recastOptions).code}\n`,
    stats,
  };
}

/**
 * Runs codemods against source code
 * @param code - Source code
 * @param filename - The file name, used to determine whether to parse as JS/TS, or as a .vue SFC
 * @param plugins - List of codemod plugins
 * @param opts - CLI Options
 * @returns New source code
 * @public
 */
export function transform(
  code: string,
  filename: string,
  plugins: CodemodPlugin[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: Record<string, any> = {},
) {
  return filename.endsWith('.vue')
    ? transformVueFile(code, filename, plugins, opts)
    : transformTypescriptFile(code, filename, plugins, opts);
}
