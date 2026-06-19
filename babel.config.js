module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '22',
        },
        modules: 'commonjs',
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [],
}
