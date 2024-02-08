module.exports = {
// For rules: https://eslint.style/rules
  plugins: [
    '@stylistic'
  ],
  'env': {
    'browser': true,
    'es2023': true
  },
  'parserOptions': {
    'ecmaVersion': 'latest',
    'sourceType': 'module'
  },
  'rules': {
    '@stylistic/indent': [
      'error',
      2
    ],
    '@stylistic/linebreak-style': [
      'error',
      'unix'
    ],
    '@stylistic/quotes': [
      'error',
      'single'
    ],
    '@stylistic/semi': [
      'error',
      'always'
    ],
    '@stylistic/max-len': [
      'error',
      100
    ],
  }
};