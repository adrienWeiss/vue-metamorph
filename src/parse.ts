import * as vueParser from 'vue-eslint-parser';
import * as recast from 'recast';
import { namedTypes, visit } from 'ast-types';

import * as babelParser from '@babel/parser';
import { findAll } from './ast-helpers';
import { VDocumentFragment } from './ast';

const babelOptions = (): babelParser.ParserOptions => ({
  sourceType: 'module',
  strictMode: false,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  tokens: true,
  plugins: [
    'asyncGenerators',
    'bigInt',
    'classPrivateMethods',
    'classPrivateProperties',
    'classProperties',
    'classStaticBlock',
    'decimal',
    'decorators-legacy',
    'doExpressions',
    'dynamicImport',
    'estree',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'functionBind',
    'functionSent',
    'importAssertions',
    'importMeta',
    'nullishCoalescingOperator',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    [
      'pipelineOperator',
      {
        proposal: 'minimal',
      },
    ],
    [
      'recordAndTuple',
      {
        syntaxType: 'hash',
      },
    ],
    'throwExpressions',
    'topLevelAwait',
    'typescript',
    'v8intrinsic',
  ],
});
const tsParser = (() => ({
  parse: (code: string) => babelParser.parse(code, babelOptions()),
  parseForESLint: (code: string) => {
    const res = babelParser.parse(code, babelOptions());

    // needed to avoid vue-eslint-parser error
    visit(res.program, {
      visitNode(path) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const node = path.node as any;
        if (!node.range) {
          node.range = [node.start, node.end];
        }

        this.traverse(path);
      },
    });

    res.tokens?.forEach((tok) => {
      tok.range = [tok.start, tok.end];
    });

    // @ts-expect-error Needed by vue-eslint-parser
    res.program.tokens = res.tokens;

    // @ts-expect-error Needed by vue-eslint-parser
    res.program.comments = res.comments;

    return {
      ast: res.program,
    };
  },
}))();

/**
 * Parse Vue code
 * @param code Source code
 * @returns SFC AST and Script AST
 */
export function parseVue(code: string) {
  if (!code.includes('<template')) {
    // hack: if no <template> is present, templateBody will be null
    // and we cannot access the VDocumentFragment
    code += '\n<template></template>';
  }

  const vueAst = vueParser.parse(code, {
    parser: tsParser,
    sourceType: 'module',
  });

  const scripts = findAll(vueAst.templateBody!.parent as VDocumentFragment, {
    type: 'VElement',
    name: 'script',
  }) as vueParser.AST.VElement[];

  const scriptAsts = scripts.map((el) => {
    // hack: make the source locations line up properly
    const blankLines = '\n'.repeat(el.loc.start.line - 1);
    const start = el.children[0]?.range[0];
    const end = el.children[0]?.range[1];

    const ast = recast.parse(blankLines + code.slice(start, end), {
      parser: tsParser,
    }).program as namedTypes.Program;

    return ast;
  });

  return {
    vueAst,
    scriptAsts,
  };
}

/**
 * Parse JS or TS code
 * @param code Source code
 * @returns AST
 */
export function parseTs(code: string) {
  const ast = recast.parse(code, {
    parser: tsParser,
  }).program as namedTypes.Program;

  return ast;
}
