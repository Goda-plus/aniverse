module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended'
  ],
  parser: 'vue-eslint-parser', //  必须显式指定解析器
  parserOptions: {
    parser: '@babel/eslint-parser',
    requireConfigFile: false,
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'never'],
    'no-unused-vars': 'off',
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'always',
      asyncArrow: 'always'
    }],
    'eol-last': ['error', 'always'],
    'indent': ['error', 2, {
      SwitchCase: 1,
      ignoredNodes: ['TemplateLiteral']
    }],
    // Vue 特有规则
    'vue/max-attributes-per-line': 'off',
    'vue/html-indent': ['error', 2],
    'vue/script-indent': ['error', 2, {
      baseIndent: 1,
      switchCase: 1,
      ignores: []
    }]
  },
  // 为 vue 文件开启 script-indent
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        indent: 'off' // 关闭原始 indent，避免与 vue/script-indent 冲突
      }
    }
  ]
}
